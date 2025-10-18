// src/workers/reasoning.worker.ts

/**
 * Reasoning Worker
 * 
 * Ce worker est responsable de l'analyse et du raisonnement multi-agents.
 * Il génère des réponses selon deux perspectives : Logique et Créative.
 */

import type { WorkerMessage, QueryPayload, AgentProposal, DebateRoundResult } from '../types';

console.log("Reasoning Worker (Debate-Ready) chargé et prêt.");

// --- Nos "Personnalités" d'agents internes ---

/**
 * Agent Logique : fournit une proposition factuelle et structurée avec un score de confiance.
 */
function getLogicalProposal(query: string): AgentProposal {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('orion')) {
    return {
      agentName: 'Logical',
      proposalText: "ORION est un système d'IA modulaire fonctionnant en 100% frontend, utilisant une architecture de Neural Mesh pour coordonner plusieurs agents de raisonnement.",
      confidence: 0.95
    };
  }
  
  if (lowerQuery.includes('neural mesh')) {
    return {
      agentName: 'Logical',
      proposalText: "Le Neural Mesh est une architecture distribuée où plusieurs agents spécialisés collaborent via un système d'orchestration pour produire des réponses de qualité.",
      confidence: 0.93
    };
  }
  
  if (lowerQuery.includes('architecture') || lowerQuery.includes('fonctionne')) {
    return {
      agentName: 'Logical',
      proposalText: "L'architecture repose sur des Web Workers communiquant via un système de messages. L'orchestrateur coordonne les agents de raisonnement et de mémoire.",
      confidence: 0.90
    };
  }
  
  if (lowerQuery.includes('privé') || lowerQuery.includes('local') || lowerQuery.includes('données')) {
    return {
      agentName: 'Logical',
      proposalText: "Toutes les opérations se font localement dans le navigateur. Aucune donnée n'est envoyée à un serveur externe, garantissant une confidentialité totale.",
      confidence: 0.92
    };
  }
  
  if (lowerQuery.includes('sécurité')) {
    return {
      agentName: 'Logical',
      proposalText: "La sécurité est assurée par une whitelist d'outils et l'isolation des workers.",
      confidence: 0.90
    };
  }
  
  return {
    agentName: 'Logical',
    proposalText: "Je manque de données factuelles pour répondre précisément.",
    confidence: 0.3
  };
}

/**
 * Agent Créatif : fournit une proposition plus imaginative et inspirante avec un score de confiance.
 */
function getCreativeProposal(query: string): AgentProposal {
  const lowerQuery = query.toLowerCase();
  const creativeKeywords = ['vision', 'rêve', 'futur', 'imagine', 'potentiel'];
  
  if (creativeKeywords.some(kw => lowerQuery.includes(kw))) {
    return {
      agentName: 'Creative',
      proposalText: "ORION incarne une nouvelle ère d'intelligence personnelle et souveraine, où chaque utilisateur possède son propre écosystème d'IA, respectueux de sa vie privée.",
      confidence: 0.88
    };
  }
  
  if (lowerQuery.includes('orion')) {
    return {
      agentName: 'Creative',
      proposalText: "Tel un réseau neuronal cosmique, ORION tisse des liens entre différentes perspectives pour créer une compréhension plus riche et nuancée.",
      confidence: 0.85
    };
  }
  
  if (lowerQuery.includes('neural mesh')) {
    return {
      agentName: 'Creative',
      proposalText: "Le Neural Mesh est comme un orchestre symphonique où chaque instrument (agent) apporte sa voix unique pour créer une harmonie de pensée collective.",
      confidence: 0.87
    };
  }
  
  const randomWords = ['innovant', 'futuriste', 'unique', 'privé', 'local', 'révolutionnaire', 'autonome'];
  const randomWord = randomWords[Math.floor(Math.random() * randomWords.length)];
  return {
    agentName: 'Creative',
    proposalText: `Le concept semble profondément ${randomWord}. Il ouvre des perspectives fascinantes sur l'avenir de l'IA personnelle.`,
    confidence: 0.6
  };
}

// --- Le worker principal ---

self.onmessage = (event: MessageEvent<WorkerMessage<QueryPayload & { context?: string }>>) => {
  const { type, payload } = event.data;

  if (type === 'reason') {
    console.log(`[Reasoning] Round de débat initié pour: "${payload.query}"`);

    // Chaque agent génère sa proposition avec un score de confiance
    const logicalProposal = getLogicalProposal(payload.query);
    const creativeProposal = getCreativeProposal(payload.query);
    
    // Le worker renvoie un tableau de propositions
    const result: DebateRoundResult = {
      proposals: [logicalProposal, creativeProposal]
    };

    const responseMessage: WorkerMessage<DebateRoundResult> = {
      type: 'reasoning_round_complete',
      payload: result
    };

    self.postMessage(responseMessage);
    console.log("[Reasoning] Propositions du round envoyées à l'Orchestrateur.");
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
