/**
 * Agent Vision - Spécialisé dans l'analyse d'images
 * Utilise LLaVA ou Phi-3-Vision pour l'analyse multimodale
 */

import { BaseAgent } from './base-agent';
import { AgentInput, AgentOutput } from '../types/agent.types';
import { WebWorkerMLCEngine } from '@mlc-ai/web-llm';

export class VisionAgent extends BaseAgent {
  private engine: any = null;
  
  constructor() {
    super({
      id: 'vision-agent',
      name: 'Agent Vision',
      capabilities: ['image_analysis', 'vision'],
      modelSize: 2400, // ~2.4GB pour Phi-3-Vision
      priority: 7,
      modelId: 'Phi-3-vision-128k-instruct-q4f16_1-MLC'
    });
  }
  
  protected async loadModel(): Promise<void> {
    console.log(`[VisionAgent] Chargement du modèle ${this.metadata.modelId}`);
    
    // @ts-expect-error - WebWorkerMLCEngine types
    this.engine = await WebWorkerMLCEngine.create({
      initProgressCallback: (progress: { progress: number; text: string }) => {
        console.log(`[VisionAgent] ${(progress.progress * 100).toFixed(1)}% - ${progress.text}`);
      }
    });
    
    await this.engine.reload(this.metadata.modelId);
    console.log(`[VisionAgent] Modèle chargé`);
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
    const messageContent: any[] = [
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
      processingTime: 0
    };
  }
}
