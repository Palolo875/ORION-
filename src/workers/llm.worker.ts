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

console.log("[LLM] Worker chargé. Prêt à initialiser le moteur.")

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
      console.log(`[LLM] Changement de modèle détecté: ${this.currentModel} → ${targetModel}`);
      this.instance = null;
      this.currentModel = null;
    }
    
    if (this.instance === null) {
      try {
        console.log("[LLM] Initialisation du moteur WebLLM...");
        
        // Utiliser withRetry pour l'initialisation du moteur
        this.instance = await withRetry(
          async () => {
            // Utiliser l'engine WebWorkerMLCEngine directement sans sous-worker pour éviter les problèmes de build
            // @ts-expect-error - Le type peut ne pas correspondre exactement mais cela fonctionne
            const engine = await WebWorkerMLCEngine.create({
              initProgressCallback: (report: { progress: number; text: string; loaded?: number; total?: number }) => {
                if (progress_callback) {
                  progress_callback(report);
                } else {
                  console.log(`[LLM] ${report.text} - ${report.progress.toFixed(1)}%`);
                }
              },
            });
            return engine;
          },
          {
            ...retryStrategies.llm,
            onRetry: (error, attempt) => {
              console.warn(`[LLM] Tentative ${attempt} échouée, nouvelle tentative...`, error.message);
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

        console.log(`[LLM] Chargement du modèle: ${targetModel}...`);
        
        // Retry pour le chargement du modèle
        await withRetry(
          async () => {
            await this.instance!.reload(targetModel);
          },
          {
            ...retryStrategies.llm,
            onRetry: (error, attempt) => {
              console.warn(`[LLM] Chargement du modèle - Tentative ${attempt} échouée`, error.message);
            }
          }
        );
        
        this.currentModel = targetModel;
        console.log("[LLM] Moteur et modèle prêts !");
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
    console.log("[LLM] Réinitialisation du moteur...");
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
      console.log(`[LLM] Changement d'agent détecté: ${this.lastAgentType} → ${agentType}`);
      console.log("[LLM] Contexte réinitialisé pour éviter la contamination");
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
}>>) => {
  const { type, payload, meta } = event.data;

  if (type === 'set_model') {
    // Permet de changer le modèle
    SELECTED_MODEL = payload.modelId || SELECTED_MODEL;
    console.log(`[LLM] Modèle sélectionné: ${SELECTED_MODEL}`);
    LLMEngine.reset(); // Forcer le rechargement au prochain appel
    self.postMessage({ 
      type: 'model_set', 
      payload: { modelId: SELECTED_MODEL }, 
      meta 
    });
  } else if (type === 'generate_response') {
    try {
      console.log(`[LLM] (traceId: ${meta?.traceId}) Inférence initiée.`);
      
      // Réinitialiser le contexte si on change d'agent (éviter contamination)
      LLMEngine.resetContext(payload.agentType);
      
      const engine = await LLMEngine.getInstance(payload.modelId, (progress) => {
        // Envoyer la progression du chargement à l'UI avec plus de détails
        self.postMessage({ 
          type: 'llm_load_progress', 
          payload: {
            progress: progress.progress,
            text: progress.text,
            loaded: progress.loaded || 0,
            total: progress.total || 0,
          }, 
          meta 
        });
      });

      // Utiliser le System Prompt personnalisé ou le prompt par défaut
      const defaultSystemPrompt = `Tu es l'agent de raisonnement principal d'ORION, une IA personnelle et locale.
Réponds à la requête de l'utilisateur de manière concise, intelligente et utile.`;

      const systemPrompt = payload.systemPrompt || defaultSystemPrompt;
      
      const contextStr = payload.context && payload.context.length > 0 
        ? `\n\nContexte pertinent trouvé dans ta mémoire:\n${payload.context.join('\n- ')}`
        : '';
      
      const prompt = `${systemPrompt}${contextStr}\n\nRequête de l'utilisateur:\n"${payload.query}"\n\nTa réponse:`;

      const request: ChatCompletionRequest = {
        messages: [{ role: "user", content: prompt }],
        max_tokens: payload.maxTokens || 256,
        temperature: payload.temperature !== undefined ? payload.temperature : 0.7,
        top_p: 0.95,
      };

      // Utiliser retry pour l'inférence
      const responseText = await withRetry(
        async () => {
          const llmResponse = await engine.chat.completions.create(request);
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
            console.warn(`[LLM] Inférence - Tentative ${attempt} échouée`, error.message);
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
    console.log('[LLM] Worker initialized');
    self.postMessage({ 
      type: 'init_complete',
      payload: {},
      meta
    });
  }
};
