/**
 * Agent de Conversation - Spécialisé dans le dialogue général
 * Utilise Phi-3-Mini avec optimisations agressives (q2/q3)
 * Stratégie: Chargement progressif avec sharding pour TTFT optimisé
 */

import { BaseAgent } from './base-agent';
import { AgentInput, AgentOutput } from '../types/agent.types';
import { OPTIMIZATION_PRESETS } from '../types/optimization.types';
import { ProgressiveLoader } from '../utils/progressive-loader';

export class ConversationAgent extends BaseAgent {
  private engine: unknown = null;
  private optimizationConfig = OPTIMIZATION_PRESETS['conversation-agent'];
  
  constructor() {
    super({
      id: 'conversation-agent',
      name: 'Agent Conversation',
      capabilities: ['conversation', 'creative_writing'],
      modelSize: OPTIMIZATION_PRESETS['conversation-agent'].optimizedSize, // ~1.2 Go avec q3
      priority: 10,
      modelId: 'Phi-3-mini-4k-instruct-q4f16_1-MLC' // TODO: Utiliser version q3 si disponible
    });
  }
  
  protected async loadModel(): Promise<void> {
    console.log(`[ConversationAgent] Chargement du modèle ${this.metadata.modelId}`);
    console.log(`[ConversationAgent] Optimisations: ${this.optimizationConfig.quantization}, stratégie: ${this.optimizationConfig.loadingStrategy}`);
    console.log(`[ConversationAgent] Sharding: ${this.optimizationConfig.sharding?.numShards} shards, chargement initial: ${this.optimizationConfig.sharding?.initialShards} shards`);
    
    try {
      // Utiliser le ProgressiveLoader pour un Time To First Token optimisé
      const result = await ProgressiveLoader.loadModel(
        this.metadata.modelId,
        this.optimizationConfig.sharding,
        (progress) => {
          console.log(
            `[ConversationAgent] ${(progress.progress * 100).toFixed(1)}% - ${progress.message}` +
            (progress.currentShard ? ` (shard ${progress.currentShard}/${progress.totalShards})` : '')
          );
        }
      );
      
      this.engine = result.engine;
      
      // Continuer le chargement des shards restants en arrière-plan
      if (result.completeLoading) {
        console.log(`[ConversationAgent] Modèle prêt pour utilisation, chargement complet en arrière-plan...`);
        result.completeLoading.then(() => {
          console.log(`[ConversationAgent] Tous les shards chargés`);
        }).catch((error) => {
          console.warn(`[ConversationAgent] Avertissement lors du chargement complet:`, error);
        });
      }
      
      console.log(`[ConversationAgent] ✅ Modèle prêt (TTFT: ${result.stats.timeToFirstToken?.toFixed(0)}ms)`);
      console.log(`[ConversationAgent] Taille optimisée: ${this.optimizationConfig.optimizedSize} Mo (économie: ${this.optimizationConfig.originalSize - this.optimizationConfig.optimizedSize} Mo)`);
      
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[ConversationAgent] Erreur de chargement:`, error);
      throw new Error(`Impossible de charger le modèle de conversation: ${errMsg}`);
    }
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
      processingTime: 0, // Calculé par BaseAgent
      metadata: {
        optimizations: {
          quantization: this.optimizationConfig.quantization,
          sharding: this.optimizationConfig.sharding?.enabled,
          estimatedSizeMB: this.optimizationConfig.optimizedSize
        }
      }
    };
  }
}
