// src/workers/llm.worker.ts

/**
 * LLM Worker - Agent de Raisonnement Principal d'ORION
 * 
 * Ce worker gère l'inférence du modèle de langage local.
 * Il utilise @mlc-ai/web-llm pour exécuter des modèles LLM dans le navigateur
 * avec WebGPU pour des performances optimales.
 * 
 * Fonctionnalités:
 * - Chargement et initialisation du modèle LLM
 * - Génération de réponses avec contexte
 * - Changement dynamique de modèle
 * - Gestion des erreurs et fallbacks
 * - Reporting de progression du chargement
 */

import { WebWorkerMLCEngine, MLCEngine, ChatCompletionRequest } from "@mlc-ai/web-llm";
import { WorkerMessage, QueryPayload } from '../types';
import { errorLogger, UserMessages } from '../utils/errorLogger';
import { withRetry, retryStrategies } from '../utils/retry';
import { logger } from '../utils/logger';
import { LLMProgressPayloadSchema, validatePayload } from '../types/worker-payloads';

logger.info('LLMWorker', 'Worker chargé. Prêt à initialiser le moteur');

// Modèle par défaut
let SELECTED_MODEL = "Phi-3-mini-4k-instruct-q4f16_1-MLC";

/**
 * Singleton pour le moteur LLM
 * Garantit que le moteur n'est chargé qu'une seule fois et gère le changement de modèle.
 * Inclut un mécanisme de reset pour éviter la contamination entre personas.
 */
class LLMEngine {
  private static instance: MLCEngine | null = null;
  private static currentModel: string | null = null;
  private static lastAgentType: string | null = null;

  /**
   * Obtient l'instance du moteur LLM (Singleton)
   * @param modelId - ID du modèle à charger (optionnel, utilise le modèle par défaut sinon)
   * @param progress_callback - Callback pour reporter la progression du chargement
   * @returns Instance du moteur LLM
   * @throws Error si le chargement du modèle échoue
   */
  static async getInstance(
    modelId?: string,
    progress_callback?: (progress: { progress: number; text: string; loaded?: number; total?: number }) => void
  ) {
    const targetModel = modelId || SELECTED_MODEL;
    
    // Si le modèle a changé, réinitialiser l'instance
    if (this.instance !== null && this.currentModel !== targetModel) {
      logger.info('LLMWorker', 'Changement de modèle détecté', { from: this.currentModel, to: targetModel });
      this.instance = null;
      this.currentModel = null;
    }
    
    if (this.instance === null) {
      try {
        logger.info('LLMWorker', 'Initialisation du moteur WebLLM');
        
        // Vérifier le support WebGPU
        const hasWebGPU = 'gpu' in navigator;
        if (!hasWebGPU) {
          logger.warn('LLMWorker', 'WebGPU non disponible - tentative avec fallback CPU');
          if (progress_callback) {
            progress_callback({
              progress: 0,
              text: '⚠️ WebGPU non disponible, utilisation du mode CPU (plus lent)',
              loaded: 0,
              total: 0,
            });
          }
        }
        
        // Utiliser withRetry pour l'initialisation du moteur
        this.instance = await withRetry(
          async () => {
            // Utiliser l'engine WebWorkerMLCEngine directement sans sous-worker pour éviter les problèmes de build
            // Note: Les types de @mlc-ai/web-llm ne correspondent pas exactement à l'implémentation
            // @ts-expect-error - Incompatibilité mineure de types dans create() de @mlc-ai/web-llm
            const engine = await WebWorkerMLCEngine.create({
              initProgressCallback: (report: { progress: number; text: string; loaded?: number; total?: number }) => {
                if (progress_callback) {
                  progress_callback(report);
                } else {
                  logger.debug('LLMWorker', 'Chargement en cours', { text: report.text, progress: report.progress });
                }
              },
            });
            return engine;
          },
          {
            ...retryStrategies.llm,
            onRetry: (error, attempt) => {
              logger.warn('LLMWorker', 'Tentative échouée, nouvelle tentative', { attempt, error: error.message });
              if (progress_callback) {
                progress_callback({
                  progress: 0,
                  text: `Nouvelle tentative (${attempt})...`,
                  loaded: 0,
                  total: 0,
                });
              }
            }
          }
        );

        logger.info('LLMWorker', 'Chargement du modèle', { model: targetModel });
        
        // Retry pour le chargement du modèle
        await withRetry(
          async () => {
            await this.instance!.reload(targetModel);
          },
          {
            ...retryStrategies.llm,
            onRetry: (error, attempt) => {
              logger.warn('LLMWorker', 'Chargement du modèle - Tentative échouée', { attempt, error: error.message });
            }
          }
        );
        
        this.currentModel = targetModel;
        logger.info('LLMWorker', 'Moteur et modèle prêts');
      } catch (error) {
        const err = error as Error;
        errorLogger.critical(
          'LLMWorker',
          `Failed to initialize LLM engine: ${err.message}`,
          UserMessages.LLM_LOAD_FAILED,
          err,
          { model: targetModel }
        );
        this.instance = null;
        this.currentModel = null;
        throw new Error(`Échec de l'initialisation du moteur LLM: ${err.message}`);
      }
    }
    return this.instance;
  }
  
  /**
   * Réinitialise l'instance du moteur (utile pour changer de modèle)
   */
  static reset() {
    logger.info('LLMWorker', 'Réinitialisation du moteur');
    this.instance = null;
    this.currentModel = null;
    this.lastAgentType = null;
  }
  
  /**
   * Réinitialise le contexte interne pour éviter la contamination entre agents
   * Note: Avec MLC, on ne peut pas vraiment reset le contexte interne,
   * mais on peut s'assurer que chaque requête est indépendante en utilisant
   * des messages système clairs et en ne gardant pas d'historique.
   */
  static resetContext(agentType?: string) {
    if (agentType && this.lastAgentType && this.lastAgentType !== agentType) {
      logger.info('LLMWorker', "Changement d'agent - contexte réinitialisé", { from: this.lastAgentType, to: agentType });
    }
    this.lastAgentType = agentType || null;
  }
}

// --- Le worker principal ---

self.onmessage = async (event: MessageEvent<WorkerMessage<QueryPayload & { 
  context?: string[]; 
  modelId?: string; 
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  agentType?: string; // Type d'agent pour l'orchestration parallèle
  images?: Array<{ content: string; type: string }>; // Support multimodal - images en base64
  enableVision?: boolean; // Active le mode vision si le modèle le supporte
}>>) => {
  const { type, payload, meta } = event.data;

  if (type === 'set_model') {
    // Permet de changer le modèle
    SELECTED_MODEL = payload.modelId || SELECTED_MODEL;
    logger.info('LLMWorker', 'Modèle sélectionné', { model: SELECTED_MODEL });
    LLMEngine.reset(); // Forcer le rechargement au prochain appel
    self.postMessage({ 
      type: 'model_set', 
      payload: { modelId: SELECTED_MODEL }, 
      meta 
    });
  } else if (type === 'generate_response') {
    try {
      logger.debug('LLMWorker', 'Inférence initiée', undefined, meta?.traceId);
      
      // Réinitialiser le contexte si on change d'agent (éviter contamination)
      LLMEngine.resetContext(payload.agentType);
      
      const engine = await LLMEngine.getInstance(payload.modelId, (progress) => {
        // Valider et envoyer la progression du chargement à l'UI avec plus de détails
        const progressPayload = {
          progress: progress.progress,
          text: progress.text,
          loaded: progress.loaded || 0,
          total: progress.total || 0,
          modelId: payload.modelId,
        };
        
        try {
          const validatedPayload = validatePayload(
            LLMProgressPayloadSchema,
            progressPayload,
            'LLMWorker.loadProgress'
          );
          
          self.postMessage({ 
            type: 'llm_load_progress', 
            payload: validatedPayload, 
            meta 
          });
        } catch (error) {
          logger.error('LLMWorker', 'Invalid progress payload', error);
          // Envoyer quand même sans validation en cas d'erreur
          self.postMessage({ 
            type: 'llm_load_progress', 
            payload: progressPayload, 
            meta 
          });
        }
      });

      // Utiliser le System Prompt personnalisé ou le prompt par défaut
      const defaultSystemPrompt = `Tu es l'agent de raisonnement principal d'ORION, une IA personnelle et locale.
Réponds à la requête de l'utilisateur de manière concise, intelligente et utile.`;

      const systemPrompt = payload.systemPrompt || defaultSystemPrompt;
      
      const contextStr = payload.context && payload.context.length > 0 
        ? `\n\nContexte pertinent trouvé dans ta mémoire:\n${payload.context.join('\n- ')}`
        : '';
      
      // Construire le message avec support multimodal
      let messageContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
      
      if (payload.images && payload.images.length > 0 && payload.enableVision) {
        // Mode multimodal - images + texte
        logger.info('LLMWorker', 'Mode vision activé avec images', { imageCount: payload.images.length });
        
        messageContent = [
          {
            type: "text",
            text: `${systemPrompt}${contextStr}\n\nRequête de l'utilisateur:\n"${payload.query}"\n\nTa réponse:`
          },
          ...payload.images.map(img => ({
            type: "image_url",
            image_url: {
              url: img.content // Base64 data URL
            }
          }))
        ];
      } else {
        // Mode texte standard
        messageContent = `${systemPrompt}${contextStr}\n\nRequête de l'utilisateur:\n"${payload.query}"\n\nTa réponse:`;
      }

      const request: ChatCompletionRequest = {
        messages: [{ 
          role: "user", 
          content: messageContent
        }] as ChatCompletionRequest['messages'],
        max_tokens: payload.maxTokens || 256,
        temperature: payload.temperature !== undefined ? payload.temperature : 0.7,
        top_p: 0.95,
        stream: false, // Pour l'instant, streaming désactivé (à implémenter)
      };

      // Utiliser retry pour l'inférence
      const responseText = await withRetry(
        async () => {
          const llmResponse = await engine.chat.completions.create(request);
          // Vérifier que c'est une ChatCompletion et non un AsyncIterable
          if (!llmResponse || typeof llmResponse === 'object' && Symbol.asyncIterator in llmResponse) {
            throw new Error('Streaming response received but streaming is disabled');
          }
          const text = llmResponse.choices[0].message.content;
          if (!text || text.trim().length === 0) {
            throw new Error('Empty response from LLM');
          }
          return text;
        },
        {
          maxAttempts: 2, // Moins de retries pour l'inférence (c'est plus rapide)
          initialDelay: 1000,
          maxDelay: 3000,
          backoffFactor: 1.5,
          onRetry: (error, attempt) => {
            logger.warn('LLMWorker', 'Inférence - Tentative échouée', { attempt, error: error.message }, meta?.traceId);
          }
        }
      );

      self.postMessage({ 
        type: 'llm_response_complete', 
        payload: { 
          response: responseText,
          agentType: payload.agentType // Inclure le type d'agent dans la réponse
        }, 
        meta 
      });

    } catch (error) {
      const err = error as Error;
      const errorMessage = err.message || 'Erreur inconnue';
      const errorStack = err.stack;
      
      errorLogger.error(
        'LLMWorker',
        `Inference error: ${errorMessage}`,
        UserMessages.LLM_INFERENCE_FAILED,
        err,
        {
          query: payload.query?.substring(0, 100),
          traceId: meta?.traceId,
          systemPrompt: payload.systemPrompt?.substring(0, 50)
        }
      );
      
      // Envoyer une erreur détaillée pour le debugging
      self.postMessage({ 
        type: 'llm_error', 
        payload: { 
          error: UserMessages.LLM_INFERENCE_FAILED,
          details: {
            technicalError: errorMessage,
            stack: errorStack,
            query: payload.query?.substring(0, 100) + '...', // Limiter la taille
            timestamp: Date.now()
          }
        }, 
        meta 
      });
    }
  } else if (type === 'init') {
    logger.info('LLMWorker', 'Worker initialized');
    self.postMessage({ 
      type: 'init_complete',
      payload: {},
      meta
    });
  }
};
