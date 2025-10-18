// src/workers/llm.worker.ts
import { WebWorkerMLCEngine, MLCEngine, ChatCompletionRequest } from "@mlc-ai/web-llm";
import { WorkerMessage, QueryPayload } from '../types';

console.log("LLM Worker chargé. Prêt à initialiser le moteur.");

// Modèle léger et performant, optimisé pour le web.
const SELECTED_MODEL = "Phi-3-mini-4k-instruct-q4f16_1-MLC";

// --- Singleton pour le moteur LLM ---
// Garantit que le moteur n'est chargé qu'une seule fois.
class LLMEngine {
  private static instance: MLCEngine | null = null;

  static async getInstance(progress_callback?: (progress: { progress: number; text: string }) => void) {
    if (this.instance === null) {
      console.log("[LLM] Initialisation du moteur WebLLM...");
      
      // Utiliser l'engine WebWorkerMLCEngine directement sans sous-worker pour éviter les problèmes de build
      // @ts-expect-error - Le type peut ne pas correspondre exactement mais cela fonctionne
      this.instance = await WebWorkerMLCEngine.create({
        initProgressCallback: progress_callback || console.log,
      });

      console.log(`[LLM] Chargement du modèle: ${SELECTED_MODEL}...`);
      await this.instance.reload(SELECTED_MODEL);
      console.log("[LLM] Moteur et modèle prêts !");
    }
    return this.instance;
  }
}

// --- Le worker principal ---

self.onmessage = async (event: MessageEvent<WorkerMessage<QueryPayload & { context?: string[] }>>) => {
  const { type, payload, meta } = event.data;

  if (type === 'generate_response') {
    try {
      console.log(`[LLM] (traceId: ${meta?.traceId}) Inférence initiée.`);
      
      const engine = await LLMEngine.getInstance((progress) => {
        // Envoyer la progression du chargement à l'UI si nécessaire
        self.postMessage({ type: 'llm_load_progress', payload: progress, meta });
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
