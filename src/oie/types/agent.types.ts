/**
 * Types pour le système OIE (Orion Inference Engine)
 * Types des agents spécialisés et leur interface
 */

export type AgentCapability = 
  | 'conversation'
  | 'code_generation'
  | 'code_explanation'
  | 'image_analysis'
  | 'creative_writing'
  | 'logical_analysis'
  | 'critical_thinking'
  | 'synthesis'
  | 'multilingual'
  | 'vision';

export interface AgentMetadata {
  id: string;
  name: string;
  capabilities: AgentCapability[];
  modelSize: number; // MB
  priority: number; // 0-10
  modelId?: string; // ID du modèle WebLLM à utiliser
}

export type AgentState = 'unloaded' | 'loading' | 'ready' | 'busy' | 'error';

export interface AgentInput {
  content: string;
  context?: {
    conversationHistory?: Array<{role: string; content: string}>;
    ambientContext?: string;
  };
  images?: Array<{ content: string; type: string }>; // Support multimodal
  temperature?: number;
  maxTokens?: number;
}

export interface AgentOutput {
  agentId: string;
  content: string;
  confidence: number;
  processingTime: number;
}

export interface IAgent {
  metadata: AgentMetadata;
  state: AgentState;
  load(): Promise<void>;
  unload(): Promise<void>;
  process(input: AgentInput): Promise<AgentOutput>;
}
