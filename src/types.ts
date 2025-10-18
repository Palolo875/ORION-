// src/types.ts

/**
 * Le format de message standard échangé entre l'UI et les workers,
 * ou entre les workers eux-mêmes.
 */
export interface WorkerMessage<T = unknown> {
  type: string; // Décrit l'intention du message, ex: 'query', 'final_response'
  payload: T;   // Les données transportées
}

/**
 * La structure des données envoyées par l'utilisateur pour une nouvelle requête.
 */
export interface QueryPayload {
  query: string;
  // Nous ajouterons l'historique de la conversation ici plus tard pour le contexte
  conversationHistory: { sender: 'user' | 'eiam'; text: string }[];
}

/**
 * La structure de la réponse finale envoyée par l'orchestrateur à l'UI.
 */
export interface FinalResponsePayload {
  response: string;
  // Nous ajouterons plus de métadonnées ici (confiance, sources, etc.)
  confidence: number;
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
