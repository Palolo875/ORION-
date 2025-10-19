// src/workers/orchestrator.worker.ts

/**
 * Orchestrator Worker
 * 
 * Ce worker est le chef d'orchestre du Neural Mesh.
 * Il reçoit les requêtes de l'UI, coordonne les autres workers,
 * et retourne la réponse finale synthétisée après un débat multi-agents.
 */

import type { WorkerMessage, QueryPayload, FinalResponsePayload, StatusUpdatePayload } from '../types';
import { LOGICAL_AGENT, CREATIVE_AGENT, CRITICAL_AGENT, SYNTHESIZER_AGENT, createSynthesisMessage } from '../config/agents';

console.log("Orchestrator Worker (Secure) chargé et prêt.");

// Instancier tous les workers
const llmWorker = new Worker(new URL('./llm.worker.ts', import.meta.url), {
  type: 'module',
});

const memoryWorker = new Worker(new URL('./memory.worker.ts', import.meta.url), {
  type: 'module',
});

const toolUserWorker = new Worker(new URL('./toolUser.worker.ts', import.meta.url), {
  type: 'module',
});

const geniusHourWorker = new Worker(new URL('./geniusHour.worker.ts', import.meta.url), {
  type: 'module',
});

const contextManagerWorker = new Worker(new URL('./contextManager.worker.ts', import.meta.url), {
  type: 'module',
});

console.log("[Orchestrateur] Tous les workers ont été instanciés (LLM, Memory, ToolUser, GeniusHour, ContextManager).");

// Variables pour stocker la requête en cours et le tracer
let currentQueryContext: QueryPayload | null = null;
let currentQueryMeta: WorkerMessage['meta'] | null = null;
let startTime: number = 0;
let currentMemoryHits: string[] = [];

// Variables pour le débat multi-agents
interface MultiAgentState {
  logicalResponse?: string;
  creativeResponse?: string;
  criticalResponse?: string;
  currentStep: 'idle' | 'logical' | 'creative' | 'critical' | 'synthesis';
}

let multiAgentState: MultiAgentState = {
  currentStep: 'idle'
};

// --- Logique principale de l'Orchestrateur ---

self.onmessage = (event: MessageEvent<WorkerMessage<QueryPayload>>) => {
  const { type, payload, meta } = event.data;

  try {
    if (type === 'query') {
      console.log(`[Orchestrateur] Requête reçue (traceId: ${meta?.traceId}): "${payload.query}"`);
      console.log(`[Orchestrateur] Profil d'appareil: '${payload.deviceProfile || 'micro'}'`);
      
      // Sauvegarder la requête courante et les métadonnées
      currentQueryContext = payload;
      currentQueryMeta = meta || null;
      startTime = performance.now(); // Démarrer le chronomètre
      
      // --- STRATÉGIE DE DÉGRADATION GRACIEUSE ---
      const profile = payload.deviceProfile || 'micro';
      
      // Envoyer une mise à jour de statut : Recherche d'outils
      self.postMessage({ 
        type: 'status_update', 
        payload: { 
          step: 'tool_search', 
          details: 'Analyse de la requête pour une action possible...' 
        } as StatusUpdatePayload,
        meta: currentQueryMeta 
      });

      switch (profile) {
        case 'full':
          // Comportement normal et complet: ReAct avec LLM
          console.log("[Orchestrateur] Stratégie 'full': ReAct avec LLM.");
          toolUserWorker.postMessage({ 
            type: 'find_and_execute_tool', 
            payload: { query: payload.query },
            meta: currentQueryMeta 
          });
          break;

        case 'lite':
          // On utilise les outils mais on simplifie le LLM si nécessaire
          console.log("[Orchestrateur] Stratégie 'lite': Outils + LLM optimisé.");
          toolUserWorker.postMessage({ 
            type: 'find_and_execute_tool', 
            payload: { query: payload.query },
            meta: currentQueryMeta 
          });
          break;

        case 'micro':
        default:
          // Le mode le plus basique : outils uniquement, pas de LLM lourd
          console.log("[Orchestrateur] Stratégie 'micro': Outils uniquement, pas de LLM.");
          toolUserWorker.postMessage({ 
            type: 'find_and_execute_tool', 
            payload: { query: payload.query },
            meta: currentQueryMeta 
          });
          break;
      }
    } else if (type === 'init') {
      console.log('[Orchestrateur] Initialized');
      // Initialiser tous les workers
      llmWorker.postMessage({ type: 'init' });
      memoryWorker.postMessage({ type: 'init' });
      toolUserWorker.postMessage({ type: 'init' });
      contextManagerWorker.postMessage({ type: 'init' });
      // Le GeniusHourWorker n'a pas besoin d'initialisation, il démarre automatiquement
      console.log('[Orchestrateur] GeniusHour Worker démarré en arrière-plan');
    } else if (type === 'set_model') {
      // Relayer la configuration du modèle au LLM Worker
      console.log(`[Orchestrateur] Changement de modèle: ${(payload as any).modelId}`);
      llmWorker.postMessage({ type: 'set_model', payload, meta });
    } else if (type === 'feedback') {
      console.log(`[Orchestrateur] Feedback reçu (${(payload as any).feedback}) pour le message ${(payload as any).messageId}`);
      console.log(`[Orchestrateur] Query: "${(payload as any).query}"`);
      console.log(`[Orchestrateur] Response: "${(payload as any).response}"`);
      
      // Relayer le feedback enrichi au Memory Worker
      memoryWorker.postMessage({ 
        type: 'add_feedback', 
        payload: payload,
        meta: meta 
      });
    } else if (type === 'purge_memory') {
      console.log('[Orchestrateur] Purge de la mémoire demandée');
      memoryWorker.postMessage({ 
        type: 'purge_all', 
        payload: {},
        meta: meta 
      });
    } else if (type === 'export_memory') {
      console.log('[Orchestrateur] Export de la mémoire demandée');
      memoryWorker.postMessage({ 
        type: 'export_all', 
        payload: {},
        meta: meta 
      });
    } else if (type === 'import_memory') {
      console.log('[Orchestrateur] Import de la mémoire demandée');
      memoryWorker.postMessage({ 
        type: 'import_all', 
        payload: payload,
        meta: meta 
      });
    } else {
      console.warn(`[Orchestrateur] Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error('[Orchestrateur] Error processing message:', error);
    sendResponse({
      response: 'Une erreur est survenue lors du traitement de votre demande.',
      confidence: 0,
      provenance: {},
      debug: {}
    });
  }
};

// --- Écouteurs pour les réponses des workers ---

// Écouter les réponses du ToolUserWorker
toolUserWorker.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  if (type === 'tool_executed') {
    // L'outil a été trouvé et exécuté avec succès. On court-circuite le débat.
    const endTime = performance.now();
    const inferenceTimeMs = Math.round(endTime - startTime);
    const toolPayload = payload as any;
    
    console.log(`[Orchestrateur] Outil '${toolPayload.toolName}' exécuté. Réponse directe.`);
    const responsePayload: FinalResponsePayload = {
      response: toolPayload.result,
      confidence: 1.0, // Confiance maximale pour un outil factuel
      provenance: { 
        toolUsed: toolPayload.toolName,
        memoryHits: [],
        fromAgents: undefined
      },
      debug: {
        totalRounds: 0, // Pas de débat pour un outil
        inferenceTimeMs: inferenceTimeMs
      }
    };
    self.postMessage({ 
      type: 'final_response', 
      payload: responsePayload,
      meta: currentQueryMeta || undefined
    });
    
    console.log(`[Orchestrateur] Réponse finale envoyée (traceId: ${currentQueryMeta?.traceId}) en ${inferenceTimeMs}ms.`);

    // Sauvegarder la conversation avec le type approprié
    const memoryToSave = `Q: ${currentQueryContext!.query} | A: ${toolPayload.result}`;
    memoryWorker.postMessage({ 
      type: 'store', 
      payload: { content: memoryToSave, type: 'tool_result' },
      meta: currentQueryMeta || undefined
    });
    
    // Réinitialiser pour la prochaine requête
    currentMemoryHits = [];

  } else if (type === 'no_tool_found' || type === 'tool_error') {
    // Aucun outil trouvé ou une erreur est survenue
    if (type === 'tool_error') {
      console.error(`[Orchestrateur] Erreur du ToolUser: ${(payload as any).error}`);
    }
    
    const profile = currentQueryContext?.deviceProfile || 'micro';
    
    if (profile === 'micro') {
      // En mode micro, si aucun outil n'est trouvé, on envoie une réponse simple
      console.log("[Orchestrateur] Mode 'micro': Aucun outil trouvé. Réponse simplifiée.");
      sendSimpleResponse(
        "Je ne peux pas répondre à cette question en mode 'micro' car aucun outil n'est disponible. Les capacités de votre appareil sont limitées, donc je privilégie la réactivité plutôt que la profondeur de raisonnement.",
        0.3
      );
    } else {
      // Pour 'full' et 'lite', on lance le processus de mémoire et LLM
      console.log("[Orchestrateur] Aucun outil applicable. Lancement du processus de mémoire et débat.");
      
      // Envoyer une mise à jour de statut : Recherche en mémoire
      self.postMessage({ 
        type: 'status_update', 
        payload: { 
          step: 'memory_search', 
          details: 'Recherche dans la mémoire contextuelle...' 
        } as StatusUpdatePayload,
        meta: currentQueryMeta 
      });
      
      memoryWorker.postMessage({ 
        type: 'search', 
        payload: { query: currentQueryContext!.query },
        meta: currentQueryMeta || undefined
      });
    }
  } else if (type === 'init_complete') {
    console.log('[Orchestrateur] ToolUser Worker initialisé.');
  }
};

// --- État pour le LLM ---
// Plus besoin de l'état de débat, le LLM génère directement la réponse

// Écouter les réponses du MemoryWorker
memoryWorker.onmessage = (event: MessageEvent<WorkerMessage<{ results: Array<{ content?: string }> }>>) => {
  const { type, payload, meta } = event.data;

  // On vérifie que la réponse correspond à la requête en cours
  if (meta?.traceId !== currentQueryMeta?.traceId && type !== 'init_complete' && type !== 'store_complete') {
    return;
  }

  if (type === 'search_result') {
    // Stocker les résultats de la mémoire
    currentMemoryHits = payload.results.map((r) => r.content || '').filter(c => c.length > 0);
    
    if (currentMemoryHits.length > 0) {
      console.log(`[Orchestrateur] (traceId: ${meta?.traceId}) Contexte reçu: ${currentMemoryHits.length} souvenir(s).`);
    } else {
      console.log(`[Orchestrateur] (traceId: ${meta?.traceId}) Aucun souvenir pertinent trouvé.`);
    }
    
    // Compresser l'historique de conversation si nécessaire
    if (currentQueryContext && currentQueryContext.conversationHistory.length > 10) {
      console.log(`[Orchestrateur] (traceId: ${meta?.traceId}) Compression du contexte...`);
      contextManagerWorker.postMessage({
        type: 'compress_context',
        payload: {
          messages: currentQueryContext.conversationHistory,
          maxTokens: 3000
        },
        meta: currentQueryMeta || undefined
      });
    } else {
      // Si pas besoin de compression, lancer directement l'inférence
      launchLLMInference();
    }
  } else if (type === 'store_complete') {
    console.log("[Orchestrateur] Mémoire sauvegardée.");
  } else if (type === 'init_complete') {
    console.log('[Orchestrateur] Memory Worker initialisé.');
  } else if (type === 'purge_complete') {
    console.log('[Orchestrateur] Purge de la mémoire terminée.');
    self.postMessage({ 
      type: 'purge_complete', 
      payload: {},
      meta: meta 
    });
  } else if (type === 'export_complete') {
    console.log('[Orchestrateur] Export de la mémoire terminé.');
    // Relayer l'export à l'UI
    self.postMessage({ 
      type: 'export_complete', 
      payload: payload,
      meta: meta 
    });
  } else if (type === 'import_complete') {
    console.log('[Orchestrateur] Import de la mémoire terminé.');
    self.postMessage({ 
      type: 'import_complete', 
      payload: {},
      meta: meta 
    });
  }
};

// Écouteur pour le LLM Worker
llmWorker.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload, meta } = event.data;

  // On vérifie que la réponse correspond à la requête en cours
  if (meta?.traceId !== currentQueryMeta?.traceId && type !== 'init_complete' && type !== 'llm_load_progress') {
    return;
  }

  if (type === 'llm_response_complete') {
    const llmPayload = payload as any;
    
    // Gérer les réponses en fonction de l'état du débat multi-agents
    if (multiAgentState.currentStep === 'logical') {
      console.log(`[Orchestrateur] Agent Logique a répondu`);
      multiAgentState.logicalResponse = llmPayload.response;
      multiAgentState.currentStep = 'creative';
      
      // Lancer l'agent créatif
      self.postMessage({ 
        type: 'status_update', 
        payload: { 
          step: 'multi_agent_creative', 
          details: 'Agent Créatif en cours...' 
        } as StatusUpdatePayload,
        meta: currentQueryMeta 
      });
      
      llmWorker.postMessage({ 
        type: 'generate_response', 
        payload: {
          ...currentQueryContext!,
          context: currentMemoryHits,
          systemPrompt: CREATIVE_AGENT.systemPrompt,
          temperature: CREATIVE_AGENT.temperature,
          maxTokens: CREATIVE_AGENT.maxTokens,
        },
        meta: currentQueryMeta || undefined
      });
      
    } else if (multiAgentState.currentStep === 'creative') {
      console.log(`[Orchestrateur] Agent Créatif a répondu`);
      multiAgentState.creativeResponse = llmPayload.response;
      multiAgentState.currentStep = 'critical';
      
      // Lancer l'agent critique
      self.postMessage({ 
        type: 'status_update', 
        payload: { 
          step: 'multi_agent_critical', 
          details: 'Agent Critique en cours...' 
        } as StatusUpdatePayload,
        meta: currentQueryMeta 
      });
      
      llmWorker.postMessage({ 
        type: 'generate_response', 
        payload: {
          ...currentQueryContext!,
          context: currentMemoryHits,
          systemPrompt: CRITICAL_AGENT.systemPrompt,
          temperature: CRITICAL_AGENT.temperature,
          maxTokens: CRITICAL_AGENT.maxTokens,
        },
        meta: currentQueryMeta || undefined
      });
      
    } else if (multiAgentState.currentStep === 'critical') {
      console.log(`[Orchestrateur] Agent Critique a répondu`);
      multiAgentState.criticalResponse = llmPayload.response;
      multiAgentState.currentStep = 'synthesis';
      
      // Lancer l'agent synthétiseur avec toutes les réponses
      self.postMessage({ 
        type: 'status_update', 
        payload: { 
          step: 'multi_agent_synthesis', 
          details: 'Synthèse finale en cours...' 
        } as StatusUpdatePayload,
        meta: currentQueryMeta 
      });
      
      const contextStr = currentMemoryHits.length > 0 ? currentMemoryHits.join('\n- ') : undefined;
      const synthesisPrompt = createSynthesisMessage(
        currentQueryContext!.query,
        multiAgentState.logicalResponse!,
        multiAgentState.creativeResponse!,
        multiAgentState.criticalResponse!,
        contextStr
      );
      
      llmWorker.postMessage({ 
        type: 'generate_response', 
        payload: {
          query: synthesisPrompt,
          conversationHistory: currentQueryContext!.conversationHistory,
          deviceProfile: currentQueryContext!.deviceProfile,
          context: [],
          systemPrompt: '', // Le prompt est déjà dans le message
          temperature: SYNTHESIZER_AGENT.temperature,
          maxTokens: SYNTHESIZER_AGENT.maxTokens,
        },
        meta: currentQueryMeta || undefined
      });
      
    } else if (multiAgentState.currentStep === 'synthesis' || multiAgentState.currentStep === 'idle') {
      // Réponse finale (synthèse ou mode simple)
      const endTime = performance.now();
      const inferenceTimeMs = Math.round(endTime - startTime);
      console.log(`[Orchestrateur] (traceId: ${meta?.traceId}) Réponse finale reçue en ${inferenceTimeMs}ms.`);

      const fromAgents = multiAgentState.currentStep === 'synthesis' 
        ? ['Logical', 'Creative', 'Critical', 'Synthesizer']
        : ['LLMAgent'];

      const finalPayload: FinalResponsePayload = {
        response: llmPayload.response,
        confidence: 0.9,
        provenance: {
          fromAgents,
          memoryHits: currentMemoryHits,
        },
        debug: {
          inferenceTimeMs: inferenceTimeMs,
        }
      };

      self.postMessage({ 
        type: 'final_response', 
        payload: finalPayload, 
        meta: currentQueryMeta || undefined
      });

      console.log(`[Orchestrateur] Réponse finale envoyée (traceId: ${meta?.traceId}) en ${inferenceTimeMs}ms.`);

      // Sauvegarder la conversation
      if (currentQueryContext) {
        const memoryToSave = `Q: ${currentQueryContext.query} | A: ${llmPayload.response}`;
        memoryWorker.postMessage({ 
          type: 'store', 
          payload: { content: memoryToSave, type: 'conversation' }, 
          meta: currentQueryMeta || undefined
        });
      }

      // Réinitialiser
      currentMemoryHits = [];
      currentQueryContext = null;
      currentQueryMeta = null;
      multiAgentState = { currentStep: 'idle' };
    }

  } else if (type === 'llm_error') {
    // Gérer l'erreur du LLM
    const errorPayload2 = payload as any;
    console.error(`[Orchestrateur] Erreur LLM: ${errorPayload2.error}`);
    const errorPayload: FinalResponsePayload = {
      response: `Désolé, une erreur est survenue lors de la génération de la réponse: ${errorPayload2.error}`,
      confidence: 0,
      provenance: {},
      debug: {}
    };
    self.postMessage({ 
      type: 'final_response', 
      payload: errorPayload, 
      meta: currentQueryMeta || undefined
    });

    // Réinitialiser
    currentMemoryHits = [];
    currentQueryContext = null;
    currentQueryMeta = null;

  } else if (type === 'llm_load_progress') {
    // Relayer la progression du chargement à l'UI
    self.postMessage({
      type: 'llm_load_progress',
      payload: payload,
      meta: meta
    });
  } else if (type === 'init_complete') {
    console.log('[Orchestrateur] LLM Worker initialisé.');
  }
};

/**
 * Envoie une réponse au thread principal
 */
function sendResponse(payload: FinalResponsePayload): void {
  const message: WorkerMessage<FinalResponsePayload> = {
    type: 'final_response',
    payload
  };
  self.postMessage(message);
}

/**
 * Envoie une réponse simple pour les cas de dégradation gracieuse
 */
function sendSimpleResponse(text: string, confidence: number): void {
  const endTime = performance.now();
  const finalPayload: FinalResponsePayload = {
    response: text,
    confidence: confidence,
    provenance: { fromAgents: ['FallbackStrategy'] },
    debug: { inferenceTimeMs: Math.round(endTime - startTime) }
  };
  self.postMessage({ 
    type: 'final_response', 
    payload: finalPayload, 
    meta: currentQueryMeta || undefined
  });
}

/**
 * Lance l'inférence LLM avec le contexte actuel
 */
function launchLLMInference(): void {
  console.log(`[Orchestrateur] (traceId: ${currentQueryMeta?.traceId}) Lancement de l'inférence LLM.`);
  
  // Envoyer une mise à jour de statut : Raisonnement LLM
  self.postMessage({ 
    type: 'status_update', 
    payload: { 
      step: 'llm_reasoning', 
      details: 'Génération de la réponse par le LLM...' 
    } as StatusUpdatePayload,
    meta: currentQueryMeta 
  });
  
  const llmPayload = {
    ...currentQueryContext!,
    context: currentMemoryHits,
  };

  // Appeler le LLM Worker
  llmWorker.postMessage({ 
    type: 'generate_response', 
    payload: llmPayload,
    meta: currentQueryMeta || undefined
  });
}

// Écouter les réponses du ContextManager
contextManagerWorker.onmessage = (event: MessageEvent) => {
  const { type, payload, meta } = event.data;

  if (meta?.traceId !== currentQueryMeta?.traceId && type !== 'init_complete') {
    return;
  }

  if (type === 'context_compressed') {
    console.log(`[Orchestrateur] (traceId: ${meta?.traceId}) Contexte compressé: ${payload.originalCount} → ${payload.compressedCount} messages`);
    
    // Mettre à jour le contexte avec la version compressée
    if (currentQueryContext) {
      currentQueryContext.conversationHistory = payload.compressedMessages;
    }
    
    // Lancer l'inférence avec le contexte compressé
    launchLLMInference();
  } else if (type === 'init_complete') {
    console.log('[Orchestrateur] ContextManager Worker initialisé.');
  } else if (type === 'context_error') {
    console.error(`[Orchestrateur] Erreur ContextManager: ${payload.error}`);
    // En cas d'erreur, continuer avec le contexte non compressé
    launchLLMInference();
  }
};
