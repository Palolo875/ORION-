/**
 * Routeur Neuronal avec MobileBERT
 * Classification d'intention zero-shot ultra-rapide
 * Note: Fonctionnalité avancée - nécessite Transformers.js
 */

import { DetectedIntent, RoutingDecision } from '../types/router.types';
import { AgentMetadata } from '../types/agent.types';

export class NeuralRouter {
  private model: any = null;
  private agents: Map<string, AgentMetadata> = new Map();
  private isReady = false;
  
  constructor() {
    console.log('[NeuralRouter] Initialisation du routeur neuronal');
  }
  
  /**
   * Initialise le modèle MobileBERT
   */
  async initialize(): Promise<void> {
    console.log('[NeuralRouter] Chargement de MobileBERT...');
    console.warn('[NeuralRouter] ⚠️ Nécessite @huggingface/transformers.js - mode simulation');
    
    try {
      // TODO: Implémenter avec transformers.js
      // const { pipeline } = await import('@huggingface/transformers');
      // this.model = await pipeline('zero-shot-classification', 'typeform/mobilebert-uncased-mnli');
      
      // Mode simulation pour l'instant
      this.model = { status: 'simulation' };
      this.isReady = true;
      
      console.log('[NeuralRouter] ⚠️ Mode simulation actif');
      
    } catch (error) {
      console.error('[NeuralRouter] Erreur d\'initialisation:', error);
      throw error;
    }
  }
  
  registerAgent(metadata: AgentMetadata): void {
    this.agents.set(metadata.id, metadata);
    console.log(`[NeuralRouter] Agent enregistré: ${metadata.name}`);
  }
  
  /**
   * Route la requête avec classification neuronale
   */
  async route(userQuery: string): Promise<RoutingDecision> {
    if (!this.isReady) {
      console.warn('[NeuralRouter] Non initialisé - utilisation du fallback');
      return this.fallbackRoute(userQuery);
    }
    
    // Mode simulation - utiliser la détection par mots-clés
    if (this.model.status === 'simulation') {
      return this.fallbackRoute(userQuery);
    }
    
    // TODO: Implémentation réelle avec MobileBERT
    // const labels = Array.from(this.agents.keys());
    // const result = await this.model(userQuery, labels, {
    //   multi_label: false
    // });
    
    // return {
    //   selectedAgent: result.labels[0],
    //   confidence: result.scores[0],
    //   reasoning: `Classification neuronale: ${result.labels[0]} (${(result.scores[0] * 100).toFixed(1)}%)`
    // };
    
    return this.fallbackRoute(userQuery);
  }
  
  /**
   * Détection d'intentions avec le modèle neuronal
   */
  async detectIntent(userQuery: string): Promise<DetectedIntent> {
    const capabilities = [
      'conversation',
      'code_generation',
      'code_explanation',
      'image_analysis',
      'creative_writing',
      'logical_analysis',
      'multilingual'
    ];
    
    // TODO: Utiliser MobileBERT pour classification
    // const result = await this.model(userQuery, capabilities);
    
    // Pour l'instant, fallback simple
    const query = userQuery.toLowerCase();
    
    if (/code|fonction|programme/.test(query)) {
      return {
        capability: 'code_generation',
        confidence: 0.85,
        suggestedAgent: 'code-agent'
      };
    }
    
    if (/image|photo|picture/.test(query)) {
      return {
        capability: 'image_analysis',
        confidence: 0.9,
        suggestedAgent: 'vision-agent'
      };
    }
    
    if (/tradui|translate|语言|langue/.test(query)) {
      return {
        capability: 'multilingual',
        confidence: 0.88,
        suggestedAgent: 'multilingual-agent'
      };
    }
    
    return {
      capability: 'conversation',
      confidence: 0.7,
      suggestedAgent: 'conversation-agent'
    };
  }
  
  /**
   * Routage de secours par mots-clés
   */
  private fallbackRoute(userQuery: string): RoutingDecision {
    const query = userQuery.toLowerCase();
    
    // Règles simples
    if (/code|fonction|script|programme/.test(query)) {
      return {
        selectedAgent: 'code-agent',
        confidence: 0.85,
        reasoning: 'Détection par mots-clés: code'
      };
    }
    
    if (/image|photo|picture/.test(query)) {
      return {
        selectedAgent: 'vision-agent',
        confidence: 0.9,
        reasoning: 'Détection par mots-clés: image'
      };
    }
    
    if (/tradui|translate|语言/.test(query)) {
      return {
        selectedAgent: 'multilingual-agent',
        confidence: 0.88,
        reasoning: 'Détection par mots-clés: multilingual'
      };
    }
    
    if (/analyse|logique|raisonnement/.test(query)) {
      return {
        selectedAgent: 'logical-agent',
        confidence: 0.82,
        reasoning: 'Détection par mots-clés: logique'
      };
    }
    
    return {
      selectedAgent: 'conversation-agent',
      confidence: 0.7,
      reasoning: 'Agent par défaut'
    };
  }
}
