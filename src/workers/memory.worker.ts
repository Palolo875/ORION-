// src/workers/memory.worker.ts

/**
 * Memory Worker - Mémoire Sémantique d'ORION
 * 
 * Ce worker gère la mémoire sémantique persistante avec embeddings.
 * Il utilise @xenova/transformers pour créer des embeddings sémantiques,
 * hnswlib-wasm pour la recherche vectorielle rapide (HNSW),
 * et idb-keyval pour le stockage persistant dans IndexedDB.
 */

import { get, set, keys, del } from 'idb-keyval';
import { WorkerMessage, MemoryItem, MemoryType } from '../types';
import { pipeline, env } from '@xenova/transformers';
import { loadHnswlib, type HierarchicalNSW } from 'hnswlib-wasm';
import { MEMORY_CONFIG, HNSW_CONFIG } from '../config/constants';
import { logger } from '../utils/logger';
import { backupManager } from '../utils/persistence/BackupManager';

// Configuration de Transformers.js pour une performance optimale dans le navigateur
env.allowLocalModels = false;
env.useBrowserCache = true;

// === Singleton pour le pipeline d'embedding ===
type PipelineInstance = Awaited<ReturnType<typeof pipeline>>;

class EmbeddingPipeline {
  static task = 'feature-extraction' as const;
  static model = MEMORY_CONFIG.EMBEDDING_MODEL;
  static instance: PipelineInstance | null = null;

  static async getInstance(): Promise<PipelineInstance> {
    if (this.instance === null) {
      logger.info('MemoryWorker', "Initialisation du modèle d'embedding");
      this.instance = await pipeline(this.task, this.model);
      logger.info('MemoryWorker', "Modèle d'embedding prêt");
    }
    return this.instance;
  }
}

// === HNSW Index Manager ===
class HNSWIndexManager {
  private index: HierarchicalNSW | null = null;
  private indexInitialized = false;
  private embeddingDimension = 384; // Dimension pour all-MiniLM-L6-v2
  private idToMemoryKey: Map<number, string> = new Map();
  private memoryKeyToId: Map<string, number> = new Map();
  private nextId = 0;

  async initialize() {
    if (this.indexInitialized) return;
    
    logger.info('MemoryWorker', "Initialisation de l'index HNSW");
    
    // Charger le module hnswlib-wasm
    const hnswlibModule = await loadHnswlib();
    
    // Créer un nouvel index HNSW
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const HNSWClass = hnswlibModule.HierarchicalNSW as any;
    this.index = new HNSWClass('cosine', this.embeddingDimension);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.index as any).initIndex(
      MEMORY_CONFIG.BUDGET,
      HNSW_CONFIG.M,
      HNSW_CONFIG.EF_CONSTRUCTION,
      200
    );
    
    // Charger les embeddings existants dans l'index
    await this.loadExistingMemories();
    
    this.indexInitialized = true;
    logger.info('MemoryWorker', 'Index HNSW initialisé avec succès');
  }

  private async loadExistingMemories() {
    const memoryKeys = (await keys()).filter(
      key => typeof key === 'string' && key.startsWith('memory_')
    ) as string[];

    let loadedCount = 0;
    for (const key of memoryKeys) {
      const item = await get(key) as MemoryItem;
      if (item && item.embedding) {
        const id = this.nextId++;
        this.idToMemoryKey.set(id, item.id);
        this.memoryKeyToId.set(item.id, id);
        
        if (this.index) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.index as any).addPoint(new Float32Array(item.embedding), id, true);
          loadedCount++
        }
      }
    }
    
    if (loadedCount > 0) {
      logger.info('MemoryWorker', 'Souvenirs chargés dans l\'index', { count: loadedCount });
    }
  }

  async addToIndex(memoryId: string, embedding: number[]) {
    if (!this.index) await this.initialize();
    
    const id = this.nextId++;
    this.idToMemoryKey.set(id, memoryId);
    this.memoryKeyToId.set(memoryId, id);
    
    if (this.index) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.index as any).addPoint(new Float32Array(embedding), id, true);
    }
  }

  async search(queryEmbedding: number[], k: number = MEMORY_CONFIG.MAX_SEARCH_RESULTS): Promise<string[]> {
    if (!this.index) {
      logger.warn('MemoryWorker', 'Index non initialisé, fallback vers recherche linéaire');
      return [];
    }

    if (this.index.getCurrentCount() === 0) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((this.index as any).setEf) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.index as any).setEf(HNSW_CONFIG.EF_SEARCH);
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (this.index as any).searchKnn(
      new Float32Array(queryEmbedding),
      k
    );

    const memoryIds: string[] = [];
    for (let i = 0; i < result.neighbors.length; i++) {
      const hnswId = result.neighbors[i];
      const memoryId = this.idToMemoryKey.get(hnswId);
      
      // Vérifier le seuil de similarité
      const distance = result.distances[i];
      const similarity = 1 - distance; // Cosine distance to similarity
      
      if (similarity >= MEMORY_CONFIG.SIMILARITY_THRESHOLD && memoryId) {
        memoryIds.push(memoryId);
      }
    }

    return memoryIds;
  }

  async removeFromIndex(memoryId: string) {
    const id = this.memoryKeyToId.get(memoryId);
    if (id !== undefined && this.index) {
      // Note: hnswlib-wasm ne supporte pas directement la suppression
      // On doit reconstruire l'index. Pour l'instant, on marque juste comme supprimé
      this.idToMemoryKey.delete(id);
      this.memoryKeyToId.delete(memoryId);
    }
  }

  async rebuildIndex() {
    logger.info('MemoryWorker', "Reconstruction de l'index");
    this.index = null;
    this.indexInitialized = false;
    this.idToMemoryKey.clear();
    this.memoryKeyToId.clear();
    this.nextId = 0;
    await this.initialize();
  }
}

// Instance de l'index HNSW
const hnswIndex = new HNSWIndexManager();

// === Fonctions de la Mémoire ===

async function createSemanticEmbedding(text: string): Promise<number[]> {
  const extractor = await EmbeddingPipeline.getInstance();
  const result = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(result.data);
}

// Cache pour les embeddings de requêtes fréquentes
const embeddingCache = new Map<string, { embedding: number[], timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 heure

async function getCachedEmbedding(text: string): Promise<number[]> {
  const cached = embeddingCache.get(text);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    logger.debug('MemoryWorker', "Utilisation de l'embedding en cache");
    return cached.embedding;
  }
  
  const embedding = await createSemanticEmbedding(text);
  embeddingCache.set(text, { embedding, timestamp: now });
  
  // Nettoyer le cache si trop grand
  if (embeddingCache.size > 100) {
    const oldestKey = Array.from(embeddingCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
    embeddingCache.delete(oldestKey);
  }
  
  return embedding;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function addMemory(text: string, type: MemoryType, traceId: string) {
  // Lancer le nettoyage AVANT d'ajouter
  await runMemoryJanitor(traceId);

  const id = `memory_${Date.now()}`;
  const embedding = await createSemanticEmbedding(text);
  const now = Date.now();
  const memoryItem: MemoryItem = {
    id,
    text,
    embedding,
    timestamp: now,
    lastAccessed: now,
    type,
    embeddingVersion: MEMORY_CONFIG.EMBEDDING_MODEL_VERSION,
  };
  
  await set(id, memoryItem);
  
  // Ajouter à l'index HNSW
  await hnswIndex.addToIndex(id, embedding);
  
  logger.debug('MemoryWorker', 'Souvenir ajouté', { type }, traceId);
}

async function searchMemory(query: string, traceId: string): Promise<string[]> {
  const queryEmbedding = await getCachedEmbedding(query);
  
  // Essayer la recherche HNSW d'abord
  const hnswResults = await hnswIndex.search(queryEmbedding, MEMORY_CONFIG.MAX_SEARCH_RESULTS);
  
  if (hnswResults.length > 0) {
    logger.debug('MemoryWorker', 'Recherche HNSW', { resultCount: hnswResults.length }, traceId);
    
    // Récupérer les items et mettre à jour lastAccessed
    const results: string[] = [];
    const now = Date.now();
    
    for (const memoryId of hnswResults) {
      const item = await get(memoryId) as MemoryItem;
      if (item) {
        results.push(item.text);
        item.lastAccessed = now;
        await set(memoryId, item);
      }
    }
    
    return results;
  }
  
  // Fallback vers recherche linéaire si HNSW ne retourne rien
  logger.debug('MemoryWorker', 'Fallback vers recherche linéaire', undefined, traceId);
  return await linearSearch(queryEmbedding, traceId);
}

async function linearSearch(queryEmbedding: number[], traceId: string): Promise<string[]> {
  const memoryKeys = await keys();
  const allMemories: MemoryItem[] = [];

  for (const key of memoryKeys) {
    if (typeof key === 'string' && key.startsWith('memory_')) {
      const item = await get(key);
      if (item && item.embedding) {
        allMemories.push(item as MemoryItem);
      }
    }
  }

  if (allMemories.length === 0) return [];

  allMemories.forEach(item => {
    item.similarity = cosineSimilarity(item.embedding, queryEmbedding);
  });

  allMemories.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

  logger.debug('MemoryWorker', 'Recherche linéaire effectuée', { count: allMemories.length }, traceId);
  
  const relevantResults = allMemories
    .filter(item => (item.similarity || 0) > MEMORY_CONFIG.SIMILARITY_THRESHOLD)
    .slice(0, MEMORY_CONFIG.MAX_SEARCH_RESULTS);
  
  const now = Date.now();
  for (const item of relevantResults) {
    item.lastAccessed = now;
    await set(item.id, item);
  }
  
  return relevantResults.map(item => item.text);
}

async function runMemoryJanitor(traceId: string) {
  logger.debug('MemoryWorker', 'Lancement du nettoyeur de mémoire', undefined, traceId);
  const allKeys = (await keys()) as string[];
  const memoryKeys = allKeys.filter(key => typeof key === 'string' && key.startsWith('memory_'));

  if (memoryKeys.length < MEMORY_CONFIG.BUDGET) {
    logger.debug('MemoryWorker', 'Budget non atteint, pas de nettoyage', { 
      current: memoryKeys.length, 
      budget: MEMORY_CONFIG.BUDGET 
    });
    return;
  }

  logger.info('MemoryWorker', 'Budget atteint, nettoyage en cours', { budget: MEMORY_CONFIG.BUDGET });
  const allMemories: MemoryItem[] = await Promise.all(
    memoryKeys.map(async key => await get(key))
  );
  
  const now = Date.now();
  const expiredItems = allMemories.filter(item => 
    item && item.type === 'tool_result' && (now - item.timestamp > MEMORY_CONFIG.TOOL_RESULT_TTL)
  );

  let needsIndexRebuild = false;
  
  for (const item of expiredItems) {
    await del(item.id);
    await hnswIndex.removeFromIndex(item.id);
    needsIndexRebuild = true;
    logger.debug('MemoryWorker', 'Souvenir expiré (TTL) supprimé', { id: item.id });
  }

  const remainingMemories = allMemories.filter(
    item => item && !expiredItems.find(e => e.id === item.id)
  );
  
  if (remainingMemories.length > MEMORY_CONFIG.BUDGET) {
    remainingMemories.sort((a, b) => a.lastAccessed - b.lastAccessed);
    const itemsToDelete = remainingMemories.slice(0, remainingMemories.length - MEMORY_CONFIG.BUDGET);
    
    for (const item of itemsToDelete) {
      await del(item.id);
      await hnswIndex.removeFromIndex(item.id);
      needsIndexRebuild = true;
      logger.debug('MemoryWorker', 'Souvenir le moins utilisé (LRU) supprimé', { id: item.id });
    }
  }

  // Reconstruire l'index si nécessaire
  if (needsIndexRebuild && expiredItems.length + (remainingMemories.length > MEMORY_CONFIG.BUDGET ? remainingMemories.length - MEMORY_CONFIG.BUDGET : 0) > 10) {
    await hnswIndex.rebuildIndex();
  }

  logger.debug('MemoryWorker', 'Nettoyage terminé', undefined, traceId);
}

async function getConversationContext(messageId: string): Promise<MemoryItem[]> {
  const memoryKeys = (await keys()) as string[];
  const recentMemoryKeys = memoryKeys
    .filter(key => typeof key === 'string' && key.startsWith('memory_'))
    .sort()
    .reverse()
    .slice(0, MEMORY_CONFIG.RECENT_MEMORY_COUNT);
  
  const recentMemories: MemoryItem[] = [];
  for (const key of recentMemoryKeys) {
    const item = await get(key);
    if (item) {
      recentMemories.push(item as MemoryItem);
    }
  }
  
  return recentMemories;
}

// === Worker principal ===

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload, meta } = event.data;
  const traceId = meta?.traceId || 'unknown';

  try {
    if (type === 'init') {
      logger.info('MemoryWorker', 'Initialisation du système de mémoire');
      
      // Initialiser l'embedding et HNSW en parallèle
      Promise.all([
        EmbeddingPipeline.getInstance(),
        hnswIndex.initialize()
      ]).then(() => {
        logger.info('MemoryWorker', 'Système de mémoire et index HNSW prêts');
        
        // Démarrer les sauvegardes automatiques
        backupManager.startAutoBackup();
        logger.info('MemoryWorker', 'Sauvegardes automatiques démarrées');
        
        self.postMessage({ type: 'init_complete', payload: { success: true }, meta });
      }).catch(error => {
        logger.error('MemoryWorker', 'Erreur lors de l\'initialisation', error);
        self.postMessage({ type: 'init_error', payload: { error: error.message }, meta });
      });
    }
    else if (type === 'store') {
      const storePayload = payload as { content: string; type?: MemoryType };
      const memoryType: MemoryType = storePayload.type || 'conversation';
      await addMemory(storePayload.content, memoryType, traceId);
      self.postMessage({ type: 'store_complete', payload: { success: true }, meta });
    } 
    else if (type === 'search') {
      const searchPayload = payload as { query: string; limit?: number };
      const results = await searchMemory(searchPayload.query, traceId);
      self.postMessage({ 
        type: 'search_result', 
        payload: { 
          results: results.map(content => ({ content })),
          count: results.length 
        }, 
        meta 
      });
    }
    else if (type === 'add_feedback') {
      const feedbackPayload = payload as { 
        messageId: string; 
        feedback: 'positive' | 'negative'; 
        query: string; 
        response: string 
      };
      const { messageId, feedback, query, response } = feedbackPayload;
      
      const failureReport = {
        id: `failure_${messageId}_${Date.now()}`,
        timestamp: Date.now(),
        feedback: feedback,
        originalQuery: query,
        failedResponse: response,
        conversationContext: await getConversationContext(messageId),
      };

      if (feedback === 'bad') {
        await set(failureReport.id, failureReport);
        logger.debug('MemoryWorker', 'Rapport d\'\u00e9chec sauvegardé', { messageId }, traceId);
      } else {
        logger.debug('MemoryWorker', 'Feedback positif enregistré', { messageId }, traceId);
      }
      
      self.postMessage({ type: 'feedback_saved', payload: { success: true }, meta });
    }
    else if (type === 'create_backup') {
      logger.info('MemoryWorker', 'Création d\'une sauvegarde manuelle');
      const backupId = await backupManager.createBackup('manual');
      self.postMessage({ 
        type: 'backup_created', 
        payload: { success: !!backupId, backupId }, 
        meta 
      });
    }
    else if (type === 'restore_backup') {
      const restorePayload = payload as { backupId: string; clearExisting?: boolean };
      logger.info('MemoryWorker', 'Restauration d\'une sauvegarde', { backupId: restorePayload.backupId });
      const success = await backupManager.restoreBackup(restorePayload.backupId, restorePayload.clearExisting);
      
      if (success) {
        // Reconstruire l'index après restauration
        await hnswIndex.rebuildIndex();
      }
      
      self.postMessage({ 
        type: 'backup_restored', 
        payload: { success }, 
        meta 
      });
    }
    else if (type === 'list_backups') {
      const backups = await backupManager.listBackups();
      self.postMessage({ 
        type: 'backups_listed', 
        payload: { backups }, 
        meta 
      });
    }
    else {
      logger.warn('MemoryWorker', 'Type de message inconnu', { type });
    }
  } catch (error) {
    logger.error('MemoryWorker', 'Erreur dans le worker', error);
    self.postMessage({ 
      type: 'memory_error', 
      payload: { error: (error as Error).message }, 
      meta 
    });
  }
};
