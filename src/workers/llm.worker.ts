// src/workers/llm.worker.ts
import { WebWorkerMLCEngine, MLCEngine, ChatCompletionRequest } from "@mlc-ai/web-llm";
import { WorkerMessage, QueryPayload } from '../types';

console.log("LLM Worker chargé. Prêt à initialiser le moteur.");

// Modèle par défaut
let SELECTED_MODEL = "Phi-3-mini-4k-instruct-q4f16_1-MLC";

// --- Singleton pour le moteur LLM ---
// Garantit que le moteur n'est chargé qu'une seule fois.
class LLMEngine {
  private static instance: MLCEngine | null = null;
  private static currentModel: string | null = null;

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
    }
    return this.instance;
  }
  
  static reset() {
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
      console.error(`[LLM] Erreur durant l'inférence:`, error);
      self.postMessage({ 
        type: 'llm_error', 
        payload: { error: (error as Error).message }, 
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
