// src/workers/memory.worker.ts

/**
 * Memory Worker - Mémoire Sémantique d'ORION
 * 
 * Ce worker gère la mémoire sémantique persistante avec embeddings.
 * Il utilise @xenova/transformers pour créer des embeddings sémantiques
 * et idb-keyval pour le stockage persistant dans IndexedDB.
 */

import { get, set, keys } from 'idb-keyval';
import { WorkerMessage } from '../types';
import { pipeline, env } from '@xenova/transformers';

// Configuration de Transformers.js pour une performance optimale dans le navigateur
env.allowLocalModels = false; // N'utilise pas de modèles locaux du système de fichiers
env.useBrowserCache = true;  // Met en cache les modèles dans le cache du navigateur

// --- Singleton pour le pipeline d'embedding ---
// Cette classe garantit que le modèle d'IA n'est chargé qu'une seule fois.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PipelineInstance = any;

class EmbeddingPipeline {
  static task = 'feature-extraction';
  // 'all-MiniLM-L6-v2' est un excellent modèle, petit et performant.
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance: PipelineInstance = null;

  static async getInstance(): Promise<PipelineInstance> {
    if (this.instance === null) {
      console.log("[Memory] Initialisation du modèle d'embedding... (peut prendre du temps la première fois)");
      this.instance = await pipeline(this.task, this.model);
      console.log("[Memory] Modèle d'embedding prêt.");
    }
    return this.instance;
  }
}

// --- Fonctions de la Mémoire ---

async function createSemanticEmbedding(text: string): Promise<number[]> {
  const extractor = await EmbeddingPipeline.getInstance();
  // L'option { pooling: 'mean', normalize: true } est standard pour obtenir un bon embedding de phrase.
  const result = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(result.data);
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

async function addMemory(text: string, traceId: string) {
  const id = `memory_${Date.now()}`;
  const embedding = await createSemanticEmbedding(text);
  const memoryItem = { id, text, embedding, timestamp: Date.now() };
  
  await set(id, memoryItem);
  console.log(`[Memory] (traceId: ${traceId}) Souvenir ajouté avec embedding sémantique.`);
}

interface MemoryItem {
  id: string;
  text: string;
  embedding: number[];
  timestamp: number;
  similarity?: number;
}

async function searchMemory(query: string, traceId: string): Promise<string[]> {
  const queryEmbedding = await createSemanticEmbedding(query);
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

  console.log(`[Memory] (traceId: ${traceId}) Recherche sémantique effectuée. Trouvé ${allMemories.length} souvenirs.`);
  
  // On ne retourne que les souvenirs ayant une pertinence suffisante.
  return allMemories.filter(item => (item.similarity || 0) > 0.6).slice(0, 2).map(item => item.text);
}

// Nouvelle fonction pour récupérer le contexte de conversation récent
async function getConversationContext(messageId: string): Promise<MemoryItem[]> {
  // Pour ce PoC, cette fonction est simplifiée. 
  // On récupère les 10 derniers souvenirs pour donner du contexte à l'échec.
  const memoryKeys = (await keys()) as string[];
  const recentMemoryKeys = memoryKeys
    .filter(key => typeof key === 'string' && key.startsWith('memory_'))
    .sort()
    .reverse()
    .slice(0, 10);
  
  const recentMemories: MemoryItem[] = [];
  for (const key of recentMemoryKeys) {
    const item = await get(key);
    if (item) {
      recentMemories.push(item as MemoryItem);
    }
  }
  
  return recentMemories;
}

// --- Le worker principal ---

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload, meta } = event.data;
  const traceId = meta?.traceId || 'unknown';

  try {
    if (type === 'init') {
      // Initialisation - pré-charger le modèle en arrière-plan
      console.log('[Memory] Initialisation du système de mémoire...');
      // On lance l'initialisation en arrière-plan sans bloquer
      EmbeddingPipeline.getInstance().then(() => {
        console.log('[Memory] Système de mémoire prêt.');
        self.postMessage({ type: 'init_complete', payload: { success: true }, meta });
      }).catch(error => {
        console.error('[Memory] Erreur lors de l\'initialisation:', error);
        self.postMessage({ type: 'init_error', payload: { error: error.message }, meta });
      });
    }
    else if (type === 'store') {
      // Ajouter un souvenir
      await addMemory(payload.content, traceId);
      self.postMessage({ type: 'store_complete', payload: { success: true }, meta });
    } 
    else if (type === 'search') {
      // Rechercher dans les souvenirs
      const results = await searchMemory(payload.query, traceId);
      self.postMessage({ 
        type: 'search_result', 
        payload: { 
          results: results.map(content => ({ content })),
          count: results.length 
        }, 
        meta 
      });
    }
    // Gérer le feedback avec rapport d'échec enrichi
    else if (type === 'add_feedback') {
      const { messageId, feedback, query, response } = payload;
      
      // On crée un rapport d'échec structuré
      const failureReport = {
        id: `failure_${messageId}_${Date.now()}`,
        timestamp: Date.now(),
        feedback: feedback,
        originalQuery: query,
        failedResponse: response,
        // On récupère le contexte de la conversation au moment de l'échec
        conversationContext: await getConversationContext(messageId),
      };

      // On ne sauvegarde que les rapports d'échec pour le Genius Hour
      if (feedback === 'bad') {
        await set(failureReport.id, failureReport);
        console.log(`[Memory] (traceId: ${traceId}) Rapport d'échec sauvegardé pour ${messageId}`);
      } else {
        // Pour un feedback positif, on pourrait juste le logger ou l'ignorer pour l'instant
        console.log(`[Memory] (traceId: ${traceId}) Feedback positif enregistré pour ${messageId}`);
      }
      
      self.postMessage({ type: 'feedback_saved', payload: { success: true }, meta });
    }
    else {
      console.warn(`[Memory] Type de message inconnu: ${type}`);
    }
  } catch (error) {
    console.error(`[Memory] Erreur dans le worker:`, error);
    self.postMessage({ 
      type: 'memory_error', 
      payload: { error: (error as Error).message }, 
      meta 
    });
  }
};
