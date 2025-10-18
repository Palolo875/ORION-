// src/types.ts

/**
 * Le format de message standard échangé entre l'UI et les workers,
 * ou entre les workers eux-mêmes.
 * Maintenant enrichi avec des métadonnées pour le suivi et la traçabilité.
 */
export interface WorkerMessage<T = unknown> {
  type: string; // Décrit l'intention du message, ex: 'query', 'final_response'
  payload: T;   // Les données transportées
  meta?: { 
    traceId: string; // Un ID unique pour suivre une requête à travers tout le système
    timestamp: number; // Horodatage du message
  };
}

/**
 * La structure des données envoyées par l'utilisateur pour une nouvelle requête.
 */
export interface QueryPayload {
  query: string;
  conversationHistory: { sender: 'user' | 'orion'; text: string; id?: string }[];
  deviceProfile?: 'full' | 'lite' | 'micro'; // Pour l'adaptation future
}

/**
 * La structure de la réponse finale envoyée par l'orchestrateur à l'UI.
 * Enrichie avec des informations de provenance et de débogage.
 */
export interface FinalResponsePayload {
  response: string;
  confidence: number;
  // D'où vient cette réponse ?
  provenance: { 
    fromAgents?: string[]; 
    memoryHits?: string[];
    toolUsed?: string;
  };
  // Informations de débogage pour la transparence
  debug: { 
    totalRounds?: number; 
    inferenceTimeMs?: number;
  };
}

/**
 * Payload pour les analyses du reasoning worker
 */
export interface AnalyzePayload {
  query: string;
  context?: string;
}

/**
 * Résultat d'analyse du reasoning worker
 */
export interface AnalysisResult {
  intent: string;
  entities: string[];
  confidence: number;
}

/**
 * Payload pour la recherche en mémoire
 */
export interface SearchPayload {
  query: string;
  limit?: number;
}

/**
 * Résultat de recherche en mémoire
 */
export interface SearchResult {
  results: Array<{
    content: string;
    score: number;
  }>;
  count: number;
}

/**
 * Payload pour stocker en mémoire
 */
export interface StorePayload {
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Résultat de stockage
 */
export interface StoreResult {
  success: boolean;
  id?: string;
}

/**
 * La structure d'une proposition faite par un agent de raisonnement.
 */
export interface AgentProposal {
  agentName: string;
  proposalText: string;
  confidence: number; // La confiance de l'agent dans sa propre proposition (0 à 1)
}

/**
 * Le résultat complet d'un round de débat.
 */
export interface DebateRoundResult {
  proposals: AgentProposal[];
}
