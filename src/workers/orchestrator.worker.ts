// src/workers/orchestrator.worker.ts

/**
 * Orchestrator Worker
 * 
 * Ce worker est le chef d'orchestre du Neural Mesh.
 * Il reçoit les requêtes de l'UI, coordonne les autres workers,
 * et retourne la réponse finale synthétisée après un débat multi-agents.
 */

import type { WorkerMessage, QueryPayload, FinalResponsePayload } from '../types';

console.log("Orchestrator Worker (Secure) chargé et prêt.");

// Instancier tous les workers
const llmWorker = new Worker(new URL('./llm.worker.ts', import.meta.url), {
  type: 'module',
});

const memoryWorker = new Worker(new URL('./memory.worker.ts', import.meta.url), {
  type: 'module',
});

const toolUserWorker = new Worker(new URL('./toolUser.worker.ts', import.meta.url), {
  type: 'module',
});

console.log("[Orchestrateur] Tous les workers ont été instanciés.");

// Variables pour stocker la requête en cours et le tracer
let currentQueryContext: QueryPayload | null = null;
let currentQueryMeta: WorkerMessage['meta'] | null = null;
let startTime: number = 0;
let currentMemoryHits: string[] = [];

// --- Logique principale de l'Orchestrateur ---

self.onmessage = (event: MessageEvent<WorkerMessage<QueryPayload>>) => {
  const { type, payload, meta } = event.data;

  try {
    if (type === 'query') {
      console.log(`[Orchestrateur] Requête reçue (traceId: ${meta?.traceId}): "${payload.query}"`);
      
      // Sauvegarder la requête courante et les métadonnées
      currentQueryContext = payload;
      currentQueryMeta = meta || null;
      startTime = performance.now(); // Démarrer le chronomètre
      
      // Étape 1 du ReAct: Essayer d'agir d'abord (vérifier si un outil peut répondre)
      console.log("[Orchestrateur] Interrogation du ToolUser Worker...");
      toolUserWorker.postMessage({ 
        type: 'find_and_execute_tool', 
        payload: { query: payload.query },
        meta: currentQueryMeta 
      });
    } else if (type === 'init') {
      console.log('[Orchestrateur] Initialized');
      // Initialiser tous les workers
      llmWorker.postMessage({ type: 'init' });
      memoryWorker.postMessage({ type: 'init' });
      toolUserWorker.postMessage({ type: 'init' });
    } else if (type === 'feedback') {
      console.log(`[Orchestrateur] Feedback relayé au Memory Worker.`);
      memoryWorker.postMessage({ type: 'add_feedback', payload: payload });
    } else {
      console.warn(`[Orchestrateur] Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error('[Orchestrateur] Error processing message:', error);
    sendResponse({
      response: 'Une erreur est survenue lors du traitement de votre demande.',
      confidence: 0
    });
  }
};

// --- Écouteurs pour les réponses des workers ---

// Écouter les réponses du ToolUserWorker
toolUserWorker.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  if (type === 'tool_executed') {
    // L'outil a été trouvé et exécuté avec succès. On court-circuite le débat.
    const endTime = performance.now();
    const inferenceTimeMs = Math.round(endTime - startTime);
    
    console.log(`[Orchestrateur] Outil '${payload.toolName}' exécuté. Réponse directe.`);
    const responsePayload: FinalResponsePayload = {
      response: payload.result,
      confidence: 1.0, // Confiance maximale pour un outil factuel
      provenance: { 
        toolUsed: payload.toolName,
        memoryHits: [],
        fromAgents: undefined
      },
      debug: {
        totalRounds: 0, // Pas de débat pour un outil
        inferenceTimeMs: inferenceTimeMs
      }
    };
    self.postMessage({ 
      type: 'final_response', 
      payload: responsePayload,
      meta: currentQueryMeta || undefined
    });
    
    console.log(`[Orchestrateur] Réponse finale envoyée (traceId: ${currentQueryMeta?.traceId}) en ${inferenceTimeMs}ms.`);

    // Sauvegarder la conversation
    const memoryToSave = `Q: ${currentQueryContext!.query} | A: ${payload.result}`;
    memoryWorker.postMessage({ 
      type: 'store', 
      payload: { content: memoryToSave },
      meta: currentQueryMeta || undefined
    });
    
    // Réinitialiser pour la prochaine requête
    currentMemoryHits = [];

  } else if (type === 'no_tool_found' || type === 'tool_error') {
    // Aucun outil trouvé ou une erreur est survenue, on passe au raisonnement.
    if (type === 'tool_error') {
      console.error(`[Orchestrateur] Erreur du ToolUser: ${payload.error}`);
    }
    
    console.log("[Orchestrateur] Aucun outil applicable. Lancement du processus de mémoire et débat.");
    memoryWorker.postMessage({ 
      type: 'search', 
      payload: { query: currentQueryContext!.query },
      meta: currentQueryMeta || undefined
    });
  } else if (type === 'init_complete') {
    console.log('[Orchestrateur] ToolUser Worker initialisé.');
  }
};

// --- État pour le LLM ---
// Plus besoin de l'état de débat, le LLM génère directement la réponse

// Écouter les réponses du MemoryWorker
memoryWorker.onmessage = (event: MessageEvent<WorkerMessage<{ results: Array<{ content?: string }> }>>) => {
  const { type, payload, meta } = event.data;

  // On vérifie que la réponse correspond à la requête en cours
  if (meta?.traceId !== currentQueryMeta?.traceId && type !== 'init_complete' && type !== 'store_complete') {
    return;
  }

  if (type === 'search_result') {
    // Stocker les résultats de la mémoire
    currentMemoryHits = payload.results.map((r) => r.content || '').filter(c => c.length > 0);
    
    if (currentMemoryHits.length > 0) {
      console.log(`[Orchestrateur] (traceId: ${meta?.traceId}) Contexte reçu: ${currentMemoryHits.length} souvenir(s).`);
    } else {
      console.log(`[Orchestrateur] (traceId: ${meta?.traceId}) Aucun souvenir pertinent trouvé.`);
    }
    
    console.log(`[Orchestrateur] (traceId: ${meta?.traceId}) Lancement de l'inférence LLM.`);
    const llmPayload = {
      ...currentQueryContext!,
      context: currentMemoryHits,
    };

    // Appeler le LLM Worker
    llmWorker.postMessage({ 
      type: 'generate_response', 
      payload: llmPayload,
      meta: currentQueryMeta || undefined
    });
  } else if (type === 'store_complete') {
    console.log("[Orchestrateur] Mémoire sauvegardée.");
  } else if (type === 'init_complete') {
    console.log('[Orchestrateur] Memory Worker initialisé.');
  }
};

// Écouteur pour le LLM Worker
llmWorker.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload, meta } = event.data;

  // On vérifie que la réponse correspond à la requête en cours
  if (meta?.traceId !== currentQueryMeta?.traceId && type !== 'init_complete' && type !== 'llm_load_progress') {
    return;
  }

  if (type === 'llm_response_complete') {
    const endTime = performance.now();
    const inferenceTimeMs = Math.round(endTime - startTime);
    console.log(`[Orchestrateur] (traceId: ${meta?.traceId}) Réponse du LLM reçue en ${inferenceTimeMs}ms.`);

    const finalPayload: FinalResponsePayload = {
      response: payload.response,
      confidence: 0.9, // À affiner plus tard avec une analyse du LLM
      provenance: {
        fromAgents: ['LLMAgent'],
        memoryHits: currentMemoryHits,
      },
      debug: {
        inferenceTimeMs: inferenceTimeMs,
      }
    };

    self.postMessage({ 
      type: 'final_response', 
      payload: finalPayload, 
      meta: currentQueryMeta || undefined
    });

    console.log(`[Orchestrateur] Réponse finale envoyée (traceId: ${meta?.traceId}) en ${inferenceTimeMs}ms.`);

    // Sauvegarder la conversation
    if (currentQueryContext) {
      const memoryToSave = `Q: ${currentQueryContext.query} | A: ${payload.response}`;
      memoryWorker.postMessage({ 
        type: 'store', 
        payload: { content: memoryToSave }, 
        meta: currentQueryMeta || undefined
      });
    }

    // Réinitialiser
    currentMemoryHits = [];
    currentQueryContext = null;
    currentQueryMeta = null;

  } else if (type === 'llm_error') {
    // Gérer l'erreur du LLM
    console.error(`[Orchestrateur] Erreur LLM: ${payload.error}`);
    const errorPayload: FinalResponsePayload = {
      response: `Désolé, une erreur est survenue lors de la génération de la réponse: ${payload.error}`,
      confidence: 0,
      provenance: {},
      debug: {}
    };
    self.postMessage({ 
      type: 'final_response', 
      payload: errorPayload, 
      meta: currentQueryMeta || undefined
    });

    // Réinitialiser
    currentMemoryHits = [];
    currentQueryContext = null;
    currentQueryMeta = null;

  } else if (type === 'llm_load_progress') {
    // Relayer la progression du chargement à l'UI
    self.postMessage({
      type: 'llm_load_progress',
      payload: payload,
      meta: meta
    });
  } else if (type === 'init_complete') {
    console.log('[Orchestrateur] LLM Worker initialisé.');
  }
};

/**
 * Envoie une réponse au thread principal
 */
function sendResponse(payload: FinalResponsePayload): void {
  const message: WorkerMessage<FinalResponsePayload> = {
    type: 'final_response',
    payload
  };
  self.postMessage(message);
}
