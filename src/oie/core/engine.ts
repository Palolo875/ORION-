/**
 * Orion Inference Engine (OIE)
 * Moteur principal qui orchestre les agents spécialisés
 */

import { SimpleRouter } from '../router/simple-router';
import { NeuralRouter } from '../router/neural-router';
import { CacheManager } from '../cache/cache-manager';
import { ConversationAgent } from '../agents/conversation-agent';
import { CodeAgent } from '../agents/code-agent';
import { VisionAgent } from '../agents/vision-agent';
import { LogicalAgent } from '../agents/logical-agent';
import { SpeechToTextAgent } from '../agents/speech-to-text-agent';
import { CreativeAgent } from '../agents/creative-agent';
import { MultilingualAgent } from '../agents/multilingual-agent';
import { IAgent, AgentInput, AgentOutput, type ConversationMessage } from '../types/agent.types';
import { debugLogger } from '../utils/debug-logger';
import { promptGuardrails } from '../../utils/security/promptGuardrails';
import { validateUserInput } from '../../utils/security/inputValidator';
import { circuitBreakerManager } from '../../utils/resilience/circuitBreaker';
import { requestQueue } from '../../utils/resilience/requestQueue';
import { predictiveLoader } from '../../utils/performance/predictiveLoader';
import { telemetry } from '../../utils/monitoring/telemetry';
import { sanitizeContent } from '../../utils/security/sanitizer';

export interface OIEConfig {
  maxMemoryMB?: number;
  maxAgentsInMemory?: number;
  enableVision?: boolean;
  enableCode?: boolean;
  enableSpeech?: boolean;
  enableCreative?: boolean;
  enableMultilingual?: boolean;
  useNeuralRouter?: boolean; // Utiliser le routeur neuronal au lieu du routeur simple
  verboseLogging?: boolean;
  errorReporting?: (error: Error, context: string) => void;
  // Nouvelles options de sécurité et performance
  enableGuardrails?: boolean;
  enableCircuitBreaker?: boolean;
  enableRequestQueue?: boolean;
  enablePredictiveLoading?: boolean;
  enableTelemetry?: boolean;
}

export interface InferOptions {
  conversationHistory?: ConversationMessage[];
  ambientContext?: string;
  forceAgent?: string;
  images?: Array<{ content: string; type: string }>;
  audioData?: Float32Array | ArrayBuffer;
  sampleRate?: number;
  temperature?: number;
  maxTokens?: number;
}

export class OrionInferenceEngine {
  private router: SimpleRouter | NeuralRouter;
  private cacheManager: CacheManager;
  private agentFactories: Map<string, () => IAgent> = new Map();
  private isReady = false;
  private config: OIEConfig;
  private recentAgents: string[] = [];
  
  constructor(config: OIEConfig = {}) {
    this.config = {
      maxMemoryMB: config.maxMemoryMB || 8000,
      maxAgentsInMemory: config.maxAgentsInMemory || 2,
      enableVision: config.enableVision ?? true,
      enableCode: config.enableCode ?? true,
      enableSpeech: config.enableSpeech ?? true,
      enableCreative: config.enableCreative ?? true,
      enableMultilingual: config.enableMultilingual ?? true,
      useNeuralRouter: config.useNeuralRouter ?? true, // Routeur neuronal par défaut
      verboseLogging: config.verboseLogging ?? false,
      errorReporting: config.errorReporting,
      enableGuardrails: config.enableGuardrails ?? true,
      enableCircuitBreaker: config.enableCircuitBreaker ?? true,
      enableRequestQueue: config.enableRequestQueue ?? true,
      enablePredictiveLoading: config.enablePredictiveLoading ?? true,
      enableTelemetry: config.enableTelemetry ?? false, // Opt-in par défaut
    };
    
    // Configurer le mode verbose
    if (this.config.verboseLogging) {
      debugLogger.setVerbose(true);
      debugLogger.logSystemInfo();
    }
    
    // Choisir le routeur selon la configuration
    if (this.config.useNeuralRouter) {
      console.log('[OIE] Utilisation du NeuralRouter (MobileBERT) pour routage intelligent');
      this.router = new NeuralRouter();
    } else {
      console.log('[OIE] Utilisation du SimpleRouter (mots-clés)');
      this.router = new SimpleRouter();
    }
    
    this.cacheManager = new CacheManager({
      maxMemoryMB: this.config.maxMemoryMB,
      maxAgentsInMemory: this.config.maxAgentsInMemory
    });
  }
  
  async initialize(): Promise<void> {
    console.log('[OIE] 🚀 Initialisation du moteur Orion Inference Engine...');
    console.log('[OIE] 💡 Optimisations activées: quantification agressive, sharding, chargement progressif');
    
    // Initialiser le routeur neuronal si nécessaire
    if (this.config.useNeuralRouter && this.router instanceof NeuralRouter) {
      console.log('[OIE] 🧠 Initialisation du NeuralRouter (MobileBERT ~95 Mo)...');
      await this.router.initialize();
      console.log('[OIE] ✅ NeuralRouter prêt - Précision de routage: ~95%');
    }
    
    // Enregistrer les agents disponibles
    console.log('[OIE] 🤖 Enregistrement des agents optimisés...');
    
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
    
    if (this.config.enableMultilingual) {
      this.registerAgent('multilingual-agent', () => new MultilingualAgent());
    }
    
    // Initialiser le pré-chargement prédictif
    if (this.config.enablePredictiveLoading) {
      console.log('[OIE] 🔮 Pré-chargement prédictif activé');
      predictiveLoader.onPreload(async (agentId: string) => {
        const factory = this.agentFactories.get(agentId);
        if (factory) {
          await this.cacheManager.getAgent(agentId, factory);
        }
      });
    }
    
    // Configurer la télémétrie
    if (this.config.enableTelemetry) {
      console.log('[OIE] 📊 Télémétrie anonymisée activée');
      telemetry.setEnabled(true);
      telemetry.trackSystemInfo();
    }
    
    this.isReady = true;
    console.log('[OIE] ✅ Moteur prêt avec optimisations avancées');
    console.log(`[OIE] Agents disponibles: ${Array.from(this.agentFactories.keys()).join(', ')}`);
    console.log('[OIE] Routeur: ' + (this.config.useNeuralRouter ? 'NeuralRouter (neuronal)' : 'SimpleRouter (mots-clés)'));
    console.log('[OIE] 🛡️ Sécurité: Guardrails=' + (this.config.enableGuardrails ? 'ON' : 'OFF') + 
                ', CircuitBreaker=' + (this.config.enableCircuitBreaker ? 'ON' : 'OFF'));
    console.log('[OIE] 🚀 Performance: RequestQueue=' + (this.config.enableRequestQueue ? 'ON' : 'OFF') + 
                ', PredictiveLoading=' + (this.config.enablePredictiveLoading ? 'ON' : 'OFF'));
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
    // Utiliser la file d'attente si activée
    if (this.config.enableRequestQueue) {
      return await requestQueue.enqueue(
        async (signal) => await this.inferInternal(userQuery, options, signal),
        { priority: 1, metadata: { query: userQuery.substring(0, 50) } }
      );
    }
    
    return await this.inferInternal(userQuery, options);
  }
  
  private async inferInternal(
    userQuery: string,
    options?: InferOptions,
    signal?: AbortSignal
  ): Promise<AgentOutput> {
    if (!this.isReady) {
      const error = new Error('[OIE] Moteur non initialisé. Appelez initialize() d\'abord.');
      this.reportError(error, 'initialization');
      throw error;
    }
    
    const startTime = performance.now();
    this.log(`[OIE] 📥 Requête reçue: "${userQuery.substring(0, 80)}${userQuery.length > 80 ? '...' : ''}"`);
    
    // 1. Validation et guardrails
    if (this.config.enableGuardrails) {
      const guardResult = promptGuardrails.validate(userQuery);
      
      if (guardResult.action === 'block') {
        console.warn('[OIE] 🛡️ Prompt bloqué par les guardrails:', guardResult.threats);
        if (this.config.enableTelemetry) {
          telemetry.trackUsage('security', 'prompt_blocked', 1, {
            threats: guardResult.threats
          });
        }
        throw new Error(
          'Votre requête contient des éléments suspects et a été bloquée pour des raisons de sécurité. ' +
          'Veuillez reformuler votre demande.'
        );
      }
      
      if (guardResult.action === 'sanitize') {
        console.warn('[OIE] 🛡️ Prompt sanitizé:', guardResult.threats);
        userQuery = guardResult.sanitized;
      }
    }
    
    // 2. Validation de l'input
    const validationResult = validateUserInput(userQuery, {
      maxLength: 10000,
      context: 'OIE.infer'
    });
    
    if (validationResult.blocked) {
      console.warn('[OIE] ⚠️ Input bloqué:', validationResult.warnings);
      throw new Error('Votre requête contient des éléments non valides.');
    }
    
    if (validationResult.warnings.length > 0) {
      console.warn('[OIE] ⚠️ Avertissements:', validationResult.warnings);
    }
    
    userQuery = validationResult.sanitized;
    
    // 3. Vérifier si la requête a été annulée
    if (signal?.aborted) {
      throw new Error('Request aborted');
    }
    
    try {
      // 1. Routage - Déterminer quel agent utiliser
      let agentId: string;
      
      if (options?.forceAgent) {
        agentId = options.forceAgent;
        console.log(`[OIE] 🎯 Agent forcé: ${agentId}`);
      } else {
        const hasImages = !!(options?.images && options.images.length > 0);
        const hasAudio = !!(options?.audioData);
        
        // Utiliser la méthode appropriée selon le type de routeur
        let decision;
        if (this.router instanceof NeuralRouter) {
          decision = await this.router.route(userQuery, {
            hasImages,
            hasAudio,
            conversationHistory: options?.conversationHistory,
          });
        } else {
          decision = await (this.router as SimpleRouter).routeWithContext(userQuery, {
            hasImages,
            hasAudio,
            conversationHistory: options?.conversationHistory,
          });
        }
        
        agentId = decision.selectedAgent;
        console.log(`[OIE] 🧭 Routage: ${agentId} (confiance: ${(decision.confidence * 100).toFixed(0)}%)`);
        console.log(`[OIE] 💭 Raisonnement: ${decision.reasoning}`);
      }
      
      // 2. Obtenir l'agent (depuis le cache ou chargement)
      const factory = this.agentFactories.get(agentId);
      if (!factory) {
        throw new Error(`[OIE] Agent introuvable: ${agentId}`);
      }
      
      // Obtenir l'agent avec circuit-breaker si activé
      let agent: IAgent;
      if (this.config.enableCircuitBreaker) {
        const breaker = circuitBreakerManager.getBreaker(`agent-${agentId}`, {
          failureThreshold: 3,
          resetTimeout: 30000,
          requestTimeout: 60000
        });
        
        agent = await breaker.execute(
          async () => await this.cacheManager.getAgent(agentId, factory),
          async () => {
            // Fallback: essayer l'agent de conversation
            console.log('[OIE] 🔄 Circuit-breaker: fallback vers conversation-agent');
            const fallbackFactory = this.agentFactories.get('conversation-agent');
            if (fallbackFactory) {
              return await this.cacheManager.getAgent('conversation-agent', fallbackFactory);
            }
            throw new Error('Aucun agent de secours disponible');
          }
        );
      } else {
        agent = await this.cacheManager.getAgent(agentId, factory);
      }
      
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
        (input as AgentInput & { audioData?: Float32Array | ArrayBuffer; sampleRate?: number }).audioData = options.audioData;
        (input as AgentInput & { audioData?: Float32Array | ArrayBuffer; sampleRate?: number }).sampleRate = options.sampleRate;
      }
      
      // 4. Traiter la requête avec circuit-breaker
      console.log(`[OIE] ⚙️ Traitement en cours...`);
      let output: AgentOutput;
      
      if (this.config.enableCircuitBreaker) {
        const breaker = circuitBreakerManager.getBreaker(`inference-${agentId}`, {
          failureThreshold: 3,
          resetTimeout: 30000,
          requestTimeout: 90000
        });
        
        output = await breaker.execute(
          async () => await agent.process(input)
        );
      } else {
        output = await agent.process(input);
      }
      
      // 5. Sanitizer la sortie pour éviter XSS
      output.content = sanitizeContent(output.content, { allowMarkdown: true });
      
      // 6. Enregistrer l'agent utilisé pour le pré-chargement prédictif
      this.recentAgents.push(agentId);
      if (this.recentAgents.length > 10) {
        this.recentAgents.shift(); // Garder seulement les 10 derniers
      }
      
      // 7. Pré-charger le prochain agent probable (en arrière-plan)
      if (this.config.enablePredictiveLoading) {
        predictiveLoader.predictNext({
          currentAgent: agentId,
          lastUserInput: userQuery,
          recentAgents: this.recentAgents,
          conversationHistory: options?.conversationHistory
        }).catch(error => {
          console.warn('[OIE] 🔮 Erreur pré-chargement prédictif:', error);
        });
      }
      
      // 8. Si c'était une transcription audio, re-traiter avec l'agent de conversation
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
      
      // 9. Tracker les performances si télémétrie activée
      if (this.config.enableTelemetry) {
        telemetry.trackPerformance('inference_time', totalTime, 'ms', agentId);
        telemetry.trackUsage('inference', 'completed', 1, {
          agentId,
          processingTime: output.processingTime
        });
      }
      
      return output;
      
    } catch (error: unknown) {
      const totalTime = performance.now() - startTime;
      console.error(`[OIE] ❌ Erreur après ${totalTime.toFixed(0)}ms:`, error);
      
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      // Tracker l'erreur dans la télémétrie
      if (this.config.enableTelemetry) {
        telemetry.trackError(errorObj, 'OIE.infer', {
          totalTime,
          hasImages: !!(options?.images && options.images.length > 0)
        });
      }
      
      // Enrichir l'erreur avec du contexte
      const enrichedError = this.enrichError(errorObj, {
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
        } catch (fallbackError: unknown) {
          const fallbackErrObj = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
          console.error(`[OIE] ❌ Échec du fallback:`, fallbackErrObj);
          this.reportError(fallbackErrObj, 'fallback');
          
          // Retourner une erreur structurée à l'utilisateur
          throw new Error(
            `Désolé, une erreur est survenue lors du traitement de votre requête. ` +
            `Détails: ${errorObj.message || 'Erreur inconnue'}`
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
  private enrichError(error: Error, context: Record<string, unknown>): Error {
    const enriched = new Error(error.message);
    enriched.name = error.name;
    enriched.stack = error.stack;
    (enriched as Error & { context?: Record<string, unknown>; originalError?: Error }).context = context;
    (enriched as Error & { context?: Record<string, unknown>; originalError?: Error }).originalError = error;
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
  private log(message: string, ...args: unknown[]): void {
    if (this.config.verboseLogging) {
      console.log(message, ...args);
    } else {
      console.log(message);
    }
  }
}
