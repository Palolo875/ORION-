/**
 * Types pour le système de Raisonnement Structuré
 * 
 * Permet de parser et d'afficher les étapes de raisonnement
 * des agents de manière structurée et traçable.
 */

export type ReasoningStepType = 'observation' | 'analysis' | 'hypothesis' | 'conclusion' | 'perspective' | 'critique';

export interface ReasoningStep {
  id: string;
  stepNumber: number;
  type: ReasoningStepType;
  content: string;
  tags?: string[];
}

export interface AgentOutput {
  agentName: string;
  steps: ReasoningStep[];
  conclusion: string;
  confidence: number; // 0-100
  metadata: {
    tokenCount?: number;
    processingTime?: number;
    model?: string;
  };
}

export interface ParsedReasoning {
  steps: ReasoningStep[];
  conclusion: string;
  confidence: number;
}

export const REASONING_CONSTRAINTS = {
  MIN_STEPS: 1,
  MAX_STEPS: 10,
  DEFAULT_CONFIDENCE: 70,
} as const;
