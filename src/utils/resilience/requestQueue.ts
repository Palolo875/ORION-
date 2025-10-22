/**
 * Gestionnaire de file d'attente pour les requêtes ORION
 * Gère la concurrence et permet l'interruption des requêtes
 */

import { logger } from '../logger';

export interface QueuedRequest<T = unknown> {
  id: string;
  execute: () => Promise<T>;
  priority: number;
  timestamp: number;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  abortController: AbortController;
  metadata?: Record<string, unknown>;
}

export interface QueueConfig {
  /**
   * Nombre maximum de requêtes simultanées
   */
  maxConcurrent: number;
  
  /**
   * Taille maximale de la file d'attente
   */
  maxQueueSize: number;
  
  /**
   * Comportement quand une nouvelle requête arrive pendant l'exécution
   */
  onNewRequest: 'queue' | 'interrupt' | 'reject';
  
  /**
   * Timeout pour une requête dans la file (ms)
   */
  queueTimeout: number;
}

export interface QueueStats {
  activeRequests: number;
  queuedRequests: number;
  completedRequests: number;
  failedRequests: number;
  interruptedRequests: number;
  averageWaitTime: number;
  averageExecutionTime: number;
}

/**
 * Gestionnaire de file d'attente intelligent
 */
export class RequestQueue {
  private queue: QueuedRequest[] = [];
  private activeRequests = new Set<string>();
  private config: QueueConfig;
  private stats = {
    completed: 0,
    failed: 0,
    interrupted: 0,
    totalWaitTime: 0,
    totalExecutionTime: 0
  };

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent ?? 1,
      maxQueueSize: config.maxQueueSize ?? 10,
      onNewRequest: config.onNewRequest ?? 'interrupt',
      queueTimeout: config.queueTimeout ?? 60000 // 1 minute
    };

    logger.info('RequestQueue', 'Initialized', { config: this.config });
  }

  /**
   * Ajoute une requête à la file
   */
  async enqueue<T>(
    fn: (signal: AbortSignal) => Promise<T>,
    options?: {
      priority?: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<T> {
    const id = this.generateId();
    const abortController = new AbortController();

    // Vérifier la taille de la file
    if (this.queue.length >= this.config.maxQueueSize) {
      logger.warn('RequestQueue', 'Queue is full', {
        size: this.queue.length,
        maxSize: this.config.maxQueueSize
      });
      throw new Error('Request queue is full. Please try again later.');
    }

    // Gérer le comportement selon la config
    if (this.activeRequests.size > 0 && this.config.onNewRequest === 'interrupt') {
      logger.info('RequestQueue', 'Interrupting active requests for new request');
      this.interruptAll();
    }

    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id,
        execute: () => fn(abortController.signal),
        priority: options?.priority ?? 0,
        timestamp: Date.now(),
        resolve,
        reject,
        abortController,
        metadata: options?.metadata
      };

      // Ajouter à la file avec tri par priorité
      this.queue.push(request);
      this.queue.sort((a, b) => b.priority - a.priority);

      logger.info('RequestQueue', 'Request enqueued', {
        id,
        priority: request.priority,
        queueSize: this.queue.length
      });

      // Traiter la file
      this.processQueue();

      // Timeout pour la requête
      setTimeout(() => {
        if (this.queue.find(r => r.id === id)) {
          this.removeFromQueue(id);
          reject(new Error('Request timeout in queue'));
        }
      }, this.config.queueTimeout);
    });
  }

  /**
   * Traite la file d'attente
   */
  private async processQueue(): Promise<void> {
    // Si on a atteint le maximum de requêtes concurrentes, attendre
    if (this.activeRequests.size >= this.config.maxConcurrent) {
      return;
    }

    // Prendre la prochaine requête
    const request = this.queue.shift();
    if (!request) {
      return;
    }

    // Marquer comme active
    this.activeRequests.add(request.id);
    const waitTime = Date.now() - request.timestamp;
    this.stats.totalWaitTime += waitTime;

    logger.info('RequestQueue', 'Executing request', {
      id: request.id,
      waitTime,
      activeCount: this.activeRequests.size
    });

    const startTime = Date.now();

    try {
      const result = await request.execute();
      const executionTime = Date.now() - startTime;
      this.stats.totalExecutionTime += executionTime;
      this.stats.completed++;

      logger.info('RequestQueue', 'Request completed', {
        id: request.id,
        executionTime
      });

      request.resolve(result);

    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (error instanceof Error && error.name === 'AbortError') {
        this.stats.interrupted++;
        logger.info('RequestQueue', 'Request interrupted', {
          id: request.id,
          executionTime
        });
      } else {
        this.stats.failed++;
        logger.error('RequestQueue', 'Request failed', error);
      }

      request.reject(error as Error);

    } finally {
      // Retirer des requêtes actives
      this.activeRequests.delete(request.id);

      // Continuer à traiter la file
      this.processQueue();
    }
  }

  /**
   * Interrompt toutes les requêtes actives
   */
  interruptAll(): void {
    for (const id of this.activeRequests) {
      const request = Array.from(this.queue).find(r => r.id === id);
      if (request) {
        request.abortController.abort();
      }
    }

    logger.info('RequestQueue', 'All active requests interrupted', {
      count: this.activeRequests.size
    });
  }

  /**
   * Interrompt une requête spécifique
   */
  interrupt(id: string): void {
    // Chercher dans les requêtes actives
    if (this.activeRequests.has(id)) {
      const request = Array.from(this.queue).find(r => r.id === id);
      if (request) {
        request.abortController.abort();
        logger.info('RequestQueue', 'Request interrupted', { id });
      }
    }

    // Chercher dans la file d'attente
    this.removeFromQueue(id);
  }

  /**
   * Retire une requête de la file
   */
  private removeFromQueue(id: string): void {
    const index = this.queue.findIndex(r => r.id === id);
    if (index !== -1) {
      const request = this.queue[index];
      this.queue.splice(index, 1);
      request.reject(new Error('Request removed from queue'));
      logger.info('RequestQueue', 'Request removed from queue', { id });
    }
  }

  /**
   * Vide la file d'attente
   */
  clear(): void {
    // Rejeter toutes les requêtes en attente
    for (const request of this.queue) {
      request.reject(new Error('Queue cleared'));
    }

    this.queue = [];
    this.interruptAll();

    logger.info('RequestQueue', 'Queue cleared');
  }

  /**
   * Obtient les statistiques
   */
  getStats(): QueueStats {
    const totalCompleted = this.stats.completed + this.stats.failed + this.stats.interrupted;
    
    return {
      activeRequests: this.activeRequests.size,
      queuedRequests: this.queue.length,
      completedRequests: this.stats.completed,
      failedRequests: this.stats.failed,
      interruptedRequests: this.stats.interrupted,
      averageWaitTime: totalCompleted > 0 
        ? this.stats.totalWaitTime / totalCompleted 
        : 0,
      averageExecutionTime: this.stats.completed > 0
        ? this.stats.totalExecutionTime / this.stats.completed
        : 0
    };
  }

  /**
   * Génère un ID unique pour une requête
   */
  private generateId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Change la configuration
   */
  updateConfig(config: Partial<QueueConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };

    logger.info('RequestQueue', 'Configuration updated', { config: this.config });
  }

  /**
   * Obtient la file d'attente actuelle
   */
  getQueue(): Array<{
    id: string;
    priority: number;
    waitTime: number;
    metadata?: Record<string, unknown>;
  }> {
    const now = Date.now();
    
    return this.queue.map(request => ({
      id: request.id,
      priority: request.priority,
      waitTime: now - request.timestamp,
      metadata: request.metadata
    }));
  }
}

// Export singleton par défaut
export const requestQueue = new RequestQueue({
  maxConcurrent: 1,
  onNewRequest: 'interrupt' // Par défaut, interrompt la requête en cours
});
