// src/workers/orchestrator/WorkerHealthMonitor.ts

/**
 * Worker Health Monitor
 * 
 * Surveille la santé des workers et implémente des stratégies de fallback
 * en cas de crash ou de non-réponse.
 */

import { logger } from '../../utils/logger';

interface WorkerHealth {
  name: string;
  lastHeartbeat: number;
  consecutiveFailures: number;
  totalRequests: number;
  totalFailures: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
}

export class WorkerHealthMonitor {
  private healthMap: Map<string, WorkerHealth> = new Map();
  private readonly HEARTBEAT_TIMEOUT = 10000; // 10 secondes
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly DEGRADED_FAILURE_THRESHOLD = 0.2; // 20% d'erreurs

  constructor() {
    // Initialiser la surveillance pour tous les workers
    this.initializeWorker('llm');
    this.initializeWorker('memory');
    this.initializeWorker('toolUser');
    this.initializeWorker('contextManager');
    this.initializeWorker('geniusHour');
    
    // Vérifier périodiquement la santé
    setInterval(() => this.checkAllWorkers(), 5000);
  }

  /**
   * Initialise un worker dans le monitoring
   */
  private initializeWorker(name: string): void {
    this.healthMap.set(name, {
      name,
      lastHeartbeat: Date.now(),
      consecutiveFailures: 0,
      totalRequests: 0,
      totalFailures: 0,
      status: 'healthy'
    });
  }

  /**
   * Enregistre une requête réussie
   */
  recordSuccess(workerName: string): void {
    const health = this.healthMap.get(workerName);
    if (!health) return;

    health.lastHeartbeat = Date.now();
    health.consecutiveFailures = 0;
    health.totalRequests++;
    health.status = this.calculateStatus(health);
    
    logger.debug('WorkerHealthMonitor', `${workerName} - Succès enregistré`, { 
      status: health.status,
      errorRate: (health.totalFailures / health.totalRequests).toFixed(2)
    });
  }

  /**
   * Enregistre une erreur
   */
  recordFailure(workerName: string, error: string): void {
    const health = this.healthMap.get(workerName);
    if (!health) return;

    health.lastHeartbeat = Date.now();
    health.consecutiveFailures++;
    health.totalRequests++;
    health.totalFailures++;
    health.status = this.calculateStatus(health);
    
    logger.warn('WorkerHealthMonitor', `${workerName} - Échec enregistré`, { 
      consecutiveFailures: health.consecutiveFailures,
      status: health.status,
      error: error.substring(0, 100)
    });

    // Alerte si le worker devient malsain
    if (health.status === 'unhealthy') {
      logger.error('WorkerHealthMonitor', `ALERTE: ${workerName} est en état critique!`, {
        consecutiveFailures: health.consecutiveFailures,
        errorRate: (health.totalFailures / health.totalRequests).toFixed(2)
      });
    }
  }

  /**
   * Calcule le status basé sur les métriques
   */
  private calculateStatus(health: WorkerHealth): 'healthy' | 'degraded' | 'unhealthy' {
    // Échec critique si trop d'échecs consécutifs
    if (health.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      return 'unhealthy';
    }

    // Dégradé si le taux d'erreur est élevé
    if (health.totalRequests > 10) {
      const errorRate = health.totalFailures / health.totalRequests;
      if (errorRate >= this.DEGRADED_FAILURE_THRESHOLD) {
        return 'degraded';
      }
    }

    return 'healthy';
  }

  /**
   * Vérifie si un worker est sain
   */
  isHealthy(workerName: string): boolean {
    const health = this.healthMap.get(workerName);
    return health ? health.status === 'healthy' : false;
  }

  /**
   * Vérifie si un worker peut être utilisé (healthy ou degraded)
   */
  canUseWorker(workerName: string): boolean {
    const health = this.healthMap.get(workerName);
    return health ? health.status !== 'unhealthy' : true;
  }

  /**
   * Obtient le status d'un worker
   */
  getStatus(workerName: string): 'healthy' | 'degraded' | 'unhealthy' | 'unknown' {
    const health = this.healthMap.get(workerName);
    return health ? health.status : 'unknown';
  }

  /**
   * Vérifie tous les workers pour détecter les timeouts
   */
  private checkAllWorkers(): void {
    const now = Date.now();
    
    for (const [name, health] of this.healthMap.entries()) {
      const timeSinceLastHeartbeat = now - health.lastHeartbeat;
      
      // Si pas de heartbeat depuis longtemps et le worker a eu des requêtes
      if (timeSinceLastHeartbeat > this.HEARTBEAT_TIMEOUT && health.totalRequests > 0) {
        logger.warn('WorkerHealthMonitor', `${name} - Pas de heartbeat depuis ${timeSinceLastHeartbeat}ms`, {
          status: health.status
        });
      }
    }
  }

  /**
   * Réinitialise les compteurs d'un worker (après redémarrage par exemple)
   */
  resetWorker(workerName: string): void {
    const health = this.healthMap.get(workerName);
    if (health) {
      health.consecutiveFailures = 0;
      health.lastHeartbeat = Date.now();
      health.status = this.calculateStatus(health);
      logger.info('WorkerHealthMonitor', `${workerName} réinitialisé`, { status: health.status });
    }
  }

  /**
   * Obtient un rapport de santé de tous les workers
   */
  getHealthReport(): Record<string, WorkerHealth> {
    const report: Record<string, WorkerHealth> = {};
    for (const [name, health] of this.healthMap.entries()) {
      report[name] = { ...health };
    }
    return report;
  }
}
