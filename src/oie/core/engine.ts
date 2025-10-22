/**
 * Orion Inference Engine (OIE)
 * Moteur principal qui orchestre les agents spécialisés
 */

import { SimpleRouter } from '../router/simple-router';
import { CacheManager } from '../cache/cache-manager';
import { ConversationAgent } from '../agents/conversation-agent';
import { CodeAgent } from '../agents/code-agent';
import { VisionAgent } from '../agents/vision-agent';
import { LogicalAgent } from '../agents/logical-agent';
import { IAgent, AgentInput, AgentOutput } from '../types/agent.types';

export interface OIEConfig {
  maxMemoryMB?: number;
  maxAgentsInMemory?: number;
  enableVision?: boolean;
  enableCode?: boolean;
}

export interface InferOptions {
  conversationHistory?: any[];
  ambientContext?: string;
  forceAgent?: string;
  images?: Array<{ content: string; type: string }>;
  temperature?: number;
  maxTokens?: number;
}

export class OrionInferenceEngine {
  private router: SimpleRouter;
  private cacheManager: CacheManager;
  private agentFactories: Map<string, () => IAgent> = new Map();
  private isReady = false;
  private config: OIEConfig;
  
  constructor(config: OIEConfig = {}) {
    this.config = {
      maxMemoryMB: config.maxMemoryMB || 8000,
      maxAgentsInMemory: config.maxAgentsInMemory || 2,
      enableVision: config.enableVision ?? true,
      enableCode: config.enableCode ?? true,
    };
    
    this.router = new SimpleRouter();
    this.cacheManager = new CacheManager({
      maxMemoryMB: this.config.maxMemoryMB,
      maxAgentsInMemory: this.config.maxAgentsInMemory
    });
  }
  
  async initialize(): Promise<void> {
    console.log('[OIE] 🚀 Initialisation du moteur Orion Inference Engine...');
    
    // Enregistrer les agents disponibles
    this.registerAgent('conversation-agent', () => new ConversationAgent());
    this.registerAgent('logical-agent', () => new LogicalAgent());
    
    if (this.config.enableCode) {
      this.registerAgent('code-agent', () => new CodeAgent());
    }
    
    if (this.config.enableVision) {
      this.registerAgent('vision-agent', () => new VisionAgent());
    }
    
    this.isReady = true;
    console.log('[OIE] ✅ Moteur prêt');
    console.log(`[OIE] Agents disponibles: ${Array.from(this.agentFactories.keys()).join(', ')}`);
  }
  
  private registerAgent(id: string, factory: () => IAgent): void {
    this.agentFactories.set(id, factory);
    const tempAgent = factory();
    this.router.registerAgent(tempAgent.metadata);
  }
  
  async infer(
    userQuery: string,
    options?: InferOptions
  ): Promise<AgentOutput> {
    if (!this.isReady) {
      throw new Error('[OIE] Moteur non initialisé. Appelez initialize() d\'abord.');
    }
    
    const startTime = performance.now();
    console.log(`[OIE] 📥 Requête reçue: "${userQuery.substring(0, 80)}${userQuery.length > 80 ? '...' : ''}"`);
    
    try {
      // 1. Routage - Déterminer quel agent utiliser
      let agentId: string;
      
      if (options?.forceAgent) {
        agentId = options.forceAgent;
        console.log(`[OIE] 🎯 Agent forcé: ${agentId}`);
      } else {
        const hasImages = !!(options?.images && options.images.length > 0);
        const decision = await this.router.routeWithContext(userQuery, {
          hasImages,
          conversationHistory: options?.conversationHistory,
        });
        
        agentId = decision.selectedAgent;
        console.log(`[OIE] 🧭 Routage: ${agentId} (confiance: ${(decision.confidence * 100).toFixed(0)}%)`);
        console.log(`[OIE] 💭 Raisonnement: ${decision.reasoning}`);
      }
      
      // 2. Obtenir l'agent (depuis le cache ou chargement)
      const factory = this.agentFactories.get(agentId);
      if (!factory) {
        throw new Error(`[OIE] Agent introuvable: ${agentId}`);
      }
      
      const agent = await this.cacheManager.getAgent(agentId, factory);
      console.log(`[OIE] 🤖 Agent obtenu: ${agent.metadata.name} (état: ${agent.state})`);
      
      // 3. Préparer l'input
      const input: AgentInput = {
        content: userQuery,
        context: {
          conversationHistory: options?.conversationHistory,
          ambientContext: options?.ambientContext
        },
        images: options?.images,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens
      };
      
      // 4. Traiter la requête
      console.log(`[OIE] ⚙️ Traitement en cours...`);
      const output = await agent.process(input);
      
      const totalTime = performance.now() - startTime;
      console.log(`[OIE] ✅ Réponse générée en ${totalTime.toFixed(0)}ms (traitement: ${output.processingTime.toFixed(0)}ms)`);
      console.log(`[OIE] 📊 Confiance: ${output.confidence}%`);
      
      return output;
      
    } catch (error: any) {
      const totalTime = performance.now() - startTime;
      console.error(`[OIE] ❌ Erreur après ${totalTime.toFixed(0)}ms:`, error);
      
      // Fallback vers l'agent de conversation si disponible
      if (options?.forceAgent !== 'conversation-agent') {
        console.log(`[OIE] 🔄 Tentative de fallback vers conversation-agent...`);
        
        try {
          return await this.infer(userQuery, {
            ...options,
            forceAgent: 'conversation-agent',
            images: undefined // Retirer les images pour le fallback
          });
        } catch (fallbackError) {
          console.error(`[OIE] ❌ Échec du fallback:`, fallbackError);
        }
      }
      
      throw error;
    }
  }
  
  async shutdown(): Promise<void> {
    console.log('[OIE] 🔌 Arrêt du moteur...');
    await this.cacheManager.unloadAll();
    this.isReady = false;
    console.log('[OIE] ✅ Moteur arrêté');
  }
  
  /**
   * Obtient des statistiques sur l'état du cache
   */
  getStats() {
    return this.cacheManager.getStats();
  }
  
  /**
   * Vérifie si le moteur est prêt
   */
  isEngineReady(): boolean {
    return this.isReady;
  }
  
  /**
   * Liste les agents disponibles
   */
  getAvailableAgents(): string[] {
    return Array.from(this.agentFactories.keys());
  }
}
