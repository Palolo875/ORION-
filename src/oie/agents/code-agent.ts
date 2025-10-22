/**
 * Agent Code - Spécialisé dans la génération et l'explication de code
 * Utilise CodeGemma pour des performances optimales en code
 */

import { BaseAgent } from './base-agent';
import { AgentInput, AgentOutput } from '../types/agent.types';
import { WebWorkerMLCEngine } from '@mlc-ai/web-llm';

export class CodeAgent extends BaseAgent {
  private engine: any = null;
  
  constructor() {
    super({
      id: 'code-agent',
      name: 'Agent Code',
      capabilities: ['code_generation', 'code_explanation'],
      modelSize: 1600, // ~1.6GB pour CodeGemma-2B
      priority: 8,
      modelId: 'CodeGemma-2b-q4f16_1-MLC'
    });
  }
  
  protected async loadModel(): Promise<void> {
    console.log(`[CodeAgent] Chargement du modèle ${this.metadata.modelId}`);
    
    // @ts-expect-error - WebWorkerMLCEngine types
    this.engine = await WebWorkerMLCEngine.create({
      initProgressCallback: (progress: { progress: number; text: string }) => {
        console.log(`[CodeAgent] ${(progress.progress * 100).toFixed(1)}% - ${progress.text}`);
      }
    });
    
    await this.engine.reload(this.metadata.modelId);
    console.log(`[CodeAgent] Modèle chargé`);
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
        content: `Tu es un expert en programmation. Tu aides à générer, expliquer et déboguer du code.
Fournis des réponses précises, bien structurées et avec des exemples de code quand nécessaire.`
      },
      {
        role: 'user',
        content: input.content
      }
    ];
    
    const response = await this.engine.chat.completions.create({
      messages,
      temperature: input.temperature || 0.3, // Plus déterministe pour le code
      max_tokens: input.maxTokens || 2000
    });
    
    return {
      agentId: this.metadata.id,
      content: response.choices[0].message.content,
      confidence: 90,
      processingTime: 0
    };
  }
}
