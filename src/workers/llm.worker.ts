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

console.log("[LLM] Worker chargé. Prêt à initialiser le moteur.")

// Modèle par défaut
let SELECTED_MODEL = "Phi-3-mini-4k-instruct-q4f16_1-MLC";

/**
 * Singleton pour le moteur LLM
 * Garantit que le moteur n'est chargé qu'une seule fois et gère le changement de modèle.
 */
class LLMEngine {
  private static instance: MLCEngine | null = null;
  private static currentModel: string | null = null;

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
        
        // Utiliser l'engine WebWorkerMLCEngine directement sans sous-worker pour éviter les problèmes de build
        // @ts-expect-error - Le type peut ne pas correspondre exactement mais cela fonctionne
        this.instance = await WebWorkerMLCEngine.create({
          initProgressCallback: (report: { progress: number; text: string; loaded?: number; total?: number }) => {
            if (progress_callback) {
              progress_callback(report);
            } else {
              console.log(`[LLM] ${report.text} - ${report.progress.toFixed(1)}%`);
            }
          },
        });

        console.log(`[LLM] Chargement du modèle: ${targetModel}...`);
        await this.instance.reload(targetModel);
        this.currentModel = targetModel;
        console.log("[LLM] Moteur et modèle prêts !");
      } catch (error) {
        console.error("[LLM] Erreur critique lors de l'initialisation:", error);
        this.instance = null;
        this.currentModel = null;
        throw new Error(`Échec de l'initialisation du moteur LLM: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
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
  }
}

// --- Le worker principal ---

self.onmessage = async (event: MessageEvent<WorkerMessage<QueryPayload & { context?: string[]; modelId?: string }>>) => {
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

      const prompt = `
        Tu es l'agent de raisonnement principal d'ORION, une IA personnelle et locale.
        Réponds à la requête de l'utilisateur de manière concise, intelligente et utile.

        Contexte pertinent trouvé dans ta mémoire:
        ${payload.context && payload.context.length > 0 ? payload.context.join('\n- ') : 'Aucun.'}

        Requête de l'utilisateur:
        "${payload.query}"

        Ta réponse:
      `;

      const request: ChatCompletionRequest = {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 256,
        // Options pour des réponses plus créatives mais cohérentes
        temperature: 0.7,
        top_p: 0.95,
      };

      const llmResponse = await engine.chat.completions.create(request);
      const responseText = llmResponse.choices[0].message.content || "Je n'ai pas pu formuler de réponse.";

      self.postMessage({ 
        type: 'llm_response_complete', 
        payload: { response: responseText }, 
        meta 
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error(`[LLM] Erreur durant l'inférence:`, {
        message: errorMessage,
        stack: errorStack,
        query: payload.query,
        traceId: meta?.traceId
      });
      
      // Envoyer une erreur détaillée pour le debugging
      self.postMessage({ 
        type: 'llm_error', 
        payload: { 
          error: errorMessage,
          details: {
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
