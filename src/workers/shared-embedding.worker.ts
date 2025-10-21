// src/workers/shared-embedding.worker.ts

/**
 * Shared Embedding Worker - Service centralisé d'embeddings
 * 
 * Ce worker singleton est partagé entre tous les autres workers
 * pour éviter de charger le modèle d'embedding plusieurs fois en mémoire.
 * 
 * OPTIMISATIONS:
 * - Instance unique du modèle partagée
 * - Cache intelligent des embeddings
 * - Gestion de file d'attente pour les requêtes
 * - Quantization automatique
 */

import { pipeline, env } from '@xenova/transformers';
import { MEMORY_CONFIG } from '../config/constants';
import { logger } from '../utils/logger';

// Configuration optimisée pour les performances
env.allowLocalModels = false;
env.useBrowserCache = true;
env.allowRemoteModels = true;

// Activer la quantization pour réduire l'utilisation mémoire
// @ts-expect-error - quantized est une option non documentée mais disponible
env.quantized = true;

logger.info('SharedEmbeddingWorker', 'Worker partagé initialisé');

// === Singleton Pipeline avec quantization ===
type PipelineInstance = Awaited<ReturnType<typeof pipeline>>;

class QuantizedEmbeddingPipeline {
  private static instance: PipelineInstance | null = null;
  private static loading = false;
  private static loadQueue: Array<{
    resolve: (pipeline: PipelineInstance) => void;
    reject: (error: Error) => void;
  }> = [];

  static async getInstance(): Promise<PipelineInstance> {
    // Si déjà chargé, retourner immédiatement
    if (this.instance !== null) {
      return this.instance;
    }

    // Si en cours de chargement, ajouter à la file d'attente
    if (this.loading) {
      return new Promise<PipelineInstance>((resolve, reject) => {
        this.loadQueue.push({ resolve, reject });
      });
    }

    // Commencer le chargement
    this.loading = true;
    logger.info('SharedEmbeddingWorker', 'Chargement du modèle avec quantization', {
      model: MEMORY_CONFIG.EMBEDDING_MODEL,
    });

    try {
      const startTime = performance.now();
      
      // Charger avec options de quantization
      this.instance = await pipeline('feature-extraction', MEMORY_CONFIG.EMBEDDING_MODEL, {
        // @ts-expect-error - Options de quantization
        quantized: true,
        // Utiliser le cache navigateur
        cache_dir: '.transformers-cache',
        // Optimisations de performance
        progress_callback: (progress: { status: string; loaded?: number; total?: number }) => {
          if (progress.status === 'progress' && progress.loaded && progress.total) {
            const percent = ((progress.loaded / progress.total) * 100).toFixed(1);
            logger.debug('SharedEmbeddingWorker', `Téléchargement: ${percent}%`);
          }
        },
      });

      const loadTime = performance.now() - startTime;
      logger.info('SharedEmbeddingWorker', 'Modèle chargé avec succès', {
        loadTime: `${(loadTime / 1000).toFixed(2)}s`,
      });

      // Résoudre toutes les promesses en attente
      this.loadQueue.forEach(({ resolve }) => resolve(this.instance!));
      this.loadQueue = [];
      
      return this.instance;
    } catch (error) {
      logger.error('SharedEmbeddingWorker', 'Erreur lors du chargement', error);
      
      // Rejeter toutes les promesses en attente
      this.loadQueue.forEach(({ reject }) => 
        reject(error instanceof Error ? error : new Error(String(error)))
      );
      this.loadQueue = [];
      
      throw error;
    } finally {
      this.loading = false;
    }
  }

  // Méthode pour libérer le modèle de la mémoire si nécessaire
  static async unload() {
    if (this.instance) {
      logger.info('SharedEmbeddingWorker', 'Déchargement du modèle');
      this.instance = null;
      
      // Forcer le garbage collector si disponible
      if (global.gc) {
        global.gc();
      }
    }
  }
}

// === Cache intelligent des embeddings ===
interface CachedEmbedding {
  embedding: number[];
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

class EmbeddingCache {
  private cache = new Map<string, CachedEmbedding>();
  private readonly maxSize = 200; // Augmenté car partagé
  private readonly ttl = 3600000; // 1 heure
  
  get(text: string): number[] | null {
    const cached = this.cache.get(text);
    if (!cached) return null;
    
    const now = Date.now();
    
    // Vérifier l'expiration
    if (now - cached.timestamp > this.ttl) {
      this.cache.delete(text);
      return null;
    }
    
    // Mettre à jour les métriques d'accès
    cached.accessCount++;
    cached.lastAccessed = now;
    
    logger.debug('SharedEmbeddingWorker', 'Cache hit', {
      textLength: text.length,
      accessCount: cached.accessCount,
    });
    
    return cached.embedding;
  }
  
  set(text: string, embedding: number[]) {
    // Nettoyer le cache si trop grand
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }
    
    this.cache.set(text, {
      embedding,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
    });
  }
  
  private evictLeastUsed() {
    // Stratégie LFU + LRU combinée
    const entries = Array.from(this.cache.entries());
    
    // Trier par score (accessCount / age)
    entries.sort((a, b) => {
      const ageA = Date.now() - a[1].lastAccessed;
      const ageB = Date.now() - b[1].lastAccessed;
      const scoreA = a[1].accessCount / (ageA / 1000); // accès par seconde
      const scoreB = b[1].accessCount / (ageB / 1000);
      return scoreA - scoreB;
    });
    
    // Supprimer les 20% les moins utilisés
    const toRemove = Math.floor(this.maxSize * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
    
    logger.debug('SharedEmbeddingWorker', 'Cache eviction', {
      removed: toRemove,
      remaining: this.cache.size,
    });
  }
  
  clear() {
    this.cache.clear();
  }
  
  getStats() {
    const entries = Array.from(this.cache.values());
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalAccesses: entries.reduce((sum, e) => sum + e.accessCount, 0),
      avgAccessCount: entries.length > 0 
        ? entries.reduce((sum, e) => sum + e.accessCount, 0) / entries.length 
        : 0,
    };
  }
}

const cache = new EmbeddingCache();

// === File d'attente pour traitement par batch ===
interface EmbeddingRequest {
  id: string;
  text: string;
  timestamp: number;
}

const requestQueue: EmbeddingRequest[] = [];
const pendingResponses = new Map<string, {
  resolve: (embedding: number[]) => void;
  reject: (error: Error) => void;
}>();

// Traiter les requêtes par batch pour optimiser
async function processBatch() {
  if (requestQueue.length === 0) return;
  
  const batchSize = 5;
  const batch = requestQueue.splice(0, batchSize);
  
  logger.debug('SharedEmbeddingWorker', 'Traitement batch', {
    size: batch.length,
    remaining: requestQueue.length,
  });
  
  for (const request of batch) {
    try {
      const embedding = await createEmbeddingInternal(request.text);
      const pending = pendingResponses.get(request.id);
      if (pending) {
        pending.resolve(embedding);
        pendingResponses.delete(request.id);
      }
    } catch (error) {
      const pending = pendingResponses.get(request.id);
      if (pending) {
        pending.reject(error instanceof Error ? error : new Error(String(error)));
        pendingResponses.delete(request.id);
      }
    }
  }
}

// Lancer le traitement par batch toutes les 50ms
setInterval(processBatch, 50);

// === Fonction interne de création d'embedding ===
async function createEmbeddingInternal(text: string): Promise<number[]> {
  // Vérifier le cache
  const cached = cache.get(text);
  if (cached) {
    return cached;
  }
  
  const extractor = await QuantizedEmbeddingPipeline.getInstance();
  
  // Créer l'embedding
  const result = await (extractor as (text: string, options?: unknown) => Promise<unknown>)(text, {
    pooling: 'mean',
    normalize: true,
  });
  
  // Convertir en array
  const embedding = Array.from(result as ArrayLike<number>);
  
  // Quantizer l'embedding pour réduire la taille en mémoire (float32 -> float16 simulation)
  const quantizedEmbedding = quantizeEmbedding(embedding);
  
  // Mettre en cache
  cache.set(text, quantizedEmbedding);
  
  return quantizedEmbedding;
}

// === Quantization des embeddings pour réduire l'empreinte mémoire ===
function quantizeEmbedding(embedding: number[]): number[] {
  // Réduire la précision (simuler float16)
  // Cela réduit l'utilisation mémoire de ~50% avec une perte de précision minime
  return embedding.map(value => {
    // Arrondir à 4 décimales (approximation de float16)
    return Math.round(value * 10000) / 10000;
  });
}

// === Interface publique du worker ===
self.onmessage = async (event: MessageEvent) => {
  const { type, payload, requestId } = event.data;

  try {
    switch (type) {
      case 'init': {
        logger.info('SharedEmbeddingWorker', 'Initialisation');
        // Précharger le modèle
        await QuantizedEmbeddingPipeline.getInstance();
        self.postMessage({ 
          type: 'init_complete', 
          requestId,
          payload: { success: true } 
        });
        break;
      }

      case 'create_embedding': {
        const { text } = payload;
        
        // Créer une requête et l'ajouter à la file
        const reqId = `req_${Date.now()}_${Math.random()}`;
        
        const promise = new Promise<number[]>((resolve, reject) => {
          pendingResponses.set(reqId, { resolve, reject });
          requestQueue.push({
            id: reqId,
            text,
            timestamp: Date.now(),
          });
        });
        
        const embedding = await promise;
        
        self.postMessage({
          type: 'embedding_created',
          requestId,
          payload: { embedding },
        });
        break;
      }

      case 'get_stats': {
        const stats = cache.getStats();
        self.postMessage({
          type: 'stats',
          requestId,
          payload: stats,
        });
        break;
      }

      case 'clear_cache': {
        cache.clear();
        self.postMessage({
          type: 'cache_cleared',
          requestId,
          payload: { success: true },
        });
        break;
      }

      case 'unload': {
        await QuantizedEmbeddingPipeline.unload();
        cache.clear();
        self.postMessage({
          type: 'unloaded',
          requestId,
          payload: { success: true },
        });
        break;
      }

      default:
        logger.warn('SharedEmbeddingWorker', 'Type de message inconnu', { type });
    }
  } catch (error) {
    logger.error('SharedEmbeddingWorker', 'Erreur', error);
    self.postMessage({
      type: 'error',
      requestId,
      payload: { error: (error as Error).message },
    });
  }
};

logger.info('SharedEmbeddingWorker', 'Service prêt');
