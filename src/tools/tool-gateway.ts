// src/tools/tool-gateway.ts

/**
 * Tool Gateway pour ORION
 * 
 * Gère le cycle de vie des Tool Workers avec :
 * - Création et destruction de workers isolés
 * - Pool de workers pour la réutilisation
 * - Circuit Breaker pour chaque outil
 * - Timeout et gestion des erreurs
 * - Communication via postMessage
 */

import { logger } from '../utils/logger';
import type {
  ToolDefinition,
  ToolResult,
  ToolExecutionMessage,
  ToolResultMessage,
  ToolGatewayState,
  CircuitState,
  ToolConfig,
} from './types';
import { TOOL_REGISTRY } from './tool-registry';

/**
 * Configuration par défaut
 */
const DEFAULT_CONFIG: ToolConfig = {
  TIMEOUT: 30000, // 30 secondes
  MAX_RETRIES: 3,
  CIRCUIT_FAILURE_THRESHOLD: 5,
  CIRCUIT_SUCCESS_THRESHOLD: 2,
  CIRCUIT_TIMEOUT: 30000, // 30 secondes
  WORKER_POOL_SIZE: 3, // Nombre de workers par outil dans le pool
};

/**
 * Tool Gateway - Gestionnaire central des Tool Workers
 */
export class ToolGateway {
  private state: ToolGatewayState;
  private config: ToolConfig;

  constructor(config?: Partial<ToolConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      activeWorkers: new Map(),
      workerPool: new Map(),
      executionQueue: [],
      circuitStates: new Map(),
    };

    // Initialiser les circuits pour tous les outils
    for (const toolId of Object.keys(TOOL_REGISTRY)) {
      this.initializeCircuit(toolId);
    }

    logger.info('ToolGateway', 'Initialized', {
      toolCount: Object.keys(TOOL_REGISTRY).length,
      config: this.config,
    });
  }

  /**
   * Exécute un outil de manière isolée
   */
  async executeTool(
    toolId: string,
    args: unknown[],
    options?: {
      timeout?: number;
      traceId?: string;
    }
  ): Promise<ToolResult> {
    const startTime = performance.now();
    const tool = TOOL_REGISTRY[toolId];

    if (!tool) {
      logger.error('ToolGateway', `Tool ${toolId} not found`);
      return {
        success: false,
        toolId,
        error: `Tool "${toolId}" not found in registry`,
        executionTime: 0,
      };
    }

    // Vérifier le Circuit Breaker
    if (!this.canExecute(toolId)) {
      const circuit = this.state.circuitStates.get(toolId)!;
      logger.warn('ToolGateway', `Circuit open for tool ${toolId}`, {
        state: circuit.state,
        consecutiveFailures: circuit.consecutiveFailures,
      });
      return {
        success: false,
        toolId,
        error: `Circuit breaker open for tool "${toolId}"`,
        executionTime: 0,
      };
    }

    // Validation des arguments
    if (args.length !== tool.argCount) {
      logger.error('ToolGateway', `Invalid argument count for ${toolId}`, {
        expected: tool.argCount,
        received: args.length,
      });
      this.recordFailure(toolId, 'Invalid argument count');
      return {
        success: false,
        toolId,
        error: `Invalid argument count: expected ${tool.argCount}, got ${args.length}`,
        executionTime: 0,
      };
    }

    if (tool.validator && !tool.validator(args)) {
      logger.error('ToolGateway', `Argument validation failed for ${toolId}`);
      this.recordFailure(toolId, 'Argument validation failed');
      return {
        success: false,
        toolId,
        error: 'Argument validation failed',
        executionTime: 0,
      };
    }

    try {
      let result: ToolResult;

      if (tool.requiresWorker) {
        // Exécution dans un Worker isolé
        result = await this.executeInWorker(toolId, args, options);
      } else {
        // Exécution directe pour les outils simples
        result = await this.executeDirect(toolId, args);
      }

      const executionTime = performance.now() - startTime;
      result.executionTime = executionTime;

      if (result.success) {
        this.recordSuccess(toolId);
      } else {
        this.recordFailure(toolId, result.error || 'Unknown error');
      }

      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      logger.error('ToolGateway', `Tool ${toolId} execution failed`, error);
      this.recordFailure(toolId, (error as Error).message);

      return {
        success: false,
        toolId,
        error: (error as Error).message,
        executionTime,
      };
    }
  }

  /**
   * Exécute un outil dans un Worker dédié
   */
  private async executeInWorker(
    toolId: string,
    args: unknown[],
    options?: {
      timeout?: number;
      traceId?: string;
    }
  ): Promise<ToolResult> {
    const timeout = options?.timeout || this.config.TIMEOUT;
    
    return new Promise((resolve, reject) => {
      // Récupérer ou créer un worker
      const worker = this.getWorker(toolId);

      // Timeout handler
      const timeoutId = setTimeout(() => {
        this.terminateWorker(toolId, worker);
        reject(new Error(`Tool execution timeout after ${timeout}ms`));
      }, timeout);

      // Message handler
      const messageHandler = (event: MessageEvent<ToolResultMessage>) => {
        if (event.data.type === 'tool_result') {
          clearTimeout(timeoutId);
          worker.removeEventListener('message', messageHandler);
          worker.removeEventListener('error', errorHandler);
          
          // Retourner le worker au pool
          this.returnWorkerToPool(toolId, worker);
          
          resolve(event.data.result);
        }
      };

      // Error handler
      const errorHandler = (error: ErrorEvent) => {
        clearTimeout(timeoutId);
        worker.removeEventListener('message', messageHandler);
        worker.removeEventListener('error', errorHandler);
        
        this.terminateWorker(toolId, worker);
        reject(new Error(`Worker error: ${error.message}`));
      };

      worker.addEventListener('message', messageHandler);
      worker.addEventListener('error', errorHandler);

      // Envoyer le message d'exécution
      const message: ToolExecutionMessage = {
        type: 'execute_tool',
        toolId,
        args,
        timeout,
        meta: {
          traceId: options?.traceId || crypto.randomUUID(),
          timestamp: Date.now(),
        },
      };

      worker.postMessage(message);
    });
  }

  /**
   * Exécution directe pour les outils simples (sans Worker)
   */
  private async executeDirect(
    toolId: string,
    args: unknown[]
  ): Promise<ToolResult> {
    // Cette méthode sera implémentée par les outils simples
    // Pour l'instant, on retourne une erreur
    return {
      success: false,
      toolId,
      error: 'Direct execution not implemented for this tool',
      executionTime: 0,
    };
  }

  /**
   * Récupère un worker du pool ou en crée un nouveau
   */
  private getWorker(toolId: string): Worker {
    const pool = this.state.workerPool.get(toolId) || [];
    
    if (pool.length > 0) {
      return pool.pop()!;
    }

    // Créer un nouveau worker
    return this.createWorker(toolId);
  }

  /**
   * Crée un nouveau worker pour un outil
   */
  private createWorker(toolId: string): Worker {
    const workerPath = `/src/tools/workers/${toolId}.worker.ts`;
    
    try {
      const worker = new Worker(new URL(workerPath, import.meta.url), {
        type: 'module',
      });

      logger.debug('ToolGateway', `Created worker for ${toolId}`);
      return worker;
    } catch (error) {
      logger.error('ToolGateway', `Failed to create worker for ${toolId}`, error);
      throw error;
    }
  }

  /**
   * Retourne un worker au pool
   */
  private returnWorkerToPool(toolId: string, worker: Worker): void {
    const pool = this.state.workerPool.get(toolId) || [];
    
    if (pool.length < this.config.WORKER_POOL_SIZE) {
      pool.push(worker);
      this.state.workerPool.set(toolId, pool);
    } else {
      // Pool plein, terminer le worker
      worker.terminate();
    }
  }

  /**
   * Termine un worker et le retire du pool
   */
  private terminateWorker(toolId: string, worker: Worker): void {
    worker.terminate();
    
    // Retirer du pool si présent
    const pool = this.state.workerPool.get(toolId) || [];
    const index = pool.indexOf(worker);
    if (index !== -1) {
      pool.splice(index, 1);
      this.state.workerPool.set(toolId, pool);
    }

    // Retirer des workers actifs
    this.state.activeWorkers.delete(toolId);
  }

  /**
   * Circuit Breaker - Initialise un circuit
   */
  private initializeCircuit(toolId: string): void {
    this.state.circuitStates.set(toolId, {
      failures: 0,
      successes: 0,
      consecutiveFailures: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      state: 'CLOSED',
    });
  }

  /**
   * Vérifie si un outil peut être exécuté
   */
  private canExecute(toolId: string): boolean {
    const circuit = this.state.circuitStates.get(toolId);
    if (!circuit) return true;

    switch (circuit.state) {
      case 'CLOSED':
        return true;
      
      case 'OPEN': {
        const timeSinceFailure = Date.now() - circuit.lastFailureTime;
        if (timeSinceFailure >= this.config.CIRCUIT_TIMEOUT) {
          this.transitionToHalfOpen(toolId);
          return true;
        }
        return false;
      }
      
      case 'HALF_OPEN':
        return true;
      
      default:
        return false;
    }
  }

  /**
   * Enregistre un succès
   */
  private recordSuccess(toolId: string): void {
    const circuit = this.state.circuitStates.get(toolId);
    if (!circuit) return;

    circuit.successes++;
    circuit.consecutiveFailures = 0;
    circuit.lastSuccessTime = Date.now();

    if (circuit.state === 'HALF_OPEN' && circuit.successes >= this.config.CIRCUIT_SUCCESS_THRESHOLD) {
      this.transitionToClosed(toolId);
    }

    logger.debug('ToolGateway', `Success recorded for ${toolId}`, {
      state: circuit.state,
      successes: circuit.successes,
    });
  }

  /**
   * Enregistre un échec
   */
  private recordFailure(toolId: string, error: string): void {
    const circuit = this.state.circuitStates.get(toolId);
    if (!circuit) return;

    circuit.failures++;
    circuit.consecutiveFailures++;
    circuit.lastFailureTime = Date.now();

    logger.warn('ToolGateway', `Failure recorded for ${toolId}`, {
      consecutiveFailures: circuit.consecutiveFailures,
      error: error.substring(0, 100),
    });

    if (circuit.consecutiveFailures >= this.config.CIRCUIT_FAILURE_THRESHOLD) {
      this.transitionToOpen(toolId);
    }
  }

  /**
   * Transitions du circuit
   */
  private transitionToClosed(toolId: string): void {
    const circuit = this.state.circuitStates.get(toolId)!;
    circuit.state = 'CLOSED';
    circuit.failures = 0;
    circuit.successes = 0;
    circuit.consecutiveFailures = 0;
    
    logger.info('ToolGateway', `Circuit closed for ${toolId}`);
  }

  private transitionToOpen(toolId: string): void {
    const circuit = this.state.circuitStates.get(toolId)!;
    circuit.state = 'OPEN';
    
    logger.error('ToolGateway', `Circuit opened for ${toolId}`, {
      consecutiveFailures: circuit.consecutiveFailures,
    });
  }

  private transitionToHalfOpen(toolId: string): void {
    const circuit = this.state.circuitStates.get(toolId)!;
    circuit.state = 'HALF_OPEN';
    circuit.successes = 0;
    
    logger.info('ToolGateway', `Circuit half-open for ${toolId}`);
  }

  /**
   * Nettoie tous les workers
   */
  cleanup(): void {
    // Terminer tous les workers actifs
    for (const worker of this.state.activeWorkers.values()) {
      worker.terminate();
    }
    this.state.activeWorkers.clear();

    // Terminer tous les workers du pool
    for (const pool of this.state.workerPool.values()) {
      for (const worker of pool) {
        worker.terminate();
      }
    }
    this.state.workerPool.clear();

    logger.info('ToolGateway', 'Cleaned up all workers');
  }

  /**
   * Obtient les statistiques du gateway
   */
  getStats(): Record<string, unknown> {
    return {
      activeWorkers: this.state.activeWorkers.size,
      pooledWorkers: Array.from(this.state.workerPool.values()).reduce(
        (sum, pool) => sum + pool.length,
        0
      ),
      queueLength: this.state.executionQueue.length,
      circuits: Object.fromEntries(this.state.circuitStates),
    };
  }
}

/**
 * Instance singleton du Tool Gateway
 */
let toolGatewayInstance: ToolGateway | null = null;

export function getToolGateway(): ToolGateway {
  if (!toolGatewayInstance) {
    toolGatewayInstance = new ToolGateway();
  }
  return toolGatewayInstance;
}

export function resetToolGateway(): void {
  if (toolGatewayInstance) {
    toolGatewayInstance.cleanup();
    toolGatewayInstance = null;
  }
}
