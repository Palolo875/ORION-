// src/utils/modelLoader.ts

/**
 * Gestionnaire de chargement progressif et optimisé des modèles
 * 
 * FONCTIONNALITÉS:
 * - Chargement progressif avec indicateur de progression
 * - Détection et gestion de la pression mémoire
 * - Déchargement automatique des modèles inactifs
 * - Limitation du nombre de modèles chargés simultanément
 * - Support de la quantization dynamique
 */

import { logger } from './logger';
import {
  getOptimizationStrategy,
  detectMemoryPressure,
  ModelUnloadManager,
  applyQuantization,
  calculateOptimizedSize,
  formatBytes,
} from '../config/modelOptimization';
import { MODELS, type ModelConfig } from '../config/models';

interface LoadedModel {
  id: string;
  size: number;
  loadedAt: number;
  lastUsed: number;
}

class OptimizedModelLoader {
  private loadedModels = new Map<string, LoadedModel>();
  private unloadManager: ModelUnloadManager | null = null;
  private deviceRAM = 4; // Par défaut
  private strategy;

  constructor() {
    this.init();
    this.strategy = getOptimizationStrategy(this.deviceRAM);
  }

  private async init() {
    // Détecter la RAM de l'appareil (API définie dans global.d.ts)
    this.deviceRAM = navigator.deviceMemory || 4;
    
    this.strategy = getOptimizationStrategy(this.deviceRAM);
    
    logger.info('OptimizedModelLoader', 'Stratégie d\'optimisation', {
      deviceRAM: this.deviceRAM,
      strategy: this.strategy,
    });

    // Démarrer le gestionnaire de déchargement
    if (this.strategy.unloadAfterInactivity) {
      this.unloadManager = new ModelUnloadManager(this.strategy);
    }

    // Surveiller la pression mémoire
    if (this.strategy.useMemoryPressureDetection) {
      this.startMemoryMonitoring();
    }
  }

  private startMemoryMonitoring() {
    setInterval(async () => {
      const pressure = await detectMemoryPressure();
      
      if (pressure.pressure === 'critical') {
        logger.warn('OptimizedModelLoader', 'Pression mémoire critique!', {
          usedMemory: formatBytes(pressure.usedMemory),
          availableMemory: formatBytes(pressure.availableMemory),
        });
        
        // Décharger les modèles les moins récemment utilisés
        await this.unloadLeastRecentlyUsed();
      } else if (pressure.pressure === 'high') {
        logger.warn('OptimizedModelLoader', 'Pression mémoire élevée', {
          usedMemory: formatBytes(pressure.usedMemory),
        });
      }
    }, 30000); // Vérifier toutes les 30 secondes
  }

  private async unloadLeastRecentlyUsed() {
    const models = Array.from(this.loadedModels.entries())
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
    
    if (models.length > 0) {
      const [modelId] = models[0];
      logger.info('OptimizedModelLoader', 'Déchargement du modèle le moins utilisé', { modelId });
      
      await this.unloadModel(modelId);
      
      // Émettre un événement
      window.dispatchEvent(new CustomEvent('model:unloaded', {
        detail: { modelId, reason: 'memory-pressure' }
      }));
    }
  }

  async loadModel(modelKey: string, onProgress?: (progress: number) => void): Promise<void> {
    const modelConfig = MODELS[modelKey];
    if (!modelConfig) {
      throw new Error(`Modèle ${modelKey} non trouvé`);
    }

    // Vérifier si déjà chargé
    if (this.loadedModels.has(modelConfig.id)) {
      logger.debug('OptimizedModelLoader', 'Modèle déjà chargé', { modelId: modelConfig.id });
      this.markModelUsed(modelConfig.id);
      return;
    }

    // Vérifier le nombre de modèles chargés
    if (this.loadedModels.size >= this.strategy.maxConcurrentModels) {
      logger.warn('OptimizedModelLoader', 'Nombre maximum de modèles atteint', {
        max: this.strategy.maxConcurrentModels,
      });
      await this.unloadLeastRecentlyUsed();
    }

    // Vérifier la pression mémoire avant de charger
    const pressure = await detectMemoryPressure();
    if (pressure.pressure === 'critical') {
      throw new Error('Mémoire insuffisante pour charger le modèle');
    }

    // Appliquer la quantization si activée
    let modelId = modelConfig.id;
    let estimatedSize = modelConfig.size;
    
    if (this.strategy.useQuantization) {
      modelId = applyQuantization(modelId, this.strategy.quantizationLevel);
      estimatedSize = calculateOptimizedSize(modelConfig.size, this.strategy.quantizationLevel);
      
      logger.info('OptimizedModelLoader', 'Quantization appliquée', {
        original: formatBytes(modelConfig.size),
        optimized: formatBytes(estimatedSize),
        level: this.strategy.quantizationLevel,
      });
    }

    // Simuler le chargement progressif
    logger.info('OptimizedModelLoader', 'Début du chargement', {
      modelId,
      size: formatBytes(estimatedSize),
    });

    if (this.strategy.useProgressiveLoading && onProgress) {
      // Simulation du chargement progressif
      for (let i = 0; i <= 100; i += 10) {
        onProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Enregistrer le modèle chargé
    this.loadedModels.set(modelId, {
      id: modelId,
      size: estimatedSize,
      loadedAt: Date.now(),
      lastUsed: Date.now(),
    });

    logger.info('OptimizedModelLoader', 'Modèle chargé avec succès', {
      modelId,
      totalLoaded: this.loadedModels.size,
    });

    // Émettre un événement
    window.dispatchEvent(new CustomEvent('model:loaded', {
      detail: { modelId, size: estimatedSize }
    }));
  }

  async unloadModel(modelId: string): Promise<void> {
    if (!this.loadedModels.has(modelId)) {
      logger.warn('OptimizedModelLoader', 'Modèle non chargé', { modelId });
      return;
    }

    logger.info('OptimizedModelLoader', 'Déchargement du modèle', { modelId });
    
    this.loadedModels.delete(modelId);

    // Forcer le garbage collector si disponible
    if (global.gc) {
      global.gc();
    }

    logger.info('OptimizedModelLoader', 'Modèle déchargé', {
      modelId,
      remainingModels: this.loadedModels.size,
    });
  }

  markModelUsed(modelId: string) {
    const model = this.loadedModels.get(modelId);
    if (model) {
      model.lastUsed = Date.now();
      this.unloadManager?.markModelUsed(modelId);
    }
  }

  getLoadedModels(): LoadedModel[] {
    return Array.from(this.loadedModels.values());
  }

  getTotalMemoryUsage(): number {
    return Array.from(this.loadedModels.values())
      .reduce((sum, model) => sum + model.size, 0);
  }

  getStats() {
    return {
      loadedModels: this.loadedModels.size,
      maxConcurrentModels: this.strategy.maxConcurrentModels,
      totalMemoryUsage: this.getTotalMemoryUsage(),
      strategy: this.strategy,
    };
  }

  destroy() {
    this.unloadManager?.stop();
    this.loadedModels.clear();
  }
}

// Instance singleton
let modelLoader: OptimizedModelLoader | null = null;

export function getModelLoader(): OptimizedModelLoader {
  if (!modelLoader) {
    modelLoader = new OptimizedModelLoader();
  }
  return modelLoader;
}

export function destroyModelLoader() {
  if (modelLoader) {
    modelLoader.destroy();
    modelLoader = null;
  }
}

// Fonctions utilitaires exportées
export { formatBytes } from '../config/modelOptimization';
