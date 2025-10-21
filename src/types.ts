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
 * Type pour les étapes du flux cognitif
 */
export type FlowStep = 'query' | 'tool_search' | 'memory_search' | 'llm_reasoning' | 'final_response' | 'idle' | 'multi_agent_critical' | 'multi_agent_synthesis';

/**
 * Payload pour les mises à jour de statut du flux cognitif
 */
export interface StatusUpdatePayload {
  step: FlowStep;
  details: string;
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
 * Payload pour la progression du chargement du modèle
 */
export interface LLMLoadProgressPayload {
  progress: number;
  text: string;
  loaded: number;
  total: number;
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
    debateQuality?: import('./utils/debateQuality').DebateQuality;
    error?: string;
  };
  // Étapes de raisonnement (si disponibles)
  reasoningSteps?: import('./types/reasoning').ReasoningStep[];
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

/**
 * Type de souvenir pour la gestion de la mémoire
 */
export type MemoryType = 'conversation' | 'tool_result' | 'user_fact';

/**
 * Structure d'un item en mémoire avec métadonnées pour la gestion TTL/LRU
 */
export interface MemoryItem {
  id: string;
  text: string;
  embedding: number[];
  timestamp: number;
  lastAccessed: number; // Pour la stratégie LRU
  type: MemoryType; // Pour la stratégie TTL
  embeddingVersion: string; // Pour la migration d'embeddings
  similarity?: number; // Pour les résultats de recherche
}
