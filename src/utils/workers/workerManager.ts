/**
 * Gestionnaire de workers avec lazy loading et gestion du cycle de vie
 * 
 * Ce module optimise le chargement des workers en:
 * - Chargeant les workers uniquement quand nécessaire
 * - Gérant le cache des workers
 * - Libérant les ressources quand elles ne sont plus utilisées
 */

import { errorLogger, UserMessages } from '../errorLogger';

export type WorkerType = 'orchestrator' | 'llm' | 'memory' | 'toolUser' | 'geniusHour' | 'contextManager' | 'migration';

interface WorkerInstance {
  worker: Worker;
  lastUsed: number;
  isActive: boolean;
}

class WorkerManager {
  private workers: Map<WorkerType, WorkerInstance> = new Map();
  private workerUrls: Map<WorkerType, string> = new Map([
    ['orchestrator', './workers/orchestrator.worker.ts'],
    ['llm', './workers/llm.worker.ts'],
    ['memory', './workers/memory.worker.ts'],
    ['toolUser', './workers/toolUser.worker.ts'],
    ['geniusHour', './workers/geniusHour.worker.ts'],
    ['contextManager', './workers/contextManager.worker.ts'],
    ['migration', './workers/migration.worker.ts'],
  ]);

  // Timeout après lequel un worker inactif est terminé (en ms)
  private readonly WORKER_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  
  // Interval pour vérifier les workers inactifs
  private cleanupInterval: number | null = null;

  constructor() {
    // Démarrer le nettoyage automatique
    this.startCleanup();
  }

  /**
   * Obtient ou crée un worker de manière lazy
   * @param type Type du worker à obtenir
   * @returns Le worker demandé
   */
  async getWorker(type: WorkerType): Promise<Worker> {
    // Si le worker existe déjà, le réutiliser
    if (this.workers.has(type)) {
      const instance = this.workers.get(type)!;
      instance.lastUsed = Date.now();
      instance.isActive = true;
      return instance.worker;
    }

    // Sinon, créer un nouveau worker
    return this.createWorker(type);
  }

  /**
   * Crée un nouveau worker
   * @param type Type du worker à créer
   * @returns Le worker créé
   */
  private async createWorker(type: WorkerType): Promise<Worker> {
    const url = this.workerUrls.get(type);
    
    if (!url) {
      const error = new Error(`Worker type "${type}" not found`);
      errorLogger.error(
        'WorkerManager',
        `Failed to create worker: ${type}`,
        UserMessages.WORKER_FAILED,
        error
      );
      throw error;
    }

    try {
      // Logger structuré au lieu de console.log
      errorLogger.info('WorkerManager', `Creating worker: ${type}`, `Cr\u00e9ation du worker ${type}`);
      
      // Créer le worker avec lazy loading
      const worker = new Worker(new URL(url, import.meta.url), {
        type: 'module'
      });

      // Stocker l'instance
      this.workers.set(type, {
        worker,
        lastUsed: Date.now(),
        isActive: true
      });

      // Gérer les erreurs du worker
      worker.onerror = (error) => {
        errorLogger.error(
          'WorkerManager',
          `Worker error in ${type}: ${error.message}`,
          UserMessages.WORKER_FAILED,
          error instanceof Error ? error : new Error(error.message),
          { workerType: type }
        );
      };

      errorLogger.info('WorkerManager', `Worker created successfully: ${type}`, `Worker ${type} créé avec succès`);
      return worker;
    } catch (error) {
      const err = error as Error;
      errorLogger.critical(
        'WorkerManager',
        `Failed to create worker ${type}: ${err.message}`,
        UserMessages.WORKER_FAILED,
        err,
        { workerType: type }
      );
      throw err;
    }
  }

  /**
   * Termine un worker spécifique
   * @param type Type du worker à terminer
   */
  terminateWorker(type: WorkerType): void {
    const instance = this.workers.get(type);
    if (instance) {
      errorLogger.info('WorkerManager', `Terminating worker: ${type}`, `Arrêt du worker ${type}`);
      instance.worker.terminate();
      this.workers.delete(type);
    }
  }

  /**
   * Marque un worker comme inactif
   * @param type Type du worker
   */
  markInactive(type: WorkerType): void {
    const instance = this.workers.get(type);
    if (instance) {
      instance.isActive = false;
      instance.lastUsed = Date.now();
    }
  }

  /**
   * Démarre le nettoyage automatique des workers inactifs
   */
  private startCleanup(): void {
    if (this.cleanupInterval !== null) {
      return; // Déjà démarré
    }

    this.cleanupInterval = window.setInterval(() => {
      this.cleanupInactiveWorkers();
    }, 60 * 1000); // Vérifier toutes les minutes
  }

  /**
   * Nettoie les workers inactifs depuis trop longtemps
   */
  private cleanupInactiveWorkers(): void {
    const now = Date.now();
    const workersToTerminate: WorkerType[] = [];

    this.workers.forEach((instance, type) => {
      // Ne pas terminer l'orchestrator (toujours actif)
      if (type === 'orchestrator') {
        return;
      }

      // Vérifier si le worker est inactif depuis trop longtemps
      if (!instance.isActive && (now - instance.lastUsed) > this.WORKER_TIMEOUT) {
        workersToTerminate.push(type);
      }
    });

    // Terminer les workers inactifs
    workersToTerminate.forEach(type => {
      errorLogger.info('WorkerManager', `Cleaning up inactive worker: ${type}`, `Nettoyage du worker inactif ${type}`);
      this.terminateWorker(type);
    });

    if (workersToTerminate.length > 0) {
      errorLogger.info('WorkerManager', `Cleaned up ${workersToTerminate.length} inactive worker(s)`, `${workersToTerminate.length} worker(s) inactif(s) nettoyé(s)`);
    }
  }

  /**
   * Termine tous les workers
   */
  terminateAll(): void {
    errorLogger.info('WorkerManager', 'Terminating all workers', 'Arrêt de tous les workers');
    
    // Arrêter le cleanup
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Terminer tous les workers
    this.workers.forEach((instance, type) => {
      this.terminateWorker(type);
    });

    this.workers.clear();
  }

  /**
   * Obtient les statistiques des workers
   */
  getStats(): {
    activeWorkers: number;
    inactiveWorkers: number;
    totalWorkers: number;
    workers: Array<{
      type: WorkerType;
      isActive: boolean;
      lastUsed: number;
      idleTime: number;
    }>;
  } {
    const now = Date.now();
    let activeCount = 0;
    let inactiveCount = 0;

    const workerStats = Array.from(this.workers.entries()).map(([type, instance]) => {
      if (instance.isActive) {
        activeCount++;
      } else {
        inactiveCount++;
      }

      return {
        type,
        isActive: instance.isActive,
        lastUsed: instance.lastUsed,
        idleTime: now - instance.lastUsed
      };
    });

    return {
      activeWorkers: activeCount,
      inactiveWorkers: inactiveCount,
      totalWorkers: this.workers.size,
      workers: workerStats
    };
  }

  /**
   * Précharge certains workers critiques pour une meilleure réactivité
   * @param types Types de workers à précharger
   */
  async preloadWorkers(types: WorkerType[]): Promise<void> {
    errorLogger.info('WorkerManager', `Preloading workers: ${types.join(', ')}`, `Préchargement des workers: ${types.join(', ')}`);
    
    const promises = types.map(type => this.getWorker(type));
    
    try {
      await Promise.all(promises);
      errorLogger.info('WorkerManager', `Successfully preloaded ${types.length} worker(s)`, `${types.length} worker(s) préchargé(s) avec succès`);
    } catch (error) {
      const err = error as Error;
      errorLogger.warning(
        'WorkerManager',
        `Failed to preload some workers: ${err.message}`,
        'Certains workers n\'ont pas pu être préchargés',
        { types }
      );
    }
  }
}

// Export singleton
export const workerManager = new WorkerManager();

// Nettoyer les workers quand la page est déchargée
window.addEventListener('beforeunload', () => {
  workerManager.terminateAll();
});

// Exposer pour le debugging en développement
if (import.meta.env.DEV) {
  // @ts-expect-error - Débugging global uniquement en développement, type volontairement flexible
  window.__workerManager = workerManager;
}
