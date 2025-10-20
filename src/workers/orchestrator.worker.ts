// src/workers/orchestrator.worker.ts

/**
 * Orchestrator Worker
 * 
 * Ce worker est le chef d'orchestre du Neural Mesh.
 * Il reçoit les requêtes de l'UI, coordonne les autres workers,
 * et retourne la réponse finale synthétisée après un débat multi-agents.
 */

import type { WorkerMessage, QueryPayload, FinalResponsePayload, StatusUpdatePayload } from '../types';
import type { SetModelPayload, FeedbackPayload, ToolExecutionPayload, ToolErrorPayload, LLMErrorPayload } from '../types/worker-payloads';
import { LOGICAL_AGENT, CREATIVE_AGENT, CRITICAL_AGENT, SYNTHESIZER_AGENT, createSynthesisMessage } from '../config/agents';
import { errorLogger, UserMessages } from '../utils/errorLogger';
import { withRetry, retryStrategies } from '../utils/retry';
import { evaluateDebate, evaluateSingleResponse, generateQualityReport, type DebateQuality } from '../utils/debateQuality';
import { logger } from '../utils/logger';

logger.info('Orchestrator', 'Worker chargé et prêt');

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

logger.info('Orchestrator', 'Tous les workers instanciés', { workers: ['LLM', 'Memory', 'ToolUser', 'GeniusHour', 'ContextManager'] });

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
  currentStep: 'idle' | 'parallel_generation' | 'critical' | 'synthesis';
  parallelResponses: { logical: boolean; creative: boolean };
}

let multiAgentState: MultiAgentState = {
  currentStep: 'idle',
  parallelResponses: { logical: false, creative: false }
};

// --- Logique principale de l'Orchestrateur ---

self.onmessage = (event: MessageEvent<WorkerMessage<QueryPayload>>) => {
  const { type, payload, meta } = event.data;

  try {
    if (type === 'query') {
      logger.info('Orchestrator', 'Requête reçue', { 
        query: payload.query.substring(0, 100),
        deviceProfile: payload.deviceProfile || 'micro'
      }, meta?.traceId);
      
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

      // Déterminer si on doit utiliser le débat multi-agents
      const useMultiAgent = profile === 'full' || (profile === 'lite' && payload.query.length > 50);
      logger.debug('Orchestrator', 'Mode débat multi-agents', { enabled: useMultiAgent }, meta?.traceId);
      
      switch (profile) {
        case 'full':
          // Comportement normal et complet: ReAct avec LLM et débat multi-agents pour les requêtes complexes
          logger.info('Orchestrator', "Stratégie 'full': ReAct avec LLM et débat multi-agents", undefined, meta?.traceId);
          toolUserWorker.postMessage({ 
            type: 'find_and_execute_tool', 
            payload: { query: payload.query },
            meta: currentQueryMeta 
          });
          break;

        case 'lite':
          // On utilise les outils et le débat multi-agents pour les questions complexes
          logger.info('Orchestrator', "Stratégie 'lite': Outils + LLM optimisé", undefined, meta?.traceId);
          toolUserWorker.postMessage({ 
            type: 'find_and_execute_tool', 
            payload: { query: payload.query },
            meta: currentQueryMeta 
          });
          break;

        case 'micro':
        default:
          // Le mode le plus basique : outils uniquement, pas de débat LLM lourd
          logger.info('Orchestrator', "Stratégie 'micro': Outils uniquement, pas de LLM", undefined, meta?.traceId);
          toolUserWorker.postMessage({ 
            type: 'find_and_execute_tool', 
            payload: { query: payload.query },
            meta: currentQueryMeta 
          });
          break;
      }
    } else if (type === 'init') {
      logger.info('Orchestrator', 'Initialized');
      // Initialiser tous les workers
      llmWorker.postMessage({ type: 'init' });
      memoryWorker.postMessage({ type: 'init' });
      toolUserWorker.postMessage({ type: 'init' });
      contextManagerWorker.postMessage({ type: 'init' });
      // Le GeniusHourWorker n'a pas besoin d'initialisation, il démarre automatiquement
      logger.info('Orchestrator', 'GeniusHour Worker démarré en arrière-plan');
    } else if (type === 'set_model') {
      // Relayer la configuration du modèle au LLM Worker
      const modelPayload = payload as SetModelPayload;
      logger.info('Orchestrator', `Changement de modèle: ${modelPayload.modelId}`, { modelId: modelPayload.modelId });
      llmWorker.postMessage({ type: 'set_model', payload, meta });
    } else if (type === 'feedback') {
      const feedbackPayload = payload as FeedbackPayload;
      logger.info('Orchestrator', `Feedback reçu`, { 
        feedback: feedbackPayload.feedback, 
        messageId: feedbackPayload.messageId,
        query: feedbackPayload.query.substring(0, 50),
        response: feedbackPayload.response.substring(0, 50)
      });
      
      // Relayer le feedback enrichi au Memory Worker
      memoryWorker.postMessage({ 
        type: 'add_feedback', 
        payload: payload,
        meta: meta 
      });
    } else if (type === 'purge_memory') {
      logger.info('Orchestrator', 'Purge de la mémoire demandée', undefined, meta?.traceId);
      memoryWorker.postMessage({ 
        type: 'purge_all', 
        payload: {},
        meta: meta 
      });
    } else if (type === 'export_memory') {
      logger.info('Orchestrator', 'Export de la mémoire demandée', undefined, meta?.traceId);
      memoryWorker.postMessage({ 
        type: 'export_all', 
        payload: {},
        meta: meta 
      });
    } else if (type === 'import_memory') {
      logger.info('Orchestrator', 'Import de la mémoire demandée', undefined, meta?.traceId);
      memoryWorker.postMessage({ 
        type: 'import_all', 
        payload: payload,
        meta: meta 
      });
    } else {
      logger.warn('Orchestrator', 'Type de message inconnu', { type });
    }
  } catch (error) {
    const err = error as Error;
    errorLogger.error(
      'Orchestrator',
      `Error processing message: ${err.message}`,
      UserMessages.WORKER_FAILED,
      err,
      { type, traceId: meta?.traceId }
    );
    
    sendResponse({
      response: UserMessages.WORKER_FAILED + ' Veuillez réessayer.',
      confidence: 0,
      provenance: { fromAgents: ['ErrorHandler'] },
      debug: { error: err.message }
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
    const toolPayload = payload as ToolExecutionPayload;
    
    logger.info('Orchestrator', `Outil exécuté - réponse directe`, { 
      toolName: toolPayload.toolName,
      inferenceTimeMs
    });
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
    
    logger.info('Orchestrator', 'Réponse finale envoyée', { inferenceTimeMs }, currentQueryMeta?.traceId);

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
      const errorPayload = payload as ToolErrorPayload;
      logger.error('Orchestrator', 'Erreur du ToolUser', { 
        error: errorPayload.error,
        toolName: errorPayload.toolName
      });
    }
    
    const profile = currentQueryContext?.deviceProfile || 'micro';
    
    if (profile === 'micro') {
      // En mode micro, si aucun outil n'est trouvé, on envoie une réponse simple
      logger.debug('Orchestrator', "Mode 'micro': Aucun outil trouvé. Réponse simplifiée", undefined, currentQueryMeta?.traceId);
      sendSimpleResponse(
        "Je ne peux pas répondre à cette question en mode 'micro' car aucun outil n'est disponible. Les capacités de votre appareil sont limitées, donc je privilégie la réactivité plutôt que la profondeur de raisonnement.",
        0.3
      );
    } else {
      // Pour 'full' et 'lite', on lance le processus de mémoire et LLM/débat
      logger.debug('Orchestrator', 'Aucun outil applicable. Lancement du processus de mémoire et raisonnement', undefined, currentQueryMeta?.traceId);
      
      // Envoyer une mise à jour de statut : Recherche en mémoire
      self.postMessage({ 
        type: 'status_update', 
        payload: { 
          step: 'memory_search', 
          details: 'Recherche dans la mémoire contextuelle...' 
        } as StatusUpdatePayload,
        meta: currentQueryMeta 
      });
      
      // Rechercher en mémoire avec retry
      searchMemoryWithRetry();
    }
  } else if (type === 'init_complete') {
    logger.info('Orchestrator', 'ToolUser Worker initialisé');
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
      logger.debug('Orchestrator', 'Contexte reçu', { memoryCount: currentMemoryHits.length }, meta?.traceId);
    } else {
      logger.debug('Orchestrator', 'Aucun souvenir pertinent trouvé', undefined, meta?.traceId);
    }
    
    // Compresser l'historique de conversation si nécessaire
    if (currentQueryContext && currentQueryContext.conversationHistory.length > 10) {
      logger.debug('Orchestrator', 'Compression du contexte', undefined, meta?.traceId);
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
    logger.debug('Orchestrator', 'Mémoire sauvegardée');
  } else if (type === 'init_complete') {
    logger.info('Orchestrator', 'Memory Worker initialisé');
  } else if (type === 'purge_complete') {
    logger.info('Orchestrator', 'Purge de la mémoire terminée');
    self.postMessage({ 
      type: 'purge_complete', 
      payload: {},
      meta: meta 
    });
  } else if (type === 'export_complete') {
    logger.info('Orchestrator', 'Export de la mémoire terminé');
    // Relayer l'export à l'UI
    self.postMessage({ 
      type: 'export_complete', 
      payload: payload,
      meta: meta 
    });
  } else if (type === 'import_complete') {
    logger.info('Orchestrator', 'Import de la mémoire terminé');
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
    const llmPayload = payload as { response: string; agentType?: string };
    const agentType = llmPayload.agentType;
    
    // Gérer les réponses en fonction de l'état du débat multi-agents
    if (multiAgentState.currentStep === 'parallel_generation') {
      // Gérer les réponses parallèles (Logique + Créatif)
      if (agentType === 'logical') {
        logger.debug('Orchestrator', 'Agent Logique a répondu (parallèle)', undefined, meta?.traceId);
        multiAgentState.logicalResponse = llmPayload.response;
        multiAgentState.parallelResponses.logical = true;
      } else if (agentType === 'creative') {
        logger.debug('Orchestrator', 'Agent Créatif a répondu (parallèle)', undefined, meta?.traceId);
        multiAgentState.creativeResponse = llmPayload.response;
        multiAgentState.parallelResponses.creative = true;
      }
      
      // Si les deux agents ont répondu, lancer l'agent critique
      if (multiAgentState.parallelResponses.logical && multiAgentState.parallelResponses.creative) {
        logger.debug('Orchestrator', "Génération parallèle terminée, lancement de l'agent critique", undefined, meta?.traceId);
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
      }
      
    } else if (multiAgentState.currentStep === 'critical') {
      logger.debug('Orchestrator', 'Agent Critique a répondu', undefined, meta?.traceId);
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
      logger.info('Orchestrator', 'Réponse finale reçue', { inferenceTimeMs }, meta?.traceId);

      const fromAgents = multiAgentState.currentStep === 'synthesis' 
        ? ['Logical', 'Creative', 'Critical', 'Synthesizer']
        : ['LLMAgent'];

      // Évaluer la qualité de la réponse (débat multi-agents OU réponse simple)
      let debateQuality: DebateQuality | undefined;
      if (multiAgentState.currentStep === 'synthesis' && 
          multiAgentState.logicalResponse && 
          multiAgentState.creativeResponse && 
          multiAgentState.criticalResponse) {
        
        // Mode débat multi-agents
        logger.debug('Orchestrator', 'Évaluation de la qualité du débat multi-agents', undefined, meta?.traceId);
        debateQuality = evaluateDebate({
          logical: multiAgentState.logicalResponse,
          creative: multiAgentState.creativeResponse,
          critical: multiAgentState.criticalResponse,
          synthesis: llmPayload.response
        });
        
        logger.debug('Orchestrator', 'Qualité du débat', { debateQuality }, meta?.traceId);
        
        // Générer un rapport si la qualité est faible
        if (debateQuality.overallScore < 0.6) {
          logger.warn('Orchestrator', 'Qualité du débat sous le seuil acceptable (< 60%)', { 
            report: generateQualityReport(debateQuality) 
          }, meta?.traceId);
        } else {
          logger.debug('Orchestrator', 'Qualité du débat acceptable', undefined, meta?.traceId);
        }
      } else if (multiAgentState.currentStep === 'idle' && currentQueryContext) {
        
        // Mode simple - évaluer quand même la qualité de la réponse
        logger.debug('Orchestrator', 'Évaluation de la qualité de la réponse simple', undefined, meta?.traceId);
        debateQuality = evaluateSingleResponse({
          response: llmPayload.response,
          query: currentQueryContext.query
        });
        
        logger.debug('Orchestrator', 'Qualité de la réponse', { debateQuality }, meta?.traceId);
        
        if (debateQuality.overallScore < 0.6) {
          logger.warn('Orchestrator', 'Qualité de la réponse sous le seuil acceptable (< 60%)', { 
            score: (debateQuality.overallScore * 100).toFixed(0) + '%'
          }, meta?.traceId);
        }
      }

      const finalPayload: FinalResponsePayload = {
        response: llmPayload.response,
        confidence: debateQuality ? debateQuality.overallScore : 0.9,
        provenance: {
          fromAgents,
          memoryHits: currentMemoryHits,
        },
        debug: {
          inferenceTimeMs: inferenceTimeMs,
          debateQuality: debateQuality,
        }
      };

      self.postMessage({ 
        type: 'final_response', 
        payload: finalPayload, 
        meta: currentQueryMeta || undefined
      });

      logger.info('Orchestrator', 'Réponse finale envoyée', { inferenceTimeMs }, meta?.traceId);

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
      multiAgentState = { currentStep: 'idle', parallelResponses: { logical: false, creative: false } };
    }

  } else if (type === 'llm_error') {
    // Gérer l'erreur du LLM
    const errorPayload2 = payload as LLMErrorPayload;
    errorLogger.error(
      'Orchestrator',
      `LLM error: ${errorPayload2.error}`,
      UserMessages.LLM_INFERENCE_FAILED,
      undefined,
      { query: currentQueryContext?.query?.substring(0, 100), traceId: meta?.traceId }
    );
    
    const errorPayload: FinalResponsePayload = {
      response: UserMessages.LLM_INFERENCE_FAILED,
      confidence: 0,
      provenance: { fromAgents: ['ErrorHandler'] },
      debug: { error: errorPayload2.error }
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
    multiAgentState = { currentStep: 'idle', parallelResponses: { logical: false, creative: false } };

  } else if (type === 'llm_load_progress') {
    // Relayer la progression du chargement à l'UI
    self.postMessage({
      type: 'llm_load_progress',
      payload: payload,
      meta: meta
    });
  } else if (type === 'init_complete') {
    logger.info('Orchestrator', 'LLM Worker initialisé');
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
 * Utilise le débat multi-agents pour les profils 'full' et les requêtes complexes en 'lite'
 */
function launchLLMInference(): void {
  logger.debug('Orchestrator', "Lancement de l'inférence LLM", undefined, currentQueryMeta?.traceId);
  
  const profile = currentQueryContext?.deviceProfile || 'micro';
  const queryLength = currentQueryContext?.query.length || 0;
  
  // Décider si on utilise le débat multi-agents
  const useMultiAgent = profile === 'full' || (profile === 'lite' && queryLength > 50);
  
  if (useMultiAgent) {
    logger.info('Orchestrator', 'Lancement du débat multi-agents pour une réponse enrichie', undefined, currentQueryMeta?.traceId);
    launchMultiAgentDebate();
  } else {
    logger.debug('Orchestrator', 'Mode inférence simple', { profile }, currentQueryMeta?.traceId);
    launchSimpleLLMInference();
  }
}

/**
 * Lance une inférence LLM simple (sans débat multi-agents)
 */
function launchSimpleLLMInference(): void {
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

  // Appeler le LLM Worker avec mode simple
  multiAgentState.currentStep = 'idle'; // Mode simple
  llmWorker.postMessage({ 
    type: 'generate_response', 
    payload: llmPayload,
    meta: currentQueryMeta || undefined
  });
}

/**
 * Lance le débat multi-agents (4 agents: Logique, Créatif, Critique, Synthétiseur)
 * Avec parallélisation intelligente: Logique + Créatif en parallèle
 */
function launchMultiAgentDebate(): void {
  logger.info('Orchestrator', 'Démarrage du débat multi-agents avec parallélisation', undefined, currentQueryMeta?.traceId);
  
  // Réinitialiser l'état
  multiAgentState = {
    currentStep: 'parallel_generation',
    logicalResponse: undefined,
    creativeResponse: undefined,
    criticalResponse: undefined,
    parallelResponses: { logical: false, creative: false }
  };
  
  // Lancer les agents Logique et Créatif en PARALLÈLE (gain de ~5s)
  self.postMessage({ 
    type: 'status_update', 
    payload: { 
      step: 'llm_reasoning', 
      details: 'Agents Logique et Créatif : Analyse parallèle...' 
    } as StatusUpdatePayload,
    meta: currentQueryMeta 
  });
  
  // Agent Logique
  llmWorker.postMessage({ 
    type: 'generate_response', 
    payload: {
      ...currentQueryContext!,
      context: currentMemoryHits,
      systemPrompt: LOGICAL_AGENT.systemPrompt,
      temperature: LOGICAL_AGENT.temperature,
      maxTokens: LOGICAL_AGENT.maxTokens,
      agentType: 'logical',
    },
    meta: currentQueryMeta || undefined
  });
  
  // Agent Créatif (lancé immédiatement après, en parallèle)
  llmWorker.postMessage({ 
    type: 'generate_response', 
    payload: {
      ...currentQueryContext!,
      context: currentMemoryHits,
      systemPrompt: CREATIVE_AGENT.systemPrompt,
      temperature: CREATIVE_AGENT.temperature,
      maxTokens: CREATIVE_AGENT.maxTokens,
      agentType: 'creative',
    },
    meta: currentQueryMeta || undefined
  });
}

/**
 * Recherche en mémoire avec retry automatique
 */
function searchMemoryWithRetry(): void {
  // Note: Dans un worker, on ne peut pas utiliser async/await dans le scope global
  // On envoie simplement le message, le retry sera géré côté memory worker si nécessaire
  memoryWorker.postMessage({ 
    type: 'search', 
    payload: { query: currentQueryContext!.query },
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
    logger.info('Orchestrator', 'Contexte compressé', { 
      originalCount: payload.originalCount, 
      compressedCount: payload.compressedCount 
    }, meta?.traceId);
    
    // Mettre à jour le contexte avec la version compressée
    if (currentQueryContext) {
      currentQueryContext.conversationHistory = payload.compressedMessages;
    }
    
    // Lancer l'inférence avec le contexte compressé
    launchLLMInference();
  } else if (type === 'init_complete') {
    logger.info('Orchestrator', 'ContextManager Worker initialisé');
  } else if (type === 'context_error') {
    logger.error('Orchestrator', 'Erreur ContextManager', { error: payload.error }, meta?.traceId);
    // En cas d'erreur, continuer avec le contexte non compressé
    launchLLMInference();
  }
};
