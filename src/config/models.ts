// src/config/models.ts

/**
 * Configuration des modèles LLM disponibles pour ORION
 */

export interface ModelConfig {
  id: string;
  name: string;
  size: number; // en bytes
  quality: 'basic' | 'high' | 'very-high';
  speed: 'very-fast' | 'fast' | 'moderate';
  description: string;
  maxTokens: number;
  recommended: boolean;
}

export const MODELS: Record<'demo' | 'standard' | 'advanced', ModelConfig> = {
  demo: {
    id: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC',
    name: 'Démo Rapide',
    size: 550 * 1024 * 1024, // ~550MB
    quality: 'basic',
    speed: 'very-fast',
    description: 'Modèle léger pour découvrir ORION instantanément',
    maxTokens: 2048,
    recommended: false,
  },
  standard: {
    id: 'Phi-3-mini-4k-instruct-q4f16_1-MLC',
    name: 'Standard (Recommandé)',
    size: 2 * 1024 * 1024 * 1024, // 2GB
    quality: 'high',
    speed: 'fast',
    description: 'Modèle recommandé avec le meilleur compromis qualité/performance',
    maxTokens: 4096,
    recommended: true,
  },
  advanced: {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    name: 'Avancé',
    size: 1.9 * 1024 * 1024 * 1024, // 1.9GB
    quality: 'very-high',
    speed: 'moderate',
    description: 'Performances maximales pour des tâches complexes',
    maxTokens: 8192,
    recommended: false,
  },
};

export const DEFAULT_MODEL = 'standard';

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}
