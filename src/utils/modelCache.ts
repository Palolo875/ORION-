/**
 * Système de Cache à 3 Niveaux pour les Modèles LLM - ORION
 * 
 * Architecture:
 * 1. Cache Mémoire (RAM) - Ultra rapide, volatile
 * 2. Cache IndexedDB - Rapide, persistant, ~100MB
 * 3. Cache Service Worker - Persistant, illimité (avec quotas navigateur)
 * 
 * Workflow:
 * - Lecture: Mémoire → IndexedDB → Service Worker → Réseau
 * - Écriture: Sauvegarde dans tous les niveaux simultanément
 */

import { get, set, del, clear } from 'idb-keyval';
import { logger } from './logger';

/**
 * Interface pour un élément en cache
 */
interface CachedModel {
  modelId: string;
  data: ArrayBuffer;
  timestamp: number;
  size: number;
}

/**
 * Gestionnaire de cache à 3 niveaux
 */
export class ModelCache {
  private memoryCache: Map<string, ArrayBuffer> = new Map();
  private readonly MAX_MEMORY_SIZE = 500 * 1024 * 1024; // 500 MB max en mémoire
  private currentMemorySize = 0;

  /**
   * Récupère un modèle depuis le cache (3 niveaux)
   * @param modelId - ID du modèle
   * @returns ArrayBuffer du modèle ou null si non trouvé
   */
  async get(modelId: string): Promise<ArrayBuffer | null> {
    const startTime = performance.now();

    // 1. Vérifier le cache mémoire (ultra rapide)
    if (this.memoryCache.has(modelId)) {
      const loadTime = performance.now() - startTime;
      logger.info('ModelCache', `Cache mémoire HIT: ${modelId}`, {
        loadTimeMs: loadTime.toFixed(2),
        level: 'memory',
      });
      return this.memoryCache.get(modelId)!;
    }

    // 2. Vérifier IndexedDB (rapide)
    try {
      const cached = await get<CachedModel>(`model:${modelId}`);
      if (cached?.data) {
        const loadTime = performance.now() - startTime;
        logger.info('ModelCache', `Cache IndexedDB HIT: ${modelId}`, {
          loadTimeMs: loadTime.toFixed(2),
          level: 'indexeddb',
          sizeMB: (cached.size / 1024 / 1024).toFixed(2),
        });

        // Charger en mémoire pour accès futur
        this.setMemoryCache(modelId, cached.data);

        return cached.data;
      }
    } catch (error) {
      logger.warn('ModelCache', 'Erreur lecture IndexedDB', { error, modelId });
    }

    // 3. Vérifier le Service Worker cache (persistant)
    try {
      if ('caches' in window) {
        const cache = await caches.open('orion-models-v1');
        const cachedResponse = await cache.match(`/models/${modelId}`);

        if (cachedResponse) {
          const buffer = await cachedResponse.arrayBuffer();
          const loadTime = performance.now() - startTime;

          logger.info('ModelCache', `Cache Service Worker HIT: ${modelId}`, {
            loadTimeMs: loadTime.toFixed(2),
            level: 'service-worker',
            sizeMB: (buffer.byteLength / 1024 / 1024).toFixed(2),
          });

          // Sauvegarder dans les niveaux supérieurs
          await this.set(modelId, buffer);

          return buffer;
        }
      }
    } catch (error) {
      logger.warn('ModelCache', 'Erreur lecture Service Worker', { error, modelId });
    }

    // 4. Aucun cache trouvé
    const loadTime = performance.now() - startTime;
    logger.debug('ModelCache', `Cache MISS: ${modelId}`, {
      loadTimeMs: loadTime.toFixed(2),
    });

    return null;
  }

  /**
   * Sauvegarde un modèle dans tous les niveaux de cache
   * @param modelId - ID du modèle
   * @param data - Données du modèle (ArrayBuffer)
   */
  async set(modelId: string, data: ArrayBuffer): Promise<void> {
    const startTime = performance.now();
    const sizeMB = (data.byteLength / 1024 / 1024).toFixed(2);

    logger.info('ModelCache', `Sauvegarde du modèle: ${modelId}`, {
      sizeMB,
    });

    // 1. Sauvegarder en mémoire
    this.setMemoryCache(modelId, data);

    // 2. Sauvegarder dans IndexedDB (asynchrone, non bloquant)
    this.setIndexedDBCache(modelId, data).catch((error) => {
      logger.error('ModelCache', 'Erreur sauvegarde IndexedDB', error);
    });

    // 3. Sauvegarder dans Service Worker (asynchrone, non bloquant)
    this.setServiceWorkerCache(modelId, data).catch((error) => {
      logger.error('ModelCache', 'Erreur sauvegarde Service Worker', error);
    });

    const saveTime = performance.now() - startTime;
    logger.info('ModelCache', `Modèle sauvegardé: ${modelId}`, {
      saveTimeMs: saveTime.toFixed(2),
      sizeMB,
    });
  }

  /**
   * Supprime un modèle de tous les caches
   * @param modelId - ID du modèle
   */
  async delete(modelId: string): Promise<void> {
    logger.info('ModelCache', `Suppression du modèle: ${modelId}`);

    // 1. Supprimer de la mémoire
    if (this.memoryCache.has(modelId)) {
      const data = this.memoryCache.get(modelId)!;
      this.currentMemorySize -= data.byteLength;
      this.memoryCache.delete(modelId);
    }

    // 2. Supprimer d'IndexedDB
    try {
      await del(`model:${modelId}`);
    } catch (error) {
      logger.warn('ModelCache', 'Erreur suppression IndexedDB', { error, modelId });
    }

    // 3. Supprimer du Service Worker
    try {
      if ('caches' in window) {
        const cache = await caches.open('orion-models-v1');
        await cache.delete(`/models/${modelId}`);
      }
    } catch (error) {
      logger.warn('ModelCache', 'Erreur suppression Service Worker', { error, modelId });
    }

    logger.info('ModelCache', `Modèle supprimé: ${modelId}`);
  }

  /**
   * Vide tous les caches
   */
  async clear(): Promise<void> {
    logger.info('ModelCache', 'Nettoyage complet des caches');

    // 1. Vider la mémoire
    this.memoryCache.clear();
    this.currentMemorySize = 0;

    // 2. Vider IndexedDB
    try {
      await clear();
    } catch (error) {
      logger.warn('ModelCache', 'Erreur nettoyage IndexedDB', error);
    }

    // 3. Vider Service Worker
    try {
      if ('caches' in window) {
        await caches.delete('orion-models-v1');
      }
    } catch (error) {
      logger.warn('ModelCache', 'Erreur nettoyage Service Worker', error);
    }

    logger.info('ModelCache', 'Tous les caches nettoyés');
  }

  /**
   * Obtient les statistiques du cache
   */
  getStats(): {
    memoryCount: number;
    memorySizeMB: number;
    maxMemorySizeMB: number;
  } {
    return {
      memoryCount: this.memoryCache.size,
      memorySizeMB: this.currentMemorySize / 1024 / 1024,
      maxMemorySizeMB: this.MAX_MEMORY_SIZE / 1024 / 1024,
    };
  }

  // === Méthodes privées ===

  /**
   * Sauvegarde dans le cache mémoire avec gestion de la taille
   */
  private setMemoryCache(modelId: string, data: ArrayBuffer): void {
    // Vérifier si on doit libérer de la mémoire
    const newSize = this.currentMemorySize + data.byteLength;

    if (newSize > this.MAX_MEMORY_SIZE) {
      logger.warn('ModelCache', 'Limite mémoire atteinte, éviction des anciens modèles');
      
      // Éviction LRU simple - supprimer le premier élément
      // (dans un vrai système, on utiliserait un timestamp)
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        const firstData = this.memoryCache.get(firstKey)!;
        this.currentMemorySize -= firstData.byteLength;
        this.memoryCache.delete(firstKey);
        logger.info('ModelCache', `Modèle évincé de la mémoire: ${firstKey}`);
      }
    }

    this.memoryCache.set(modelId, data);
    this.currentMemorySize += data.byteLength;
  }

  /**
   * Sauvegarde dans IndexedDB
   */
  private async setIndexedDBCache(modelId: string, data: ArrayBuffer): Promise<void> {
    try {
      const cached: CachedModel = {
        modelId,
        data,
        timestamp: Date.now(),
        size: data.byteLength,
      };
      
      await set(`model:${modelId}`, cached);
      
      logger.debug('ModelCache', `IndexedDB sauvegardé: ${modelId}`, {
        sizeMB: (data.byteLength / 1024 / 1024).toFixed(2),
      });
    } catch (error) {
      // Quota exceeded probable
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        logger.warn('ModelCache', 'Quota IndexedDB dépassé', { modelId });
        // On pourrait implémenter une stratégie d'éviction ici
      }
      throw error;
    }
  }

  /**
   * Sauvegarde dans le Service Worker cache
   */
  private async setServiceWorkerCache(modelId: string, data: ArrayBuffer): Promise<void> {
    if (!('caches' in window)) {
      logger.warn('ModelCache', 'Service Worker non disponible');
      return;
    }

    try {
      const cache = await caches.open('orion-models-v1');
      const response = new Response(data, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000', // 1 an
        },
      });
      
      await cache.put(`/models/${modelId}`, response);
      
      logger.debug('ModelCache', `Service Worker sauvegardé: ${modelId}`, {
        sizeMB: (data.byteLength / 1024 / 1024).toFixed(2),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        logger.warn('ModelCache', 'Quota Service Worker dépassé', { modelId });
      }
      throw error;
    }
  }
}

// Instance singleton
export const modelCache = new ModelCache();
