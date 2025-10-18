// src/workers/orchestrator.worker.ts

/**
 * Orchestrator Worker
 * 
 * Ce worker est le chef d'orchestre du Neural Mesh.
 * Il reçoit les requêtes de l'UI, coordonne les autres workers,
 * et retourne la réponse finale synthétisée après un débat multi-agents.
 */

import type { WorkerMessage, QueryPayload, FinalResponsePayload } from '../types';

console.log("Orchestrator Worker chargé et prêt.");

// 1. Instancier le worker de raisonnement
const reasoningWorker = new Worker(new URL('./reasoning.worker.ts', import.meta.url), {
  type: 'module',
});

console.log("[Orchestrateur] Reasoning Worker instancié.");

// Variable pour stocker la requête en cours
let currentQuery: QueryPayload | null = null;

// --- Logique principale de l'Orchestrateur ---

self.onmessage = (event: MessageEvent<WorkerMessage<QueryPayload>>) => {
  const { type, payload } = event.data;

  try {
    if (type === 'query') {
      console.log(`[Orchestrateur] Requête reçue: "${payload.query}"`);
      
      // Sauvegarder la requête courante
      currentQuery = payload;
      
      // 2. Préparer le message pour le ReasoningWorker
      const reasoningQuery: WorkerMessage<QueryPayload> = {
        type: 'reason',
        payload: payload,
      };

      // 3. Envoyer la tâche de raisonnement
      reasoningWorker.postMessage(reasoningQuery);
      console.log("[Orchestrateur] Requête envoyée au Reasoning Worker pour débat multi-agents.");
    } else if (type === 'init') {
      console.log('[Orchestrateur] Initialized');
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

// 4. Écouter la réponse du ReasoningWorker
reasoningWorker.onmessage = (event: MessageEvent<WorkerMessage<{ logical: string, creative: string }>>) => {
  const { type, payload } = event.data;

  if (type === 'reasoning_complete') {
    console.log("[Orchestrateur] Résultat du débat reçu du Reasoning Worker.");
    console.log("[Orchestrateur] Perspectives:", payload);

    // 5. Agent de Synthèse : combine les perspectives en une réponse cohérente
    const finalResponseText = synthesizeDebate(payload.logical, payload.creative);

    // 6. Préparer la réponse finale pour l'UI
    const responsePayload: FinalResponsePayload = {
      response: finalResponseText,
      confidence: 0.85, // Confiance élevée car basée sur deux perspectives
    };

    const responseMessage: WorkerMessage<FinalResponsePayload> = {
      type: 'final_response',
      payload: responsePayload,
    };

    // 7. Envoyer la réponse finale à l'UI
    self.postMessage(responseMessage);
    console.log("[Orchestrateur] Réponse finale synthétisée et envoyée à l'UI.");
    
    // Nettoyer la requête courante
    currentQuery = null;
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
