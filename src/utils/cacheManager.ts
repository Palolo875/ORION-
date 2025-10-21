/**
 * Gestionnaire de cache intelligent pour les modèles LLM
 * Gère le nettoyage automatique et la priorisation des modèles
 */

import { logger } from './logger';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface CacheEntry {
  modelId: string;
  modelName: string;
  size: number;
  lastUsed: number;
  downloads: number;
  createdAt: number;
}

interface CacheDB extends DBSchema {
  models: {
    key: string;
    value: CacheEntry;
    indexes: {
      'by-last-used': number;
      'by-downloads': number;
    };
  };
}

export interface CacheStats {
  totalModels: number;
  totalSize: number;
  oldestModel: CacheEntry | null;
  leastUsedModel: CacheEntry | null;
  availableSpace: number;
  usagePercent: number;
}

export interface CleanupResult {
  modelsRemoved: string[];
  spaceFreed: number;
  success: boolean;
}

class CacheManager {
  private db: IDBPDatabase<CacheDB> | null = null;
  private readonly DB_NAME = 'orion-cache-manager';
  private readonly DB_VERSION = 1;

  /**
   * Initialise le gestionnaire de cache
   */
  async initialize(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await openDB<CacheDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('models')) {
            const store = db.createObjectStore('models', { keyPath: 'modelId' });
            store.createIndex('by-last-used', 'lastUsed');
            store.createIndex('by-downloads', 'downloads');
          }
        },
      });
      logger.info('CacheManager', 'Initialisé avec succès');
    } catch (error) {
      logger.error('CacheManager', 'Erreur d\'initialisation', error);
      throw error;
    }
  }

  /**
   * Enregistre l'utilisation d'un modèle
   */
  async recordModelUsage(modelId: string, modelName: string, size: number): Promise<void> {
    await this.initialize();
    if (!this.db) return;

    try {
      const existing = await this.db.get('models', modelId);
      
      if (existing) {
        // Mise à jour d'un modèle existant
        await this.db.put('models', {
          ...existing,
          lastUsed: Date.now(),
          downloads: existing.downloads + 1,
        });
      } else {
        // Nouveau modèle
        await this.db.put('models', {
          modelId,
          modelName,
          size,
          lastUsed: Date.now(),
          downloads: 1,
          createdAt: Date.now(),
        });
      }
      
      logger.debug('CacheManager', 'Utilisation enregistrée', { modelId });
    } catch (error) {
      logger.error('CacheManager', 'Erreur lors de l\'enregistrement', error);
    }
  }

  /**
   * Obtient les statistiques du cache
   */
  async getStats(): Promise<CacheStats> {
    await this.initialize();
    if (!this.db) {
      return {
        totalModels: 0,
        totalSize: 0,
        oldestModel: null,
        leastUsedModel: null,
        availableSpace: 0,
        usagePercent: 0,
      };
    }

    try {
      const allModels = await this.db.getAll('models');
      const totalSize = allModels.reduce((sum, model) => sum + model.size, 0);

      // Trouver le modèle le plus ancien
      const oldestModel = allModels.reduce((oldest, current) => 
        !oldest || current.createdAt < oldest.createdAt ? current : oldest
      , null as CacheEntry | null);

      // Trouver le modèle le moins utilisé
      const leastUsedModel = allModels.reduce((least, current) =>
        !least || current.downloads < least.downloads ? current : least
      , null as CacheEntry | null);

      // Obtenir l'espace disponible
      let availableSpace = 0;
      let usagePercent = 0;

      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const total = estimate.quota || 0;
        const used = estimate.usage || 0;
        availableSpace = total - used;
        usagePercent = (used / total) * 100;
      }

      return {
        totalModels: allModels.length,
        totalSize,
        oldestModel,
        leastUsedModel,
        availableSpace,
        usagePercent,
      };
    } catch (error) {
      logger.error('CacheManager', 'Erreur lors du calcul des stats', error);
      throw error;
    }
  }

  /**
   * Nettoie les modèles les moins utilisés pour libérer de l'espace
   */
  async cleanupLeastUsed(targetSpace: number): Promise<CleanupResult> {
    await this.initialize();
    if (!this.db) {
      return { modelsRemoved: [], spaceFreed: 0, success: false };
    }

    try {
      const allModels = await this.db.getAll('models');
      
      // Trier par nombre de téléchargements (ascendant) puis par dernière utilisation (ascendant)
      const sortedModels = allModels.sort((a, b) => {
        if (a.downloads !== b.downloads) {
          return a.downloads - b.downloads;
        }
        return a.lastUsed - b.lastUsed;
      });

      const modelsRemoved: string[] = [];
      let spaceFreed = 0;

      // Supprimer les modèles jusqu'à atteindre l'espace cible
      for (const model of sortedModels) {
        if (spaceFreed >= targetSpace) break;

        try {
          // Supprimer de IndexedDB du cache Web LLM
          await this.deleteModelFromWebLLMCache(model.modelId);
          
          // Supprimer de notre base
          await this.db.delete('models', model.modelId);
          
          modelsRemoved.push(model.modelName);
          spaceFreed += model.size;
          
          logger.info('CacheManager', 'Modèle supprimé', {
            model: model.modelName,
            size: model.size,
            downloads: model.downloads,
          });
        } catch (error) {
          logger.warn('CacheManager', 'Erreur lors de la suppression du modèle', {
            model: model.modelName,
            error,
          });
        }
      }

      return {
        modelsRemoved,
        spaceFreed,
        success: true,
      };
    } catch (error) {
      logger.error('CacheManager', 'Erreur lors du nettoyage', error);
      return { modelsRemoved: [], spaceFreed: 0, success: false };
    }
  }

  /**
   * Nettoie les modèles anciens (non utilisés depuis X jours)
   */
  async cleanupOldModels(daysOld: number = 30): Promise<CleanupResult> {
    await this.initialize();
    if (!this.db) {
      return { modelsRemoved: [], spaceFreed: 0, success: false };
    }

    const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

    try {
      const allModels = await this.db.getAll('models');
      const oldModels = allModels.filter(model => model.lastUsed < cutoffDate);

      const modelsRemoved: string[] = [];
      let spaceFreed = 0;

      for (const model of oldModels) {
        try {
          await this.deleteModelFromWebLLMCache(model.modelId);
          await this.db.delete('models', model.modelId);
          
          modelsRemoved.push(model.modelName);
          spaceFreed += model.size;
          
          logger.info('CacheManager', 'Modèle ancien supprimé', {
            model: model.modelName,
            lastUsed: new Date(model.lastUsed).toLocaleDateString(),
          });
        } catch (error) {
          logger.warn('CacheManager', 'Erreur lors de la suppression', { model: model.modelName, error });
        }
      }

      return {
        modelsRemoved,
        spaceFreed,
        success: true,
      };
    } catch (error) {
      logger.error('CacheManager', 'Erreur lors du nettoyage des anciens modèles', error);
      return { modelsRemoved: [], spaceFreed: 0, success: false };
    }
  }

  /**
   * Supprime un modèle spécifique du cache
   */
  async deleteModel(modelId: string): Promise<boolean> {
    await this.initialize();
    if (!this.db) return false;

    try {
      await this.deleteModelFromWebLLMCache(modelId);
      await this.db.delete('models', modelId);
      logger.info('CacheManager', 'Modèle supprimé', { modelId });
      return true;
    } catch (error) {
      logger.error('CacheManager', 'Erreur lors de la suppression', { modelId, error });
      return false;
    }
  }

  /**
   * Supprime un modèle du cache Web LLM (IndexedDB)
   */
  private async deleteModelFromWebLLMCache(modelId: string): Promise<void> {
    try {
      // Web LLM utilise IndexedDB pour stocker les modèles
      // On supprime de la base "webllm-model-cache"
      const databases = await indexedDB.databases();
      const webllmDB = databases.find(db => db.name?.includes('webllm') || db.name?.includes('model'));
      
      if (webllmDB && webllmDB.name) {
        const db = await openDB(webllmDB.name);
        
        // Essayer de trouver et supprimer le modèle
        const storeNames = db.objectStoreNames;
        for (let i = 0; i < storeNames.length; i++) {
          const storeName = storeNames[i];
          try {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const keys = await store.getAllKeys();
            
            // Chercher les clés contenant le modelId
            for (const key of keys) {
              if (String(key).includes(modelId)) {
                await store.delete(key);
                logger.debug('CacheManager', 'Clé supprimée du cache Web LLM', { key });
              }
            }
            
            await tx.done;
          } catch (error) {
            // Ignorer les erreurs pour les stores en lecture seule
            logger.debug('CacheManager', 'Impossible d\'accéder au store', { storeName });
          }
        }
        
        db.close();
      }
    } catch (error) {
      logger.warn('CacheManager', 'Impossible de supprimer du cache Web LLM', { modelId, error });
    }
  }

  /**
   * Nettoie automatiquement si nécessaire avant de charger un nouveau modèle
   */
  async autoCleanupBeforeLoad(modelSize: number): Promise<{
    cleaned: boolean;
    spaceFreed: number;
    modelsRemoved: string[];
  }> {
    const stats = await this.getStats();
    const requiredSpace = modelSize * 1.5; // Marge de sécurité

    if (stats.availableSpace < requiredSpace) {
      logger.info('CacheManager', 'Nettoyage automatique requis', {
        available: stats.availableSpace,
        required: requiredSpace,
        deficit: requiredSpace - stats.availableSpace,
      });

      const cleanup = await this.cleanupLeastUsed(requiredSpace - stats.availableSpace);
      
      return {
        cleaned: cleanup.success,
        spaceFreed: cleanup.spaceFreed,
        modelsRemoved: cleanup.modelsRemoved,
      };
    }

    return {
      cleaned: false,
      spaceFreed: 0,
      modelsRemoved: [],
    };
  }

  /**
   * Liste tous les modèles en cache
   */
  async listCachedModels(): Promise<CacheEntry[]> {
    await this.initialize();
    if (!this.db) return [];

    try {
      return await this.db.getAll('models');
    } catch (error) {
      logger.error('CacheManager', 'Erreur lors de la liste des modèles', error);
      return [];
    }
  }
}

// Export singleton
export const cacheManager = new CacheManager();
