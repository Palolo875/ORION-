// src/workers/orchestrator/CircuitBreaker.ts

/**
 * Circuit Breaker
 * 
 * Implémente le pattern Circuit Breaker pour éviter les boucles infinies
 * et les cascades d'erreurs dans le système.
 */

import { logger } from '../../utils/logger';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitMetrics {
  failures: number;
  successes: number;
  consecutiveFailures: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  state: CircuitState;
}

export class CircuitBreaker {
  private metrics: Map<string, CircuitMetrics> = new Map();
  
  // Configuration
  private readonly FAILURE_THRESHOLD = 5; // Nombre d'échecs avant d'ouvrir le circuit
  private readonly SUCCESS_THRESHOLD = 2; // Nombre de succès pour fermer le circuit
  private readonly TIMEOUT = 30000; // Temps avant de passer de OPEN à HALF_OPEN (30s)
  private readonly MAX_CONSECUTIVE_FAILURES = 10; // Limite absolue

  constructor() {
    // Vérifier périodiquement si on peut passer de OPEN à HALF_OPEN
    setInterval(() => this.checkCircuits(), 5000);
  }

  /**
   * Initialise un circuit pour une opération donnée
   */
  private initializeCircuit(operation: string): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, {
        failures: 0,
        successes: 0,
        consecutiveFailures: 0,
        lastFailureTime: 0,
        lastSuccessTime: 0,
        state: 'CLOSED'
      });
    }
  }

  /**
   * Vérifie si une opération peut être exécutée
   */
  canExecute(operation: string): boolean {
    this.initializeCircuit(operation);
    const metrics = this.metrics.get(operation)!;

    switch (metrics.state) {
      case 'CLOSED':
        return true;
      
      case 'OPEN': {
        // Vérifier si on peut passer en HALF_OPEN
        const timeSinceFailure = Date.now() - metrics.lastFailureTime;
        if (timeSinceFailure >= this.TIMEOUT) {
          this.transitionToHalfOpen(operation);
          return true;
        }
        logger.warn('CircuitBreaker', `Circuit ouvert pour '${operation}'`, {
          timeSinceFailure,
          timeoutRemaining: this.TIMEOUT - timeSinceFailure
        });
        return false;
      }
      
      case 'HALF_OPEN':
        // En mode half-open, on permet une tentative
        return true;
      
      default:
        return false;
    }
  }

  /**
   * Enregistre un succès
   */
  recordSuccess(operation: string): void {
    this.initializeCircuit(operation);
    const metrics = this.metrics.get(operation)!;

    metrics.successes++;
    metrics.consecutiveFailures = 0;
    metrics.lastSuccessTime = Date.now();

    if (metrics.state === 'HALF_OPEN') {
      // Si on a assez de succès en half-open, on ferme le circuit
      if (metrics.successes >= this.SUCCESS_THRESHOLD) {
        this.transitionToClosed(operation);
      }
    }

    logger.debug('CircuitBreaker', `Succès pour '${operation}'`, {
      state: metrics.state,
      successes: metrics.successes
    });
  }

  /**
   * Enregistre un échec
   */
  recordFailure(operation: string, error: string): void {
    this.initializeCircuit(operation);
    const metrics = this.metrics.get(operation)!;

    metrics.failures++;
    metrics.consecutiveFailures++;
    metrics.lastFailureTime = Date.now();

    logger.warn('CircuitBreaker', `Échec pour '${operation}'`, {
      consecutiveFailures: metrics.consecutiveFailures,
      state: metrics.state,
      error: error.substring(0, 100)
    });

    // Vérifier si on doit ouvrir le circuit
    if (metrics.consecutiveFailures >= this.FAILURE_THRESHOLD) {
      this.transitionToOpen(operation);
    }

    // Vérifier la limite absolue
    if (metrics.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      logger.error('CircuitBreaker', `LIMITE ABSOLUE atteinte pour '${operation}'!`, {
        consecutiveFailures: metrics.consecutiveFailures
      });
    }
  }

  /**
   * Transition vers l'état CLOSED
   */
  private transitionToClosed(operation: string): void {
    const metrics = this.metrics.get(operation)!;
    metrics.state = 'CLOSED';
    metrics.failures = 0;
    metrics.successes = 0;
    metrics.consecutiveFailures = 0;
    
    logger.info('CircuitBreaker', `Circuit fermé pour '${operation}'`, {
      previousState: metrics.state
    });
  }

  /**
   * Transition vers l'état OPEN
   */
  private transitionToOpen(operation: string): void {
    const metrics = this.metrics.get(operation)!;
    const previousState = metrics.state;
    metrics.state = 'OPEN';
    
    logger.error('CircuitBreaker', `Circuit ouvert pour '${operation}'!`, {
      previousState,
      consecutiveFailures: metrics.consecutiveFailures,
      timeoutDuration: this.TIMEOUT
    });
  }

  /**
   * Transition vers l'état HALF_OPEN
   */
  private transitionToHalfOpen(operation: string): void {
    const metrics = this.metrics.get(operation)!;
    metrics.state = 'HALF_OPEN';
    metrics.successes = 0;
    
    logger.info('CircuitBreaker', `Circuit semi-ouvert pour '${operation}'`, {
      timeSinceFailure: Date.now() - metrics.lastFailureTime
    });
  }

  /**
   * Vérifie tous les circuits pour les transitions de OPEN à HALF_OPEN
   */
  private checkCircuits(): void {
    const now = Date.now();
    
    for (const [operation, metrics] of this.metrics.entries()) {
      if (metrics.state === 'OPEN') {
        const timeSinceFailure = now - metrics.lastFailureTime;
        if (timeSinceFailure >= this.TIMEOUT) {
          this.transitionToHalfOpen(operation);
        }
      }
    }
  }

  /**
   * Obtient l'état d'un circuit
   */
  getState(operation: string): CircuitState {
    this.initializeCircuit(operation);
    return this.metrics.get(operation)!.state;
  }

  /**
   * Réinitialise un circuit
   */
  reset(operation: string): void {
    this.initializeCircuit(operation);
    const metrics = this.metrics.get(operation)!;
    
    metrics.failures = 0;
    metrics.successes = 0;
    metrics.consecutiveFailures = 0;
    metrics.state = 'CLOSED';
    
    logger.info('CircuitBreaker', `Circuit réinitialisé pour '${operation}'`);
  }

  /**
   * Obtient les métriques d'un circuit
   */
  getMetrics(operation: string): CircuitMetrics | null {
    this.initializeCircuit(operation);
    const metrics = this.metrics.get(operation);
    return metrics ? { ...metrics } : null;
  }

  /**
   * Obtient un rapport de tous les circuits
   */
  getReport(): Record<string, CircuitMetrics> {
    const report: Record<string, CircuitMetrics> = {};
    for (const [operation, metrics] of this.metrics.entries()) {
      report[operation] = { ...metrics };
    }
    return report;
  }
}
