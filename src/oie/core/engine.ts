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
import { SpeechToTextAgent } from '../agents/speech-to-text-agent';
import { CreativeAgent } from '../agents/creative-agent';
import { IAgent, AgentInput, AgentOutput } from '../types/agent.types';
import { debugLogger } from '../utils/debug-logger';

export interface OIEConfig {
  maxMemoryMB?: number;
  maxAgentsInMemory?: number;
  enableVision?: boolean;
  enableCode?: boolean;
  enableSpeech?: boolean;
  enableCreative?: boolean;
  verboseLogging?: boolean;
  errorReporting?: (error: Error, context: string) => void;
}

export interface InferOptions {
  conversationHistory?: any[];
  ambientContext?: string;
  forceAgent?: string;
  images?: Array<{ content: string; type: string }>;
  audioData?: Float32Array | ArrayBuffer;
  sampleRate?: number;
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
      enableSpeech: config.enableSpeech ?? true,
      enableCreative: config.enableCreative ?? true,
      verboseLogging: config.verboseLogging ?? false,
      errorReporting: config.errorReporting,
    };
    
    // Configurer le mode verbose
    if (this.config.verboseLogging) {
      debugLogger.setVerbose(true);
      debugLogger.logSystemInfo();
    }
    
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
    
    if (this.config.enableSpeech) {
      this.registerAgent('speech-to-text-agent', () => new SpeechToTextAgent());
    }
    
    if (this.config.enableCreative) {
      this.registerAgent('creative-agent', () => new CreativeAgent());
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
      const error = new Error('[OIE] Moteur non initialisé. Appelez initialize() d\'abord.');
      this.reportError(error, 'initialization');
      throw error;
    }
    
    const startTime = performance.now();
    this.log(`[OIE] 📥 Requête reçue: "${userQuery.substring(0, 80)}${userQuery.length > 80 ? '...' : ''}"`); 
    
    try {
      // 1. Routage - Déterminer quel agent utiliser
      let agentId: string;
      
      if (options?.forceAgent) {
        agentId = options.forceAgent;
        console.log(`[OIE] 🎯 Agent forcé: ${agentId}`);
      } else {
        const hasImages = !!(options?.images && options.images.length > 0);
        const hasAudio = !!(options?.audioData);
        
        const decision = await this.router.routeWithContext(userQuery, {
          hasImages,
          hasAudio,
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
      
      // Si c'est une requête audio, ajouter les données audio
      if (options?.audioData) {
        (input as any).audioData = options.audioData;
        (input as any).sampleRate = options.sampleRate;
      }
      
      // 4. Traiter la requête
      console.log(`[OIE] ⚙️ Traitement en cours...`);
      const output = await agent.process(input);
      
      // 5. Si c'était une transcription audio, re-traiter avec l'agent de conversation
      if (agentId === 'speech-to-text-agent' && output.content) {
        console.log(`[OIE] 🔄 Transcription terminée, re-routage vers agent de conversation...`);
        console.log(`[OIE] 📝 Texte transcrit: "${output.content.substring(0, 100)}..."`);
        
        // Re-traiter avec le texte transcrit
        return await this.infer(output.content, {
          ...options,
          audioData: undefined, // Retirer les données audio
          sampleRate: undefined,
          forceAgent: undefined // Laisser le routeur décider
        });
      }
      
      const totalTime = performance.now() - startTime;
      console.log(`[OIE] ✅ Réponse générée en ${totalTime.toFixed(0)}ms (traitement: ${output.processingTime.toFixed(0)}ms)`);
      console.log(`[OIE] 📊 Confiance: ${output.confidence}%`);
      
      return output;
      
    } catch (error: any) {
      const totalTime = performance.now() - startTime;
      console.error(`[OIE] ❌ Erreur après ${totalTime.toFixed(0)}ms:`, error);
      
      // Enrichir l'erreur avec du contexte
      const enrichedError = this.enrichError(error, {
        query: userQuery.substring(0, 100),
        agentId: options?.forceAgent,
        hasImages: !!(options?.images && options.images.length > 0),
        timestamp: new Date().toISOString()
      });
      
      this.reportError(enrichedError, 'inference');
      
      // Fallback vers l'agent de conversation si disponible
      if (options?.forceAgent !== 'conversation-agent' && this.agentFactories.has('conversation-agent')) {
        console.log(`[OIE] 🔄 Tentative de fallback vers conversation-agent...`);
        
        try {
          return await this.infer(userQuery, {
            ...options,
            forceAgent: 'conversation-agent',
            images: undefined // Retirer les images pour le fallback
          });
        } catch (fallbackError: any) {
          console.error(`[OIE] ❌ Échec du fallback:`, fallbackError);
          this.reportError(fallbackError, 'fallback');
          
          // Retourner une erreur structurée à l'utilisateur
          throw new Error(
            `Désolé, une erreur est survenue lors du traitement de votre requête. ` +
            `Détails: ${error.message || 'Erreur inconnue'}`
          );
        }
      }
      
      throw enrichedError;
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
  
  /**
   * Enrichit une erreur avec du contexte
   */
  private enrichError(error: Error, context: Record<string, any>): Error {
    const enriched = new Error(error.message);
    enriched.name = error.name;
    enriched.stack = error.stack;
    (enriched as any).context = context;
    (enriched as any).originalError = error;
    return enriched;
  }
  
  /**
   * Rapporte une erreur au système de logging si configuré
   */
  private reportError(error: Error, context: string): void {
    if (this.config.errorReporting) {
      try {
        this.config.errorReporting(error, context);
      } catch (reportingError) {
        console.error('[OIE] Erreur lors du reporting:', reportingError);
      }
    }
  }
  
  /**
   * Log conditionnel selon le mode verbose
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.verboseLogging) {
      console.log(message, ...args);
    } else {
      console.log(message);
    }
  }
}
