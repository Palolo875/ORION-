// src/workers/orchestrator.worker.ts

/**
 * Orchestrator Worker
 * 
 * Ce worker est le chef d'orchestre du Neural Mesh.
 * Il reçoit les requêtes de l'UI, coordonne les autres workers,
 * et retourne la réponse finale synthétisée après un débat multi-agents.
 */

import type { WorkerMessage, QueryPayload, FinalResponsePayload, AgentProposal, DebateRoundResult } from '../types';

console.log("Orchestrator Worker (Secure) chargé et prêt.");

// Instancier tous les workers
const reasoningWorker = new Worker(new URL('./reasoning.worker.ts', import.meta.url), {
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
      reasoningWorker.postMessage({ type: 'init' });
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
      provenance: { toolUsed: payload.toolName },
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

// --- État de la boucle de débat ---
const MAX_ROUNDS = 3;
const MIN_IMPROVEMENT_DELTA = 0.05;

interface DebateState {
  round: number;
  bestResponse: { response: string; confidence: number };
  lastConfidence: number;
}

let debateState: DebateState = {
  round: 0,
  bestResponse: { response: "Le débat n'a pas abouti.", confidence: 0.1 },
  lastConfidence: 0,
};

// Écouter les réponses du MemoryWorker
memoryWorker.onmessage = (event: MessageEvent<WorkerMessage<{ results: Array<{ content?: string }> }>>) => {
  const { type, payload } = event.data;

  if (type === 'search_result') {
    console.log("[Orchestrateur] Contexte reçu du Memory Worker. Lancement du débat.");
    
    const reasoningPayload = {
      ...currentQueryContext!,
      context: payload.results.map((r) => r.content || '').join('\n'),
    };

    // Lancer le premier round de débat
    reasoningWorker.postMessage({ 
      type: 'reason', 
      payload: reasoningPayload,
      meta: currentQueryMeta || undefined
    });
  } else if (type === 'store_complete') {
    console.log("[Orchestrateur] Mémoire sauvegardée.");
  } else if (type === 'init_complete') {
    console.log('[Orchestrateur] Memory Worker initialisé.');
  }
};

// NOUVELLE LOGIQUE DE DÉBAT ITÉRATIF
reasoningWorker.onmessage = (event: MessageEvent<WorkerMessage<DebateRoundResult>>) => {
  const { type, payload } = event.data;

  if (type === 'reasoning_round_complete') {
    debateState.round++;
    console.log(`[Orchestrateur] Fin du Round ${debateState.round}. Propositions reçues:`, payload.proposals);

    // --- Agent de Synthèse et Juge ---
    // 1. Agréger les propositions. Pour l'instant, on les concatène.
    const combinedText = payload.proposals
      .map(p => `- **${p.agentName}** (confiance: ${Math.round(p.confidence * 100)}%): ${p.proposalText}`)
      .join('\n');
    
    // 2. Calculer une confiance globale (moyenne pondérée par la confiance de chaque agent)
    const totalConfidence = payload.proposals.reduce((acc, p) => acc + p.confidence * p.confidence, 0);
    const totalWeights = payload.proposals.reduce((acc, p) => acc + p.confidence, 0);
    const overallConfidence = totalWeights > 0 ? totalConfidence / totalWeights : 0;
    
    console.log(`[Orchestrateur] Confiance du round: ${overallConfidence.toFixed(2)}`);

    // 3. Mettre à jour la meilleure réponse si le score est meilleur
    if (overallConfidence > debateState.lastConfidence) {
      debateState.bestResponse = {
        response: `## 🧠 Résultat du Débat Multi-Agents (Round ${debateState.round})\n\n${combinedText}`,
        confidence: overallConfidence,
      };
      debateState.lastConfidence = overallConfidence;
    }

    // --- Conditions d'Arrêt ---
    const improvement = overallConfidence - debateState.lastConfidence;

    if (debateState.round >= MAX_ROUNDS) {
      console.log("[Orchestrateur] Limite de rounds atteinte. Fin du débat.");
      finalizeDebate();
    } else if (improvement < MIN_IMPROVEMENT_DELTA && debateState.round > 1) {
      console.log("[Orchestrateur] Convergence atteinte (amélioration minimale non atteinte). Fin du débat.");
      finalizeDebate();
    } else {
      // Pour un vrai débat itératif, on relancerait un round avec les objections.
      // Ici, on simule la fin car nos agents ne sont pas encore itératifs.
      console.log("[Orchestrateur] Simulation de fin de débat après 1 round.");
      finalizeDebate();
    }
  } else if (type === 'init_complete') {
    console.log('[Orchestrateur] Reasoning Worker initialisé.');
  }
};

/**
 * Finalise le débat et envoie la réponse finale
 */
function finalizeDebate(): void {
  const endTime = performance.now();
  const inferenceTimeMs = Math.round(endTime - startTime);
  const agentNames = ['Logical', 'Creative']; // À rendre dynamique si plus d'agents
  
  const finalPayload: FinalResponsePayload = {
    response: `${debateState.bestResponse.response}\n\n---\n\n**💡 Conclusion du Neural Mesh :**\nLes agents ont délibéré pendant ${debateState.round} round(s) pour produire cette réponse nuancée. Confiance finale: ${Math.round(debateState.bestResponse.confidence * 100)}%`,
    confidence: debateState.bestResponse.confidence,
    provenance: { fromAgents: agentNames },
    debug: {
      totalRounds: debateState.round,
      inferenceTimeMs: inferenceTimeMs
    }
  };

  self.postMessage({ 
    type: 'final_response', 
    payload: finalPayload,
    meta: currentQueryMeta || undefined
  });
  
  console.log(`[Orchestrateur] Réponse finale envoyée (traceId: ${currentQueryMeta?.traceId}) en ${inferenceTimeMs}ms.`);

  // Sauvegarder la conversation
  if (currentQueryContext) {
    const memoryToSave = `Q: ${currentQueryContext.query} | A: ${debateState.bestResponse.response}`;
    memoryWorker.postMessage({ 
      type: 'store', 
      payload: { content: memoryToSave },
      meta: currentQueryMeta || undefined
    });
  }

  // Réinitialiser l'état du débat pour la prochaine requête
  debateState = { 
    round: 0, 
    bestResponse: { response: "Le débat n'a pas abouti.", confidence: 0.1 }, 
    lastConfidence: 0 
  };
  currentQueryContext = null;
  currentQueryMeta = null;
}

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
