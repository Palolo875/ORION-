/**
 * Agent Code - Spécialisé dans la génération et l'explication de code
 * Utilise CodeGemma-2B avec optimisations (q3)
 * Stratégie: Chargement progressif pour TTFT optimisé
 */

import { BaseAgent } from './base-agent';
import { AgentInput, AgentOutput } from '../types/agent.types';
import { OPTIMIZATION_PRESETS } from '../types/optimization.types';
import { ProgressiveLoader } from '../utils/progressive-loader';

export class CodeAgent extends BaseAgent {
  private engine: unknown = null;
  private optimizationConfig = OPTIMIZATION_PRESETS['code-agent'];
  
  constructor() {
    super({
      id: 'code-agent',
      name: 'Agent Code',
      capabilities: ['code_generation', 'code_explanation'],
      modelSize: OPTIMIZATION_PRESETS['code-agent'].optimizedSize, // ~800 Mo avec q3
      priority: 8,
      modelId: 'CodeGemma-2b-q4f16_1-MLC' // TODO: Utiliser version q3 si disponible
    });
  }
  
  protected async loadModel(): Promise<void> {
    console.log(`[CodeAgent] Chargement du modèle ${this.metadata.modelId}`);
    console.log(`[CodeAgent] Optimisations: ${this.optimizationConfig.quantization}, stratégie: ${this.optimizationConfig.loadingStrategy}`);
    console.log(`[CodeAgent] Sharding: ${this.optimizationConfig.sharding?.numShards} shards, initial: ${this.optimizationConfig.sharding?.initialShards}`);
    
    try {
      // Utiliser le chargement progressif pour un Time To First Token rapide
      const result = await ProgressiveLoader.loadModel(
        this.metadata.modelId,
        this.optimizationConfig.sharding,
        (progress) => {
          console.log(
            `[CodeAgent] ${(progress.progress * 100).toFixed(1)}% - ${progress.message}` +
            (progress.currentShard ? ` (shard ${progress.currentShard}/${progress.totalShards})` : '')
          );
        }
      );
      
      this.engine = result.engine;
      
      // Chargement des shards restants en arrière-plan
      if (result.completeLoading) {
        console.log(`[CodeAgent] Modèle prêt, chargement complémentaire en cours...`);
        result.completeLoading.then(() => {
          console.log(`[CodeAgent] Chargement complémentaire terminé`);
        }).catch((error) => {
          console.warn(`[CodeAgent] Avertissement chargement complémentaire:`, error);
        });
      }
      
      console.log(`[CodeAgent] ✅ Modèle prêt (TTFT: ${result.stats.timeToFirstToken?.toFixed(0)}ms)`);
      console.log(`[CodeAgent] Taille optimisée: ${this.optimizationConfig.optimizedSize} Mo (économie: ${this.optimizationConfig.originalSize - this.optimizationConfig.optimizedSize} Mo)`);
      
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[CodeAgent] Erreur de chargement:`, error);
      throw new Error(`Impossible de charger le modèle de code: ${errMsg}`);
    }
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
      processingTime: 0,
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
