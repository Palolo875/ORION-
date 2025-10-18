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
  console.log('[Orchestrator] Requête reçue:', payload.query);
  
  // TODO: Implémenter la logique d'orchestration complète
  // 1. Analyser la requête avec le reasoning worker
  // 2. Récupérer les informations pertinentes avec le memory worker
  // 3. Générer la réponse finale via le débat du Neural Mesh
  
  // Pour l'instant, réponse simple pour valider la communication
  const response = `J'ai bien reçu votre message : "${payload.query}". 

Je suis ORION, votre assistant IA fonctionnant avec une architecture de Neural Mesh. La communication entre l'interface et l'orchestrateur est maintenant établie avec succès !

**Prochaines étapes :**
- Coordination avec les agents Reasoning et Memory
- Démarrage du débat du Neural Mesh
- Génération de réponses contextuelles

🎯 L'orchestrateur est opérationnel et prêt pour l'implémentation du système complet.`;

  sendResponse({
    response,
    confidence: 0.9
  });
  
  console.log('[Orchestrator] Réponse envoyée à l\'UI');
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
