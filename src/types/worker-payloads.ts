/**
 * Types pour les payloads spécifiques des workers
 * Améliore la sécurité des types et évite l'utilisation de 'any'
 */

import { z } from 'zod';

/**
 * Schémas Zod pour validation runtime
 */

export const SetModelPayloadSchema = z.object({
  modelId: z.string().min(1),
  modelConfig: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().min(1).max(4096).optional(),
    topP: z.number().min(0).max(1).optional(),
  }).optional(),
});

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

export const FeedbackPayloadSchema = z.object({
  messageId: z.string().min(1),
  feedback: z.enum(['positive', 'negative']),
  query: z.string(),
  response: z.string(),
  comment: z.string().optional(),
});

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

export const LLMErrorPayloadSchema = z.object({
  error: z.string(),
  details: z.record(z.unknown()).optional(),
  stack: z.string().optional(),
});

/**
 * Payload pour les erreurs LLM
 */
export interface LLMErrorPayload {
  error: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export const ToolExecutionPayloadSchema = z.object({
  toolName: z.string().min(1),
  toolInput: z.string(),
  result: z.string(),
  confidence: z.number().min(0).max(1).optional(),
});

/**
 * Payload pour l'exécution d'un outil
 */
export interface ToolExecutionPayload {
  toolName: string;
  toolInput: string;
  result: string;
  confidence?: number;
}

export const ToolErrorPayloadSchema = z.object({
  error: z.string(),
  toolName: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

/**
 * Payload pour les erreurs d'outil
 */
export interface ToolErrorPayload {
  error: string;
  toolName?: string;
  details?: Record<string, unknown>;
}

export const MemoryExportPayloadSchema = z.object({
  data: z.string(),
  itemCount: z.number().min(0),
  timestamp: z.number().min(0),
});

/**
 * Payload pour l'export de mémoire
 */
export interface MemoryExportPayload {
  data: string;
  itemCount: number;
  timestamp: number;
}

export const MemoryImportPayloadSchema = z.object({
  data: z.union([z.string(), z.record(z.unknown())]),
});

/**
 * Payload pour l'import de mémoire
 */
export interface MemoryImportPayload {
  data: string | Record<string, unknown>;
}

export const LLMProgressPayloadSchema = z.object({
  progress: z.number().min(0).max(100),
  text: z.string(),
  loaded: z.number().min(0),
  total: z.number().min(0),
  modelId: z.string().optional(),
});

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

/**
 * Fonction helper pour valider un payload avec gestion d'erreur
 */
export function validatePayload<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new Error(`Invalid payload in ${context}: ${issues}`);
    }
    throw error;
  }
}
