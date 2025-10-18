// src/workers/orchestrator.worker.ts

/**
 * Orchestrator Worker
 * 
 * Ce worker est le chef d'orchestre du Neural Mesh.
 * Il reçoit les requêtes de l'UI, coordonne les autres workers,
 * et retourne la réponse finale.
 */

import type { WorkerMessage, QueryPayload, FinalResponsePayload } from '../types';

// Écouteur principal pour les messages provenant du thread principal
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'query':
        await handleQuery(payload as QueryPayload);
        break;
      
      case 'init':
        // Initialisation du worker si nécessaire
        console.log('[Orchestrator] Initialized');
        break;
      
      default:
        console.warn(`[Orchestrator] Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error('[Orchestrator] Error processing message:', error);
    sendResponse({
      response: 'Une erreur est survenue lors du traitement de votre demande.',
      confidence: 0
    });
  }
});

/**
 * Traite une requête utilisateur
 */
async function handleQuery(payload: QueryPayload): Promise<void> {
  console.log('[Orchestrator] Processing query:', payload.query);
  
  // TODO: Implémenter la logique d'orchestration
  // 1. Analyser la requête avec le reasoning worker
  // 2. Récupérer les informations pertinentes avec le memory worker
  // 3. Générer la réponse finale
  
  // Pour l'instant, réponse simple pour tester l'architecture
  sendResponse({
    response: `Requête reçue : "${payload.query}". L'orchestrateur est opérationnel !`,
    confidence: 0.8
  });
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
