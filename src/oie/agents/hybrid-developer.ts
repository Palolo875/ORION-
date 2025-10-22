/**
 * Agent Hybrid Developer - Expert en code multilingue
 * Modèle fusionné: CodeGemma 2B (60%) + Qwen2 1.5B (40%)
 * 
 * Capacités:
 * - Génération de code (Python, JavaScript, TypeScript, C++, Java, etc.)
 * - Explication de code en plusieurs langues
 * - Debugging et optimisation
 * - Support multilingue (FR, EN, ES, DE, IT, PT, ZH, JA, KO, AR)
 * 
 * Créé par: ORION Model Foundry
 * Version: 1.0.0
 */

import { BaseAgent } from './base-agent';
import { AgentInput, AgentOutput } from '../types/agent.types';
import { OPTIMIZATION_PRESETS } from '../types/optimization.types';
import { ProgressiveLoader } from '../utils/progressive-loader';

export class HybridDeveloperAgent extends BaseAgent {
  private engine: unknown = null;
  private optimizationConfig = OPTIMIZATION_PRESETS['hybrid-developer'];
  
  constructor() {
    super({
      id: 'hybrid-developer',
      name: 'Agent Hybrid Developer',
      capabilities: [
        'code_generation',
        'code_explanation',
        'debugging',
        'multilingual',
        'chat'
      ],
      modelSize: OPTIMIZATION_PRESETS['hybrid-developer'].optimizedSize, // ~1.2 GB avec q4
      priority: 9, // Haute priorité - agent polyvalent
      modelId: 'ORION-Dev-Polyglot-v1-q4f16_1-MLC'
    });
  }
  
  protected async loadModel(): Promise<void> {
    console.log(`[HybridDeveloper] Chargement du modèle hybride fusionné`);
    console.log(`[HybridDeveloper] Sources: CodeGemma 2B (60%) + Qwen2 1.5B (40%)`);
    console.log(`[HybridDeveloper] Optimisations: ${this.optimizationConfig.quantization}, stratégie: ${this.optimizationConfig.loadingStrategy}`);
    console.log(`[HybridDeveloper] Sharding: ${this.optimizationConfig.sharding?.numShards} shards, initial: ${this.optimizationConfig.sharding?.initialShards}`);
    
    try {
      // Utiliser le chargement progressif pour un Time To First Token rapide
      const result = await ProgressiveLoader.loadModel(
        this.metadata.modelId,
        this.optimizationConfig.sharding,
        (progress) => {
          console.log(
            `[HybridDeveloper] ${(progress.progress * 100).toFixed(1)}% - ${progress.message}` +
            (progress.currentShard ? ` (shard ${progress.currentShard}/${progress.totalShards})` : '')
          );
        }
      );
      
      this.engine = result.engine;
      
      // Chargement des shards restants en arrière-plan
      if (result.completeLoading) {
        console.log(`[HybridDeveloper] Modèle prêt, chargement complémentaire en cours...`);
        result.completeLoading.then(() => {
          console.log(`[HybridDeveloper] Chargement complémentaire terminé`);
        }).catch((error) => {
          console.warn(`[HybridDeveloper] Avertissement chargement complémentaire:`, error);
        });
      }
      
      console.log(`[HybridDeveloper] ✅ Modèle prêt (TTFT: ${result.stats.timeToFirstToken?.toFixed(0)}ms)`);
      console.log(`[HybridDeveloper] Taille optimisée: ${this.optimizationConfig.optimizedSize} Mo`);
      console.log(`[HybridDeveloper] Économie vs modèles séparés: ${this.optimizationConfig.originalSize - this.optimizationConfig.optimizedSize} Mo (${((1 - this.optimizationConfig.optimizedSize / this.optimizationConfig.originalSize) * 100).toFixed(1)}%)`);
      
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[HybridDeveloper] Erreur de chargement:`, error);
      throw new Error(`Impossible de charger le modèle hybride: ${errMsg}`);
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
        content: `Tu es un développeur expert polyglotte créé par ORION Model Foundry.

Tu combines les capacités de:
- CodeGemma: Expert en génération de code (Python, JavaScript, TypeScript, C++, Java, etc.)
- Qwen2: Expert multilingue (Français, Anglais, Espagnol, Allemand, Italien, Portugais, Chinois, Japonais, Coréen, Arabe)

Tes forces:
✨ Génération de code propre, efficace et bien documenté
✨ Explication de code en plusieurs langues
✨ Debugging et optimisation
✨ Compréhension du contexte multilingue

Fournis des réponses:
- Précises et bien structurées
- Avec des exemples de code quand nécessaire
- Adaptées à la langue de l'utilisateur
- Avec des commentaires dans la langue appropriée`
      },
      {
        role: 'user',
        content: input.content
      }
    ];
    
    const response = await this.engine.chat.completions.create({
      messages,
      temperature: input.temperature || 0.5, // Équilibre entre déterminisme et créativité
      max_tokens: input.maxTokens || 2000
    });
    
    return {
      agentId: this.metadata.id,
      content: response.choices[0].message.content,
      confidence: 88, // Confiance élevée grâce à la fusion de deux experts
      processingTime: 0,
      metadata: {
        fusion: {
          sources: ['CodeGemma 2B', 'Qwen2 1.5B'],
          ratio: '60/40',
          method: 'slerp'
        },
        optimizations: {
          quantization: this.optimizationConfig.quantization,
          sharding: this.optimizationConfig.sharding?.enabled,
          estimatedSizeMB: this.optimizationConfig.optimizedSize,
          savingsVsSeparateModels: `${this.optimizationConfig.originalSize - this.optimizationConfig.optimizedSize}MB (${((1 - this.optimizationConfig.optimizedSize / this.optimizationConfig.originalSize) * 100).toFixed(1)}%)`
        }
      }
    };
  }
}
