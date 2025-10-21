// src/workers/orchestrator.worker.ts

/**
 * Orchestrator Worker - Refactorisé
 * 
 * Ce worker est le chef d'orchestre du Neural Mesh d'ORION.
 * Il a été refactorisé en modules séparés pour une meilleure maintenabilité.
 */

import type { WorkerMessage, QueryPayload, FinalResponsePayload, StatusUpdatePayload } from '../types';
import type { SetModelPayload, FeedbackPayload, ToolExecutionPayload, ToolErrorPayload, LLMErrorPayload } from '../types/worker-payloads';
import { errorLogger, UserMessages } from '../utils/errorLogger';
import { logger } from '../utils/logger';
import { get, keys } from 'idb-keyval';
import type { AmbientContext } from '../types/ambient-context';

// Modules refactorisés
import { MultiAgentCoordinator } from './orchestrator/MultiAgentCoordinator';
import { ToolExecutionManager } from './orchestrator/ToolExecutionManager';
import { ResponseFormatter } from './orchestrator/ResponseFormatter';
import { WorkerHealthMonitor } from './orchestrator/WorkerHealthMonitor';
import { CircuitBreaker } from './orchestrator/CircuitBreaker';

logger.info('Orchestrator', 'Worker chargé et prêt (version refactorisée)');

// === Lazy worker instances ===
// LLM worker is lazily loaded to avoid loading 5.4MB @mlc-ai/web-llm until actually needed
let llmWorker: Worker | null = null;

// Other workers are created immediately as they are lightweight
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

logger.info('Orchestrator', 'Workers essentiels instanciés (LLM en lazy loading)', { workers: ['Memory', 'ToolUser', 'GeniusHour', 'ContextManager'] });

/**
 * Lazy loader pour le LLM worker
 * Ne charge le worker que quand il est vraiment nécessaire
 */
function getLLMWorker(): Worker {
  if (llmWorker === null) {
    logger.info('Orchestrator', 'Chargement lazy du LLM Worker (~5.4MB)');
    llmWorker = new Worker(new URL('./llm.worker.ts', import.meta.url), {
      type: 'module',
    });
    setupLLMWorkerListener();
    logger.info('Orchestrator', 'LLM Worker chargé avec succès');
  }
  return llmWorker;
}

// === Instanciation des gestionnaires ===
// Le MultiAgentCoordinator reçoit une fonction pour obtenir le worker
const multiAgentCoordinator = new MultiAgentCoordinator(getLLMWorker);
const toolExecutionManager = new ToolExecutionManager(toolUserWorker);
const responseFormatter = new ResponseFormatter();
const healthMonitor = new WorkerHealthMonitor();
const circuitBreaker = new CircuitBreaker();

// === Variables d'état ===
let currentQueryContext: QueryPayload | null = null;
let currentQueryMeta: WorkerMessage['meta'] | null = null;
let startTime: number = 0;
let currentMemoryHits: string[] = [];
let currentAmbientContext: string = '';

// === Gestionnaire de messages principal ===

self.onmessage = (event: MessageEvent<WorkerMessage<unknown>>) => {
  const { type, payload, meta } = event.data;

  try {
    if (type === 'query') {
      handleQuery(payload as QueryPayload, meta);
    } else if (type === 'init') {
      handleInit();
    } else if (type === 'set_model') {
      handleSetModel(payload as unknown as SetModelPayload, meta);
    } else if (type === 'feedback') {
      handleFeedback(payload as unknown as FeedbackPayload, meta);
    } else if (type === 'purge_memory') {
      handlePurgeMemory(meta);
    } else if (type === 'export_memory') {
      handleExportMemory(meta);
    } else if (type === 'import_memory') {
      handleImportMemory(payload, meta);
    } else {
      logger.warn('Orchestrator', 'Type de message inconnu', { type });
    }
  } catch (error) {
    handleError(error as Error, type, meta);
  }
};

// === Gestionnaires de messages ===

function handleQuery(payload: QueryPayload, meta?: WorkerMessage['meta']): void {
  logger.info('Orchestrator', 'Requête reçue', { 
    query: payload.query.substring(0, 100),
    deviceProfile: payload.deviceProfile || 'micro'
  }, meta?.traceId);

  // Vérifier le circuit breaker
  if (!circuitBreaker.canExecute('query_processing')) {
    const errorResponse = responseFormatter.formatErrorResponse(
      'Le système est temporairement surchargé. Veuillez réessayer dans quelques instants.',
      'Circuit breaker ouvert'
    );
    self.postMessage({ 
      type: 'final_response', 
      payload: errorResponse,
      meta 
    });
    return;
  }

  // Sauvegarder le contexte
  currentQueryContext = payload;
  currentQueryMeta = meta || null;
  startTime = performance.now();

  // Lancer le traitement avec le ToolExecutionManager
  try {
    toolExecutionManager.findAndExecuteTool(payload, meta || null, startTime);
    healthMonitor.recordSuccess('toolUser');
    circuitBreaker.recordSuccess('query_processing');
  } catch (error) {
    healthMonitor.recordFailure('toolUser', (error as Error).message);
    circuitBreaker.recordFailure('query_processing', (error as Error).message);
    throw error;
  }
}

function handleInit(): void {
  logger.info('Orchestrator', 'Initialization');
  
  // Initialiser tous les workers sauf LLM (lazy loaded) avec monitoring
  const workers = [
    { worker: memoryWorker, name: 'memory' },
    { worker: toolUserWorker, name: 'toolUser' },
    { worker: contextManagerWorker, name: 'contextManager' },
  ];

  for (const { worker, name } of workers) {
    try {
      worker.postMessage({ type: 'init' });
      healthMonitor.recordSuccess(name);
    } catch (error) {
      healthMonitor.recordFailure(name, (error as Error).message);
      logger.error('Orchestrator', `Erreur d'initialisation de ${name}`, error);
    }
  }

  logger.info('Orchestrator', 'GeniusHour Worker démarré en arrière-plan');
  logger.info('Orchestrator', 'LLM Worker sera chargé à la première utilisation (lazy loading)');
}

function handleSetModel(payload: SetModelPayload, meta?: WorkerMessage['meta']): void {
  logger.info('Orchestrator', `Changement de modèle: ${payload.modelId}`, { modelId: payload.modelId });
  
  try {
    // Charger le LLM worker si nécessaire
    const worker = getLLMWorker();
    worker.postMessage({ type: 'set_model', payload, meta });
    healthMonitor.recordSuccess('llm');
  } catch (error) {
    healthMonitor.recordFailure('llm', (error as Error).message);
    throw error;
  }
}

function handleFeedback(payload: FeedbackPayload, meta?: WorkerMessage['meta']): void {
  logger.info('Orchestrator', `Feedback reçu`, { 
    feedback: payload.feedback, 
    messageId: payload.messageId,
  });
  
  try {
    memoryWorker.postMessage({ 
      type: 'add_feedback', 
      payload,
      meta 
    });
    healthMonitor.recordSuccess('memory');
  } catch (error) {
    healthMonitor.recordFailure('memory', (error as Error).message);
    throw error;
  }
}

function handlePurgeMemory(meta?: WorkerMessage['meta']): void {
  logger.info('Orchestrator', 'Purge de la mémoire demandée', undefined, meta?.traceId);
  memoryWorker.postMessage({ 
    type: 'purge_all', 
    payload: {},
    meta 
  });
}

function handleExportMemory(meta?: WorkerMessage['meta']): void {
  logger.info('Orchestrator', 'Export de la mémoire demandée', undefined, meta?.traceId);
  memoryWorker.postMessage({ 
    type: 'export_all', 
    payload: {},
    meta 
  });
}

function handleImportMemory(payload: unknown, meta?: WorkerMessage['meta']): void {
  logger.info('Orchestrator', 'Import de la mémoire demandée', undefined, meta?.traceId);
  memoryWorker.postMessage({ 
    type: 'import_all', 
    payload,
    meta 
  });
}

function handleError(error: Error, type: string, meta?: WorkerMessage['meta']): void {
  errorLogger.error(
    'Orchestrator',
    `Error processing message: ${error.message}`,
    UserMessages.WORKER_FAILED,
    error,
    { type, traceId: meta?.traceId }
  );
  
  const errorResponse = responseFormatter.formatErrorResponse(
    UserMessages.WORKER_FAILED + ' Veuillez réessayer.',
    error.message
  );
  
  self.postMessage({
    type: 'final_response',
    payload: errorResponse,
    meta
  });
}

// === Écouteurs des workers ===

// ToolUser Worker
toolUserWorker.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  try {
    if (type === 'tool_executed') {
      const toolPayload = payload as ToolExecutionPayload;
      const responsePayload = toolExecutionManager.handleToolSuccess(toolPayload, memoryWorker);
      
      self.postMessage({ 
        type: 'final_response', 
        payload: responsePayload,
        meta: currentQueryMeta || undefined
      });
      
      resetState();
      healthMonitor.recordSuccess('toolUser');
      circuitBreaker.recordSuccess('tool_execution');

    } else if (type === 'no_tool_found' || type === 'tool_error') {
      const errorPayload = type === 'tool_error' ? payload as ToolErrorPayload : undefined;
      const result = toolExecutionManager.handleNoTool(errorPayload);
      
      if (!result.shouldContinue) {
        // Envoyer la réponse de fallback
        self.postMessage({ 
          type: 'final_response', 
          payload: result.response!,
          meta: currentQueryMeta || undefined
        });
        resetState();
      } else {
        // Continuer avec la recherche en mémoire
        proceedToMemorySearch();
      }
      
      if (type === 'tool_error') {
        healthMonitor.recordFailure('toolUser', errorPayload?.error || 'Unknown error');
        circuitBreaker.recordFailure('tool_execution', errorPayload?.error || 'Unknown error');
      }

    } else if (type === 'init_complete') {
      logger.info('Orchestrator', 'ToolUser Worker initialisé');
      healthMonitor.recordSuccess('toolUser');
    }
  } catch (error) {
    healthMonitor.recordFailure('toolUser', (error as Error).message);
    handleError(error as Error, type, currentQueryMeta || undefined);
  }
};

// Memory Worker
memoryWorker.onmessage = (event: MessageEvent<WorkerMessage<{ results: Array<{ content?: string }> }>>) => {
  const { type, payload, meta } = event.data;

  if (meta?.traceId !== currentQueryMeta?.traceId && type !== 'init_complete' && type !== 'store_complete') {
    return;
  }

  try {
    if (type === 'search_result') {
      currentMemoryHits = payload.results.map((r) => r.content || '').filter(c => c.length > 0);
      
      if (currentMemoryHits.length > 0) {
        logger.debug('Orchestrator', 'Contexte reçu', { memoryCount: currentMemoryHits.length }, meta?.traceId);
      }
      
      // Compresser le contexte si nécessaire
      if (currentQueryContext && currentQueryContext.conversationHistory.length > 10) {
        compressContext();
      } else {
        launchLLMInference();
      }
      
      healthMonitor.recordSuccess('memory');

    } else if (type === 'store_complete') {
      logger.debug('Orchestrator', 'Mémoire sauvegardée');
      healthMonitor.recordSuccess('memory');

    } else if (type === 'init_complete') {
      logger.info('Orchestrator', 'Memory Worker initialisé');
      healthMonitor.recordSuccess('memory');

    } else if (type === 'purge_complete' || type === 'export_complete' || type === 'import_complete') {
      self.postMessage({ type, payload, meta });
      healthMonitor.recordSuccess('memory');
    }
  } catch (error) {
    healthMonitor.recordFailure('memory', (error as Error).message);
    handleError(error as Error, type, meta || undefined);
  }
};

/**
 * Configure l'écouteur pour le LLM Worker
 * Appelé après la création lazy du worker
 */
function setupLLMWorkerListener(): void {
  if (!llmWorker) return;
  
  llmWorker.onmessage = (event: MessageEvent<WorkerMessage>) => {
    const { type, payload, meta } = event.data;

    if (meta?.traceId !== currentQueryMeta?.traceId && type !== 'init_complete' && type !== 'llm_load_progress') {
      return;
    }

    try {
      if (type === 'llm_response_complete') {
        const llmPayload = payload as { response: string; agentType?: string };
        
        const isDebateComplete = multiAgentCoordinator.handleAgentResponse(
          llmPayload.response,
          llmPayload.agentType
        );

        if (isDebateComplete || !multiAgentCoordinator.isDebateActive()) {
          handleFinalResponse(llmPayload.response);
        }
        
        healthMonitor.recordSuccess('llm');
        circuitBreaker.recordSuccess('llm_inference');

      } else if (type === 'llm_error') {
        const errorPayload = payload as LLMErrorPayload;
        handleLLMError(errorPayload, meta);
        healthMonitor.recordFailure('llm', errorPayload.error);
        circuitBreaker.recordFailure('llm_inference', errorPayload.error);

      } else if (type === 'llm_load_progress') {
        self.postMessage({ type, payload, meta });

      } else if (type === 'init_complete') {
        logger.info('Orchestrator', 'LLM Worker initialisé');
        healthMonitor.recordSuccess('llm');
      }
    } catch (error) {
      healthMonitor.recordFailure('llm', (error as Error).message);
      handleError(error as Error, type, meta || undefined);
    }
  };
}

// ContextManager Worker
contextManagerWorker.onmessage = (event: MessageEvent) => {
  const { type, payload, meta } = event.data;

  if (meta?.traceId !== currentQueryMeta?.traceId && type !== 'init_complete') {
    return;
  }

  try {
    if (type === 'context_compressed') {
      logger.info('Orchestrator', 'Contexte compressé', { 
        originalCount: payload.originalCount, 
        compressedCount: payload.compressedCount 
      }, meta?.traceId);
      
      if (currentQueryContext) {
        currentQueryContext.conversationHistory = payload.compressedMessages;
      }
      
      launchLLMInference();
      healthMonitor.recordSuccess('contextManager');

    } else if (type === 'init_complete') {
      logger.info('Orchestrator', 'ContextManager Worker initialisé');
      healthMonitor.recordSuccess('contextManager');

    } else if (type === 'context_error') {
      logger.error('Orchestrator', 'Erreur ContextManager', { error: payload.error }, meta?.traceId);
      launchLLMInference(); // Continuer sans compression
      healthMonitor.recordFailure('contextManager', payload.error);
    }
  } catch (error) {
    healthMonitor.recordFailure('contextManager', (error as Error).message);
    handleError(error as Error, type, meta || undefined);
  }
};

// === Fonctions auxiliaires ===

async function getAmbientContext(): Promise<string> {
  try {
    const STORAGE_KEY_PREFIX = 'orion_ambient_context_';
    const allKeys = await keys();
    const contextKeys = allKeys.filter(k => 
      typeof k === 'string' && k.startsWith(STORAGE_KEY_PREFIX)
    ) as string[];
    
    const activeContexts: AmbientContext[] = [];
    
    for (const key of contextKeys) {
      try {
        const context = await get<AmbientContext>(key);
        if (context && context.isActive) {
          activeContexts.push(context);
        }
      } catch (error) {
        logger.error('Orchestrator', `Erreur lecture contexte ${key}`, error);
      }
    }
    
    if (activeContexts.length === 0) {
      return '';
    }

    const formatted = activeContexts
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((ctx, idx) => {
        const title = ctx.title ? `[${ctx.title}] ` : '';
        return `${idx + 1}. ${title}${ctx.content}`;
      })
      .join('\n');

    return `CONTEXTE AMBIANT (Information persistante à prendre en compte):\n${formatted}\n`;
  } catch (error) {
    logger.error('Orchestrator', 'Erreur lors de la récupération du contexte ambiant', error);
    return ''; // Fallback silencieux
  }
}

async function proceedToMemorySearch(): Promise<void> {
  // Récupérer le contexte ambiant en premier
  currentAmbientContext = await getAmbientContext();
  
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

function compressContext(): void {
  logger.debug('Orchestrator', 'Compression du contexte', undefined, currentQueryMeta?.traceId);
  contextManagerWorker.postMessage({
    type: 'compress_context',
    payload: {
      messages: currentQueryContext!.conversationHistory,
      maxTokens: 3000
    },
    meta: currentQueryMeta || undefined
  });
}

function launchLLMInference(): void {
  if (!circuitBreaker.canExecute('llm_inference')) {
    const errorResponse = responseFormatter.formatErrorResponse(
      'Le système LLM est temporairement indisponible. Veuillez réessayer.',
      'Circuit breaker ouvert pour LLM'
    );
    self.postMessage({ 
      type: 'final_response', 
      payload: errorResponse,
      meta: currentQueryMeta || undefined
    });
    resetState();
    return;
  }

  logger.debug('Orchestrator', "Lancement de l'inférence LLM", undefined, currentQueryMeta?.traceId);
  
  // Combiner contexte ambiant avec memory hits
  const enrichedContext = currentAmbientContext 
    ? [currentAmbientContext, ...currentMemoryHits]
    : currentMemoryHits;
  
  const profile = currentQueryContext?.deviceProfile || 'micro';
  const queryLength = currentQueryContext?.query.length || 0;
  const useMultiAgent = profile === 'full' || (profile === 'lite' && queryLength > 50);
  
  if (useMultiAgent) {
    logger.info('Orchestrator', 'Lancement du débat multi-agents', { 
      hasAmbientContext: !!currentAmbientContext 
    }, currentQueryMeta?.traceId);
    multiAgentCoordinator.launchDebate(currentQueryContext!, currentQueryMeta, enrichedContext);
  } else {
    logger.debug('Orchestrator', 'Mode inférence simple', { profile }, currentQueryMeta?.traceId);
    launchSimpleLLMInference(enrichedContext);
  }
}

function launchSimpleLLMInference(enrichedContext?: string[]): void {
  self.postMessage({ 
    type: 'status_update', 
    payload: { 
      step: 'llm_reasoning', 
      details: 'Génération de la réponse par le LLM...' 
    } as StatusUpdatePayload,
    meta: currentQueryMeta 
  });
  
  // Charger le LLM worker si nécessaire
  const worker = getLLMWorker();
  worker.postMessage({ 
    type: 'generate_response', 
    payload: {
      ...currentQueryContext!,
      context: enrichedContext || currentMemoryHits,
    },
    meta: currentQueryMeta || undefined
  });
}

function handleFinalResponse(response: string): void {
  const endTime = performance.now();
  const inferenceTimeMs = Math.round(endTime - startTime);
  
  logger.info('Orchestrator', 'Réponse finale reçue', { inferenceTimeMs }, currentQueryMeta?.traceId);

  let finalPayload: FinalResponsePayload;

  if (multiAgentCoordinator.isDebateActive()) {
    const debateResponses = multiAgentCoordinator.getDebateResponses();
    finalPayload = responseFormatter.formatMultiAgentResponse(
      response,
      debateResponses,
      currentMemoryHits,
      inferenceTimeMs,
      currentQueryMeta
    );
  } else {
    finalPayload = responseFormatter.formatSimpleResponse(
      response,
      currentQueryContext!,
      currentMemoryHits,
      inferenceTimeMs,
      currentQueryMeta
    );
  }

  self.postMessage({ 
    type: 'final_response', 
    payload: finalPayload, 
    meta: currentQueryMeta || undefined
  });

  // Sauvegarder la conversation
  if (currentQueryContext) {
    const memoryToSave = `Q: ${currentQueryContext.query} | A: ${response}`;
    memoryWorker.postMessage({ 
      type: 'store', 
      payload: { content: memoryToSave, type: 'conversation' }, 
      meta: currentQueryMeta || undefined
    });
  }

  resetState();
}

function handleLLMError(errorPayload: LLMErrorPayload, meta?: WorkerMessage['meta']): void {
  errorLogger.error(
    'Orchestrator',
    `LLM error: ${errorPayload.error}`,
    UserMessages.LLM_INFERENCE_FAILED,
    undefined,
    { query: currentQueryContext?.query?.substring(0, 100), traceId: meta?.traceId }
  );
  
  const finalPayload = responseFormatter.formatErrorResponse(
    UserMessages.LLM_INFERENCE_FAILED,
    errorPayload.error
  );
  
  self.postMessage({ 
    type: 'final_response', 
    payload: finalPayload, 
    meta: currentQueryMeta || undefined
  });

  resetState();
}

function resetState(): void {
  currentMemoryHits = [];
  currentQueryContext = null;
  currentQueryMeta = null;
  currentAmbientContext = '';
  multiAgentCoordinator.reset();
  toolExecutionManager.reset();
}
