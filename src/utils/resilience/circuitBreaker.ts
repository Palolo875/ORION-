/**
 * Circuit Breaker Pattern pour ORION
 * Gère la robustesse et la résilience face aux pannes d'inférence
 */

import { logger } from '../logger';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /**
   * Nombre d'échecs consécutifs avant d'ouvrir le circuit
   */
  failureThreshold: number;
  
  /**
   * Durée en ms avant de tenter de refermer le circuit
   */
  resetTimeout: number;
  
  /**
   * Nombre de tentatives réussies nécessaires en HALF_OPEN pour refermer
   */
  successThreshold: number;
  
  /**
   * Timeout pour une requête (en ms)
   */
  requestTimeout: number;
  
  /**
   * Nom du circuit (pour logging)
   */
  name: string;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  uptimePercentage: number;
}

/**
 * Implémentation du pattern Circuit Breaker
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private resetTimer?: number;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      resetTimeout: config.resetTimeout ?? 60000, // 1 minute
      successThreshold: config.successThreshold ?? 2,
      requestTimeout: config.requestTimeout ?? 30000, // 30 secondes
      name: config.name ?? 'UnnamedCircuit'
    };

    logger.info('CircuitBreaker', `Initialized: ${this.config.name}`, {
      config: this.config
    });
  }

  /**
   * Exécute une fonction avec protection du circuit breaker
   */
  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    this.totalRequests++;

    // Si le circuit est OPEN, rejeter immédiatement ou utiliser le fallback
    if (this.state === 'OPEN') {
      logger.warn('CircuitBreaker', `Circuit ${this.config.name} is OPEN`, {
        failureCount: this.failureCount,
        timeSinceLastFailure: this.lastFailureTime 
          ? Date.now() - this.lastFailureTime 
          : undefined
      });

      if (fallback) {
        logger.info('CircuitBreaker', `Using fallback for ${this.config.name}`);
        return await fallback();
      }

      throw new Error(
        `Circuit breaker is OPEN for ${this.config.name}. ` +
        `Service temporarily unavailable. Retry in ${this.config.resetTimeout}ms.`
      );
    }

    try {
      // Ajouter un timeout à la requête
      const result = await this.executeWithTimeout(fn, this.config.requestTimeout);
      
      // Succès
      this.onSuccess();
      return result;

    } catch (error) {
      // Échec
      this.onFailure();

      // Utiliser le fallback si disponible
      if (fallback && this.state === 'OPEN') {
        logger.info('CircuitBreaker', `Fallback activated for ${this.config.name}`);
        return await fallback();
      }

      throw error;
    }
  }

  /**
   * Exécute une fonction avec timeout
   */
  private executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${timeout}ms`));
        }, timeout);
      })
    ]);
  }

  /**
   * Gère un succès
   */
  private onSuccess(): void {
    this.successCount++;
    this.totalSuccesses++;
    this.lastSuccessTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      if (this.successCount >= this.config.successThreshold) {
        this.close();
      }
    } else if (this.state === 'CLOSED') {
      // Reset le compteur d'échecs si on est en CLOSED
      this.failureCount = 0;
    }
  }

  /**
   * Gère un échec
   */
  private onFailure(): void {
    this.failureCount++;
    this.totalFailures++;
    this.lastFailureTime = Date.now();
    this.successCount = 0; // Reset les succès

    logger.warn('CircuitBreaker', `Failure in ${this.config.name}`, {
      failureCount: this.failureCount,
      threshold: this.config.failureThreshold,
      state: this.state
    });

    if (this.failureCount >= this.config.failureThreshold) {
      this.open();
    }
  }

  /**
   * Ouvre le circuit (bloque les requêtes)
   */
  private open(): void {
    if (this.state === 'OPEN') return;

    this.state = 'OPEN';
    logger.error('CircuitBreaker', `Circuit ${this.config.name} opened`, {
      failureCount: this.failureCount,
      totalFailures: this.totalFailures
    });

    // Programmer la tentative de demi-ouverture
    this.scheduleHalfOpen();
  }

  /**
   * Met le circuit en demi-ouverture (teste si le service est revenu)
   */
  private halfOpen(): void {
    this.state = 'HALF_OPEN';
    this.successCount = 0;
    this.failureCount = 0;

    logger.info('CircuitBreaker', `Circuit ${this.config.name} half-opened (testing)`, {
      successThreshold: this.config.successThreshold
    });
  }

  /**
   * Ferme le circuit (tout fonctionne normalement)
   */
  private close(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;

    logger.info('CircuitBreaker', `Circuit ${this.config.name} closed (recovered)`, {
      totalSuccesses: this.totalSuccesses,
      totalRequests: this.totalRequests
    });

    // Annuler le timer si présent
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }
  }

  /**
   * Programme la tentative de demi-ouverture
   */
  private scheduleHalfOpen(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = window.setTimeout(() => {
      this.halfOpen();
    }, this.config.resetTimeout);
  }

  /**
   * Obtient l'état actuel du circuit
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Obtient les statistiques du circuit
   */
  getStats(): CircuitBreakerStats {
    const uptimePercentage = this.totalRequests > 0
      ? (this.totalSuccesses / this.totalRequests) * 100
      : 100;

    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      uptimePercentage
    };
  }

  /**
   * Force l'ouverture du circuit (pour tests)
   */
  forceOpen(): void {
    this.open();
  }

  /**
   * Force la fermeture du circuit (pour tests)
   */
  forceClose(): void {
    this.close();
  }

  /**
   * Reset les statistiques
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.totalRequests = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }

    logger.info('CircuitBreaker', `Circuit ${this.config.name} reset`);
  }
}

/**
 * Manager de circuit breakers pour gérer plusieurs circuits
 */
export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Obtient ou crée un circuit breaker
   */
  getBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker({
        ...config,
        name
      });
      this.breakers.set(name, breaker);
    }

    return this.breakers.get(name)!;
  }

  /**
   * Supprime un circuit breaker
   */
  removeBreaker(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.reset();
      this.breakers.delete(name);
    }
  }

  /**
   * Obtient les statistiques de tous les circuits
   */
  getAllStats(): Map<string, CircuitBreakerStats> {
    const stats = new Map<string, CircuitBreakerStats>();
    
    for (const [name, breaker] of this.breakers.entries()) {
      stats.set(name, breaker.getStats());
    }

    return stats;
  }

  /**
   * Reset tous les circuits
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    logger.info('CircuitBreakerManager', 'All circuits reset');
  }

  /**
   * Obtient un résumé de l'état de tous les circuits
   */
  getHealthSummary(): {
    healthy: number;
    degraded: number;
    down: number;
    total: number;
  } {
    let healthy = 0;
    let degraded = 0;
    let down = 0;

    for (const breaker of this.breakers.values()) {
      const state = breaker.getState();
      switch (state) {
        case 'CLOSED':
          healthy++;
          break;
        case 'HALF_OPEN':
          degraded++;
          break;
        case 'OPEN':
          down++;
          break;
      }
    }

    return {
      healthy,
      degraded,
      down,
      total: this.breakers.size
    };
  }
}

// Export singleton
export const circuitBreakerManager = new CircuitBreakerManager();
