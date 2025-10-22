/**
 * Agent Vision - Spécialisé dans l'analyse d'images
 * Utilise LLaVA-v1.5 ou Phi-3-Vision avec optimisations prudentes (q3)
 * Stratégie: Chargement complet à la demande avec sharding partiel (LLM uniquement)
 */

import { BaseAgent } from './base-agent';
import { AgentInput, AgentOutput } from '../types/agent.types';
import { OPTIMIZATION_PRESETS } from '../types/optimization.types';
import type { MultimodalMessageContent } from '../types/transformers.types';
import { ProgressiveLoader } from '../utils/progressive-loader';

export class VisionAgent extends BaseAgent {
  private engine: unknown = null;
  private optimizationConfig = OPTIMIZATION_PRESETS['vision-agent'];
  
  constructor() {
    super({
      id: 'vision-agent',
      name: 'Agent Vision',
      capabilities: ['image_analysis', 'vision'],
      modelSize: OPTIMIZATION_PRESETS['vision-agent'].optimizedSize, // ~3 Go avec q3 prudent
      priority: 7,
      modelId: 'Phi-3-vision-128k-instruct-q4f16_1-MLC' // TODO: Version q3 si validée
    });
  }
  
  protected async loadModel(): Promise<void> {
    console.log(`[VisionAgent] Chargement du modèle ${this.metadata.modelId}`);
    console.log(`[VisionAgent] Optimisations: ${this.optimizationConfig.quantization} (prudent pour préserver qualité visuelle)`);
    console.log(`[VisionAgent] Stratégie: ${this.optimizationConfig.loadingStrategy}`);
    console.log(`[VisionAgent] Sharding partiel: Uniquement sur le LLM, encodeur d'images chargé complètement`);
    
    try {
      // Pour les modèles de vision, l'utilisateur est prêt à attendre
      // car il fait l'effort d'uploader une image
      // On charge donc complètement avec affichage de progression clair
      
      const result = await ProgressiveLoader.loadModel(
        this.metadata.modelId,
        this.optimizationConfig.sharding,
        (progress) => {
          // Affichage détaillé pour que l'utilisateur comprenne que ça charge
          let message = progress.message;
          
          if (progress.phase === 'downloading') {
            message = `📥 Téléchargement du modèle de vision...`;
          } else if (progress.phase === 'loading_shard') {
            if (progress.currentShard === 1) {
              message = `🔍 Chargement encodeur d'images...`;
            } else {
              message = `🧠 Chargement LLM (shard ${progress.currentShard}/${progress.totalShards})...`;
            }
          }
          
          console.log(`[VisionAgent] ${(progress.progress * 100).toFixed(1)}% - ${message}`);
        }
      );
      
      this.engine = result.engine;
      
      // Pour VisionAgent, on attend le chargement complet avant de considérer prêt
      if (result.completeLoading) {
        await result.completeLoading;
        console.log(`[VisionAgent] Modèle complètement chargé`);
      }
      
      console.log(`[VisionAgent] ✅ Modèle prêt (temps total: ${result.stats.totalTime?.toFixed(0)}ms)`);
      console.log(`[VisionAgent] Taille optimisée: ${this.optimizationConfig.optimizedSize} Mo (économie: ${this.optimizationConfig.originalSize - this.optimizationConfig.optimizedSize} Mo)`);
      console.log(`[VisionAgent] ⚠️ Quantification prudente pour préserver la qualité des analyses visuelles`);
      
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[VisionAgent] Erreur de chargement:`, error);
      throw new Error(`Impossible de charger le modèle de vision: ${errMsg}`);
    }
  }
  
  protected async unloadModel(): Promise<void> {
    if (this.engine) {
      this.engine = null;
    }
  }
  
  protected async processInternal(input: AgentInput): Promise<AgentOutput> {
    // Vérifier si des images sont fournies
    if (!input.images || input.images.length === 0) {
      throw new Error('VisionAgent nécessite au moins une image');
    }
    
    // Construire le message multimodal
    const messageContent: MultimodalMessageContent[] = [
      {
        type: "text",
        text: input.content
      }
    ];
    
    // Ajouter les images
    for (const img of input.images) {
      messageContent.push({
        type: "image_url",
        image_url: {
          url: img.content // Base64 data URL
        }
      });
    }
    
    const messages = [
      {
        role: 'system',
        content: `Tu es un expert en analyse d'images. Tu décris les images avec précision et réponds aux questions sur leur contenu.`
      },
      {
        role: 'user',
        content: messageContent
      }
    ];
    
    const response = await this.engine.chat.completions.create({
      messages,
      temperature: input.temperature || 0.5,
      max_tokens: input.maxTokens || 1500
    });
    
    return {
      agentId: this.metadata.id,
      content: response.choices[0].message.content,
      confidence: 88,
      processingTime: 0,
      metadata: {
        optimizations: {
          quantization: this.optimizationConfig.quantization,
          sharding: 'partial', // Sharding uniquement sur le LLM
          estimatedSizeMB: this.optimizationConfig.optimizedSize,
          note: 'Quantification prudente pour préserver qualité visuelle'
        }
      }
    };
  }
}
