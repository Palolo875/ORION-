/**
 * Agent Logique - Spécialisé dans l'analyse logique et structurée
 * Correspond au LOGICAL_AGENT du système de débat existant
 */

import { BaseAgent } from './base-agent';
import { AgentInput, AgentOutput } from '../types/agent.types';
import { WebWorkerMLCEngine } from '@mlc-ai/web-llm';
import { LOGICAL_AGENT } from '@/config/agents';

export class LogicalAgent extends BaseAgent {
  private engine: unknown = null;
  
  constructor() {
    super({
      id: 'logical-agent',
      name: 'Agent Logique',
      capabilities: ['logical_analysis', 'conversation'],
      modelSize: 2048,
      priority: 9,
      modelId: 'Phi-3-mini-4k-instruct-q4f16_1-MLC'
    });
  }
  
  protected async loadModel(): Promise<void> {
    console.log(`[LogicalAgent] Chargement du modèle ${this.metadata.modelId}`);
    
    // Note: Incompatibilité mineure de types dans @mlc-ai/web-llm
    // @ts-expect-error - WebWorkerMLCEngine.create() a des types légèrement incompatibles
    this.engine = await WebWorkerMLCEngine.create({
      initProgressCallback: (progress: { progress: number; text: string }) => {
        console.log(`[LogicalAgent] ${(progress.progress * 100).toFixed(1)}% - ${progress.text}`);
      }
    });
    
    await this.engine.reload(this.metadata.modelId);
    console.log(`[LogicalAgent] Modèle chargé`);
  }
  
  protected async unloadModel(): Promise<void> {
    if (this.engine) {
      this.engine = null;
    }
  }
  
  protected async processInternal(input: AgentInput): Promise<AgentOutput> {
    const messages = [
      {
        role: 'system',
        content: LOGICAL_AGENT.systemPrompt
      },
      {
        role: 'user',
        content: input.content
      }
    ];
    
    const response = await this.engine.chat.completions.create({
      messages,
      temperature: LOGICAL_AGENT.temperature,
      max_tokens: LOGICAL_AGENT.maxTokens
    });
    
    return {
      agentId: this.metadata.id,
      content: response.choices[0].message.content,
      confidence: 92,
      processingTime: 0
    };
  }
}
