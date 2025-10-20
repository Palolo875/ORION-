/**
 * Types pour les payloads spécifiques des workers
 * Améliore la sécurité des types et évite l'utilisation de 'any'
 */

/**
 * Payload pour le changement de modèle
 */
export interface SetModelPayload {
  modelId: string;
  modelConfig?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
}

/**
 * Payload pour le feedback utilisateur
 */
export interface FeedbackPayload {
  messageId: string;
  feedback: 'positive' | 'negative';
  query: string;
  response: string;
  comment?: string;
}

/**
 * Payload pour les erreurs LLM
 */
export interface LLMErrorPayload {
  error: string;
  details?: Record<string, unknown>;
  stack?: string;
}

/**
 * Payload pour l'exécution d'un outil
 */
export interface ToolExecutionPayload {
  toolName: string;
  toolInput: string;
  result: string;
  confidence?: number;
}

/**
 * Payload pour les erreurs d'outil
 */
export interface ToolErrorPayload {
  error: string;
  toolName?: string;
  details?: Record<string, unknown>;
}

/**
 * Payload pour l'export de mémoire
 */
export interface MemoryExportPayload {
  data: string;
  itemCount: number;
  timestamp: number;
}

/**
 * Payload pour l'import de mémoire
 */
export interface MemoryImportPayload {
  data: string | Record<string, unknown>;
}

/**
 * Payload pour la progression de chargement LLM
 */
export interface LLMProgressPayload {
  progress: number;
  text: string;
  loaded: number;
  total: number;
  modelId?: string;
}
