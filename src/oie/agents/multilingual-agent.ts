/**
 * Agent Multilingue - Spécialisé dans la traduction et conversations multilingues
 * Utilise Qwen2-1.5B avec optimisations agressives (q2/q3)
 * Stratégie: Chargement progressif à la demande
 */

import { BaseAgent } from './base-agent';
import { AgentInput, AgentOutput } from '../types/agent.types';
import { OPTIMIZATION_PRESETS } from '../types/optimization.types';
import { ProgressiveLoader } from '../utils/progressive-loader';

export class MultilingualAgent extends BaseAgent {
  private engine: unknown = null;
  private optimizationConfig = OPTIMIZATION_PRESETS['multilingual-agent'];
  
  constructor() {
    super({
      id: 'multilingual-agent',
      name: 'Agent Multilingue',
      capabilities: ['multilingual', 'conversation'],
      modelSize: OPTIMIZATION_PRESETS['multilingual-agent'].optimizedSize, // ~600 Mo avec q3
      priority: 8,
      modelId: 'Qwen2-1.5B-Instruct-q4f16_1-MLC' // Sera remplacé par q3 si disponible
    });
  }
  
  protected async loadModel(): Promise<void> {
    console.log(`[MultilingualAgent] Chargement du modèle ${this.metadata.modelId}`);
    console.log(`[MultilingualAgent] Optimisations: ${this.optimizationConfig.quantization}, stratégie: ${this.optimizationConfig.loadingStrategy}`);
    
    try {
      // Utiliser le ProgressiveLoader pour un chargement optimisé
      const result = await ProgressiveLoader.loadModel(
        this.metadata.modelId,
        this.optimizationConfig.sharding,
        (progress) => {
          console.log(
            `[MultilingualAgent] ${(progress.progress * 100).toFixed(1)}% - ${progress.message}` +
            (progress.currentShard ? ` (shard ${progress.currentShard}/${progress.totalShards})` : '')
          );
        }
      );
      
      this.engine = result.engine;
      
      // Continuer le chargement en arrière-plan si nécessaire
      if (result.completeLoading) {
        result.completeLoading.then(() => {
          console.log(`[MultilingualAgent] Chargement complet terminé`);
        }).catch((error) => {
          console.warn(`[MultilingualAgent] Erreur lors du chargement complet en arrière-plan:`, error);
        });
      }
      
      console.log(`[MultilingualAgent] Modèle prêt (TTFT: ${result.stats.timeToFirstToken?.toFixed(0)}ms)`);
      
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[MultilingualAgent] Erreur de chargement:`, error);
      throw new Error(`Impossible de charger le modèle multilingue: ${errMsg}`);
    }
  }
  
  protected async unloadModel(): Promise<void> {
    if (this.engine) {
      this.engine = null;
    }
  }
  
  protected async processInternal(input: AgentInput): Promise<AgentOutput> {
    // Construire le prompt avec support multilingue
    const messages: Array<{role: string; content: string}> = [];
    
    // System prompt optimisé pour le multilingue
    messages.push({
      role: 'system',
      content: `Tu es un assistant multilingue expert. Tu peux:
- Traduire entre différentes langues avec précision
- Converser naturellement dans plusieurs langues
- Détecter automatiquement la langue de l'utilisateur
- Expliquer les nuances culturelles et linguistiques

Langues supportées: Français, Anglais, Espagnol, Allemand, Italien, Portugais, Chinois, Japonais, Arabe, et plus.

Réponds dans la langue de l'utilisateur ou dans la langue demandée.`
    });
    
    // Ajouter l'historique si disponible
    if (input.context?.conversationHistory) {
      messages.push(...input.context.conversationHistory);
    }
    
    // Ajouter le message utilisateur
    messages.push({
      role: 'user',
      content: input.content
    });
    
    // Générer la réponse
    const response = await this.engine.chat.completions.create({
      messages,
      temperature: input.temperature || 0.7,
      max_tokens: input.maxTokens || 1500
    });
    
    return {
      agentId: this.metadata.id,
      content: response.choices[0].message.content,
      confidence: 88,
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
  
  /**
   * Détecte la langue du texte (helper optionnel)
   */
  private detectLanguage(text: string): string {
    // Détection simple basée sur les caractères
    // Dans une version avancée, on pourrait utiliser le modèle lui-même
    
    if (/[\u4e00-\u9fa5]/.test(text)) return 'chinois';
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'japonais';
    if (/[\u0600-\u06ff]/.test(text)) return 'arabe';
    if (/[а-яА-Я]/.test(text)) return 'russe';
    
    // Pour les langues latines, analyse des mots courants
    const textLower = text.toLowerCase();
    if (/(the|is|are|and|you|this)/i.test(textLower)) return 'anglais';
    if (/(le|la|les|est|sont|vous|de)/i.test(textLower)) return 'français';
    if (/(el|la|los|las|es|son|de)/i.test(textLower)) return 'espagnol';
    if (/(der|die|das|ist|sind|und)/i.test(textLower)) return 'allemand';
    
    return 'inconnue';
  }
}
