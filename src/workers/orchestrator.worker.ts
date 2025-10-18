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

// Variable pour stocker la requête en cours
let currentQueryContext: QueryPayload | null = null;

// --- Logique principale de l'Orchestrateur ---

self.onmessage = (event: MessageEvent<WorkerMessage<QueryPayload>>) => {
  const { type, payload } = event.data;

  try {
    if (type === 'query') {
      console.log(`[Orchestrateur] Requête reçue: "${payload.query}"`);
      
      // Sauvegarder la requête courante
      currentQueryContext = payload;
      
      // Étape 1 du ReAct: Essayer d'agir d'abord (vérifier si un outil peut répondre)
      console.log("[Orchestrateur] Interrogation du ToolUser Worker...");
      toolUserWorker.postMessage({ type: 'find_and_execute_tool', payload: { query: payload.query } });
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
    console.log(`[Orchestrateur] Outil '${payload.toolName}' exécuté. Réponse directe.`);
    const responsePayload: FinalResponsePayload = {
      response: payload.result,
      confidence: 1.0, // Confiance maximale pour un outil factuel
      provenance: { toolUsed: payload.toolName }
    };
    self.postMessage({ type: 'final_response', payload: responsePayload });

    // Sauvegarder la conversation
    const memoryToSave = `Q: ${currentQueryContext!.query} | A: ${payload.result}`;
    memoryWorker.postMessage({ type: 'store', payload: { content: memoryToSave } });

  } else if (type === 'no_tool_found' || type === 'tool_error') {
    // Aucun outil trouvé ou une erreur est survenue, on passe au raisonnement.
    if (type === 'tool_error') {
      console.error(`[Orchestrateur] Erreur du ToolUser: ${payload.error}`);
    }
    
    console.log("[Orchestrateur] Aucun outil applicable. Lancement du processus de mémoire et débat.");
    memoryWorker.postMessage({ type: 'search', payload: { query: currentQueryContext!.query } });
  } else if (type === 'init_complete') {
    console.log('[Orchestrateur] ToolUser Worker initialisé.');
  }
};

// Écouter les réponses du MemoryWorker
memoryWorker.onmessage = (event: MessageEvent<WorkerMessage<{ results: Array<{ content?: string }> }>>) => {
  const { type, payload } = event.data;

  if (type === 'search_result') {
    console.log("[Orchestrateur] Contexte reçu du Memory Worker:", payload.results);
    
    const reasoningPayload = {
      ...currentQueryContext!,
      context: payload.results.map((r) => r.content || '').join('\n'),
    };

    reasoningWorker.postMessage({ type: 'reason', payload: reasoningPayload });
    console.log("[Orchestrateur] Requête + contexte envoyés au Reasoning Worker.");
  } else if (type === 'store_complete') {
    console.log("[Orchestrateur] Mémoire sauvegardée.");
  } else if (type === 'init_complete') {
    console.log('[Orchestrateur] Memory Worker initialisé.');
  }
};

// Écouter la réponse du ReasoningWorker
reasoningWorker.onmessage = (event: MessageEvent<WorkerMessage<{ logical: string, creative: string }>>) => {
  const { type, payload } = event.data;

  if (type === 'reasoning_complete') {
    console.log("[Orchestrateur] Résultat du débat reçu du Reasoning Worker.");
    console.log("[Orchestrateur] Perspectives:", payload);

    // Agent de Synthèse : combine les perspectives en une réponse cohérente
    const finalResponseText = synthesizeDebate(payload.logical, payload.creative);

    // Préparer la réponse finale pour l'UI
    const responsePayload: FinalResponsePayload = {
      response: finalResponseText,
      confidence: 0.85, // Confiance élevée car basée sur deux perspectives
      provenance: { fromAgents: ['Logical', 'Creative'] }
    };

    const responseMessage: WorkerMessage<FinalResponsePayload> = {
      type: 'final_response',
      payload: responsePayload,
    };

    // Envoyer la réponse finale à l'UI
    self.postMessage(responseMessage);
    console.log("[Orchestrateur] Réponse finale synthétisée et envoyée à l'UI.");
    
    // Sauvegarder la conversation
    const memoryToSave = `Q: ${currentQueryContext!.query} | A: ${payload.logical}`;
    memoryWorker.postMessage({ type: 'store', payload: { content: memoryToSave } });
    
    // Nettoyer la requête courante
    currentQueryContext = null;
  } else if (type === 'init_complete') {
    console.log('[Orchestrateur] Reasoning Worker initialisé.');
  }
};

/**
 * Synthétise les perspectives logique et créative en une réponse cohérente
 */
function synthesizeDebate(logical: string, creative: string): string {
  // Format structuré pour présenter le débat multi-agents
  return `## 🧠 Synthèse du Débat Multi-Agents

### 📊 Perspective Logique
${logical}

### 🎨 Perspective Créative
${creative}

---

**💡 Conclusion du Neural Mesh :**
Les deux agents s'accordent pour offrir une vision complète qui allie rigueur factuelle et inspiration. Cette approche multi-perspectives permet une compréhension plus nuancée et enrichie.`;
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
