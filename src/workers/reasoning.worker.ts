// src/workers/reasoning.worker.ts

/**
 * Reasoning Worker
 * 
 * Ce worker est responsable de l'analyse et du raisonnement multi-agents.
 * Il génère des réponses selon deux perspectives : Logique et Créative.
 */

import type { WorkerMessage, QueryPayload } from '../types';

console.log("Reasoning Worker chargé et prêt.");

// --- Nos "Personnalités" d'agents internes ---

/**
 * Agent Logique : fournit une réponse factuelle et structurée.
 */
function getLogicalResponse(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('orion')) {
    return "ORION est un système d'IA modulaire fonctionnant en 100% frontend, utilisant une architecture de Neural Mesh pour coordonner plusieurs agents de raisonnement.";
  }
  
  if (lowerQuery.includes('neural mesh')) {
    return "Le Neural Mesh est une architecture distribuée où plusieurs agents spécialisés collaborent via un système d'orchestration pour produire des réponses de qualité.";
  }
  
  if (lowerQuery.includes('architecture') || lowerQuery.includes('fonctionne')) {
    return "L'architecture repose sur des Web Workers communiquant via un système de messages. L'orchestrateur coordonne les agents de raisonnement et de mémoire.";
  }
  
  if (lowerQuery.includes('privé') || lowerQuery.includes('local') || lowerQuery.includes('données')) {
    return "Toutes les opérations se font localement dans le navigateur. Aucune donnée n'est envoyée à un serveur externe, garantissant une confidentialité totale.";
  }
  
  return "Je n'ai pas d'information logique spécifique sur ce sujet. Pouvez-vous reformuler votre question ?";
}

/**
 * Agent Créatif : fournit une perspective plus imaginative et inspirante.
 */
function getCreativeResponse(query: string): string {
  const lowerQuery = query.toLowerCase();
  const creativeKeywords = ['vision', 'rêve', 'futur', 'imagine', 'potentiel'];
  
  if (creativeKeywords.some(kw => lowerQuery.includes(kw))) {
    return "ORION incarne une nouvelle ère d'intelligence personnelle et souveraine, où chaque utilisateur possède son propre écosystème d'IA, respectueux de sa vie privée.";
  }
  
  if (lowerQuery.includes('orion')) {
    return "Tel un réseau neuronal cosmique, ORION tisse des liens entre différentes perspectives pour créer une compréhension plus riche et nuancée.";
  }
  
  if (lowerQuery.includes('neural mesh')) {
    return "Le Neural Mesh est comme un orchestre symphonique où chaque instrument (agent) apporte sa voix unique pour créer une harmonie de pensée collective.";
  }
  
  const randomWords = ['innovant', 'futuriste', 'unique', 'privé', 'local', 'révolutionnaire', 'autonome'];
  const randomWord = randomWords[Math.floor(Math.random() * randomWords.length)];
  return `Le concept semble profondément ${randomWord}. Il ouvre des perspectives fascinantes sur l'avenir de l'IA personnelle.`;
}

// --- Le worker principal ---

self.onmessage = (event: MessageEvent<WorkerMessage<QueryPayload>>) => {
  const { type, payload } = event.data;

  if (type === 'reason') {
    console.log(`[Reasoning] Débat initié pour: "${payload.query}"`);

    const logicalPerspective = getLogicalResponse(payload.query);
    const creativePerspective = getCreativeResponse(payload.query);

    // Le worker renvoie un objet contenant les deux perspectives.
    const debateResult = {
      logical: logicalPerspective,
      creative: creativePerspective,
    };

    const responseMessage: WorkerMessage = {
      type: 'reasoning_complete',
      payload: debateResult,
    };

    self.postMessage(responseMessage);
    console.log("[Reasoning] Résultat du débat envoyé à l'Orchestrateur.");
  } else if (type === 'analyze') {
    // Garder la compatibilité avec l'ancien système
    console.log('[Reasoning] Analyzing query:', payload);
    
    self.postMessage({
      type: 'analysis_result',
      payload: {
        intent: 'information_request',
        entities: [],
        confidence: 0.7
      }
    });
  } else if (type === 'init') {
    console.log('[Reasoning] Initialized');
  }
};
