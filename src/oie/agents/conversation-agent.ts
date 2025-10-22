/**
 * Agent de Conversation - Spécialisé dans le dialogue général
 * Utilise le worker LLM existant d'ORION
 */

import { BaseAgent } from './base-agent';
import { AgentInput, AgentOutput } from '../types/agent.types';
import { WebWorkerMLCEngine } from '@mlc-ai/web-llm';

export class ConversationAgent extends BaseAgent {
  private engine: any = null;
  
  constructor() {
    super({
      id: 'conversation-agent',
      name: 'Agent Conversation',
      capabilities: ['conversation', 'creative_writing'],
      modelSize: 2048, // ~2GB pour Phi-3
      priority: 10,
      modelId: 'Phi-3-mini-4k-instruct-q4f16_1-MLC'
    });
  }
  
  protected async loadModel(): Promise<void> {
    console.log(`[ConversationAgent] Chargement du modèle ${this.metadata.modelId}`);
    
    // @ts-expect-error - WebWorkerMLCEngine types
    this.engine = await WebWorkerMLCEngine.create({
      initProgressCallback: (progress: { progress: number; text: string }) => {
        console.log(`[ConversationAgent] ${(progress.progress * 100).toFixed(1)}% - ${progress.text}`);
      }
    });
    
    await this.engine.reload(this.metadata.modelId);
    console.log(`[ConversationAgent] Modèle chargé`);
  }
  
  protected async unloadModel(): Promise<void> {
    if (this.engine) {
      this.engine = null;
    }
  }
  
  protected async processInternal(input: AgentInput): Promise<AgentOutput> {
    // Construire le prompt avec contexte
    let prompt = input.content;
    
    if (input.context?.ambientContext) {
      prompt = `${input.context.ambientContext}\n\n${prompt}`;
    }
    
    // Construire l'historique de conversation
    const messages: Array<{role: string; content: string}> = [];
    
    // Ajouter le system prompt
    messages.push({
      role: 'system',
      content: `Tu es l'agent de conversation principal d'ORION, une IA personnelle et locale.
Réponds de manière concise, intelligente et utile.`
    });
    
    // Ajouter l'historique si disponible
    if (input.context?.conversationHistory) {
      messages.push(...input.context.conversationHistory);
    }
    
    // Ajouter le message utilisateur
    messages.push({
      role: 'user',
      content: prompt
    });
    
    // Générer la réponse
    const response = await this.engine.chat.completions.create({
      messages,
      temperature: input.temperature || 0.7,
      max_tokens: input.maxTokens || 1000
    });
    
    return {
      agentId: this.metadata.id,
      content: response.choices[0].message.content,
      confidence: 85,
      processingTime: 0 // Calculé par BaseAgent
    };
  }
}
