// src/tools/types.ts

/**
 * Types pour l'architecture Tool Worker d'ORION
 * Système d'exécution isolé et sécurisé d'outils
 */

import { z } from 'zod';

/**
 * Catégories d'outils disponibles dans ORION
 */
export type ToolCategory = 
  | 'computation'      // Calculs mathématiques, conversions
  | 'data'            // Analyse de données tabulaires
  | 'code'            // Exécution et validation de code
  | 'search'          // Recherche en mémoire vectorielle
  | 'image'           // Traitement d'images
  | 'visualization'   // Génération de diagrammes
  | 'generation'      // Génération (QR codes, etc.)
  | 'audio'           // Speech-to-Text, Text-to-Speech
  | 'ai';             // Modèles d'IA (vision, creative)

/**
 * Définition d'un outil
 */
export interface ToolDefinition {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  argCount: number;
  examples: string[];
  capabilities: string[];
  validator?: (args: unknown[]) => boolean;
  requiresWorker: boolean; // True si nécessite un Worker dédié
  timeout?: number; // Timeout personnalisé en ms (par défaut 30000)
}

/**
 * Résultat de l'exécution d'un outil
 */
export interface ToolResult {
  success: boolean;
  toolId: string;
  result?: string | Blob | ImageData;
  error?: string;
  executionTime: number;
  metadata?: Record<string, unknown>;
}

/**
 * Message pour l'exécution d'un outil
 */
export interface ToolExecutionMessage {
  type: 'execute_tool';
  toolId: string;
  args: unknown[];
  timeout?: number;
  meta?: {
    traceId: string;
    timestamp: number;
  };
}

/**
 * Message de résultat d'outil
 */
export interface ToolResultMessage {
  type: 'tool_result';
  result: ToolResult;
  meta?: {
    traceId: string;
    timestamp: number;
  };
}

/**
 * État du Tool Gateway
 */
export interface ToolGatewayState {
  activeWorkers: Map<string, Worker>;
  workerPool: Map<string, Worker[]>;
  executionQueue: ToolExecutionMessage[];
  circuitStates: Map<string, CircuitState>;
}

/**
 * État du circuit pour un outil
 */
export interface CircuitState {
  failures: number;
  successes: number;
  consecutiveFailures: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

/**
 * Configuration d'un outil
 */
export interface ToolConfig {
  TIMEOUT: number;
  MAX_RETRIES: number;
  CIRCUIT_FAILURE_THRESHOLD: number;
  CIRCUIT_SUCCESS_THRESHOLD: number;
  CIRCUIT_TIMEOUT: number;
  WORKER_POOL_SIZE: number;
}

/**
 * Schémas de validation Zod
 */
export const ToolExecutionMessageSchema = z.object({
  type: z.literal('execute_tool'),
  toolId: z.string().min(1),
  args: z.array(z.unknown()),
  timeout: z.number().min(100).max(300000).optional(),
  meta: z.object({
    traceId: z.string(),
    timestamp: z.number(),
  }).optional(),
});

export const ToolResultSchema = z.object({
  success: z.boolean(),
  toolId: z.string(),
  result: z.union([z.string(), z.instanceof(Blob), z.instanceof(ImageData)]).optional(),
  error: z.string().optional(),
  executionTime: z.number().min(0),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Arguments pour les différents outils
 */
export interface CalculatorArgs {
  expression: string;
}

export interface DataAnalysisArgs {
  data: string | Blob; // CSV, JSON, ou Excel
  operation: 'parse' | 'aggregate' | 'filter' | 'sort';
  options?: Record<string, unknown>;
}

export interface CodeExecutionArgs {
  code: string;
  language: 'javascript' | 'python';
  timeout?: number;
}

export interface MemorySearchArgs {
  query: string;
  limit?: number;
  threshold?: number;
}

export interface ImageProcessingArgs {
  image: Blob | ImageData;
  operation: 'resize' | 'crop' | 'filter' | 'rotate';
  params: Record<string, unknown>;
}

export interface DiagramArgs {
  code: string;
  type: 'mermaid' | 'graphviz' | 'd2';
}

export interface ConversionArgs {
  value: number | string;
  from: string;
  to: string;
  type: 'unit' | 'currency' | 'temperature';
}

export interface QRCodeArgs {
  data: string;
  type: 'qr' | 'barcode';
  options?: {
    size?: number;
    errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  };
}

export interface TTSArgs {
  text: string;
  voice?: string;
  speed?: number;
  pitch?: number;
}

export interface STTArgs {
  audio: Blob | ArrayBuffer;
  language?: string;
}

export interface VisionArgs {
  image: Blob | ImageData;
  task: 'classify' | 'detect' | 'caption' | 'ocr';
  options?: Record<string, unknown>;
}

export interface ImageGenerationArgs {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
}
