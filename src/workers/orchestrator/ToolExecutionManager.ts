// src/workers/orchestrator/ToolExecutionManager.ts

/**
 * Tool Execution Manager
 * 
 * Gère l'exécution des outils et les stratégies de dégradation gracieuse.
 * Responsable de la détection et de l'exécution des outils appropriés.
 */

import { QueryPayload, WorkerMessage, StatusUpdatePayload, FinalResponsePayload } from '../../types';
import { ToolExecutionPayload, ToolErrorPayload } from '../../types/worker-payloads';
import { logger } from '../../utils/logger';

export class ToolExecutionManager {
  private toolUserWorker: Worker;
  private startTime: number = 0;
  private currentQueryContext: QueryPayload | null = null;
  private currentQueryMeta: WorkerMessage['meta'] | null = null;

  constructor(toolUserWorker: Worker) {
    this.toolUserWorker = toolUserWorker;
  }

  /**
   * Lance la recherche et l'exécution d'un outil
   */
  findAndExecuteTool(
    queryContext: QueryPayload,
    queryMeta: WorkerMessage['meta'] | null,
    startTime: number
  ): void {
    this.currentQueryContext = queryContext;
    this.currentQueryMeta = queryMeta;
    this.startTime = startTime;

    const profile = queryContext.deviceProfile || 'micro';
    
    logger.debug('ToolExecutionManager', `Recherche d'outil pour profil '${profile}'`, undefined, queryMeta?.traceId);
    
    // Envoyer une mise à jour de statut
    self.postMessage({ 
      type: 'status_update', 
      payload: { 
        step: 'tool_search', 
        details: 'Analyse de la requête pour une action possible...' 
      } as StatusUpdatePayload,
      meta: this.currentQueryMeta 
    });

    // Demander au ToolUser de trouver et exécuter un outil
    this.toolUserWorker.postMessage({ 
      type: 'find_and_execute_tool', 
      payload: { query: queryContext.query },
      meta: this.currentQueryMeta 
    });
  }

  /**
   * Traite le succès de l'exécution d'un outil
   */
  handleToolSuccess(
    toolPayload: ToolExecutionPayload,
    memoryWorker: Worker
  ): FinalResponsePayload {
    const endTime = performance.now();
    const inferenceTimeMs = Math.round(endTime - this.startTime);
    
    logger.info('ToolExecutionManager', `Outil exécuté - réponse directe`, { 
      toolName: toolPayload.toolName,
      inferenceTimeMs
    });

    const responsePayload: FinalResponsePayload = {
      response: toolPayload.result,
      confidence: 1.0,
      provenance: { 
        toolUsed: toolPayload.toolName,
        memoryHits: [],
        fromAgents: undefined
      },
      debug: {
        totalRounds: 0,
        inferenceTimeMs: inferenceTimeMs
      }
    };

    // Sauvegarder la conversation avec le type approprié
    const memoryToSave = `Q: ${this.currentQueryContext!.query} | A: ${toolPayload.result}`;
    memoryWorker.postMessage({ 
      type: 'store', 
      payload: { content: memoryToSave, type: 'tool_result' },
      meta: this.currentQueryMeta || undefined
    });

    return responsePayload;
  }

  /**
   * Traite l'échec ou l'absence d'outil
   * Retourne true si on doit continuer avec le LLM
   */
  handleNoTool(
    errorPayload?: ToolErrorPayload
  ): { shouldContinue: boolean; response?: FinalResponsePayload } {
    if (errorPayload) {
      logger.error('ToolExecutionManager', 'Erreur du ToolUser', { 
        error: errorPayload.error,
        toolName: errorPayload.toolName
      });
    }
    
    const profile = this.currentQueryContext?.deviceProfile || 'micro';
    
    if (profile === 'micro') {
      // En mode micro, si aucun outil n'est trouvé, on envoie une réponse simple
      logger.debug('ToolExecutionManager', "Mode 'micro': Aucun outil trouvé. Réponse simplifiée", undefined, this.currentQueryMeta?.traceId);
      
      const endTime = performance.now();
      const response: FinalResponsePayload = {
        response: "Je ne peux pas répondre à cette question en mode 'micro' car aucun outil n'est disponible. Les capacités de votre appareil sont limitées, donc je privilégie la réactivité plutôt que la profondeur de raisonnement.",
        confidence: 0.3,
        provenance: { fromAgents: ['FallbackStrategy'] },
        debug: { inferenceTimeMs: Math.round(endTime - this.startTime) }
      };
      
      return { shouldContinue: false, response };
    }
    
    // Pour 'full' et 'lite', on continue avec le LLM
    logger.debug('ToolExecutionManager', 'Aucun outil applicable. Continuation vers mémoire et LLM', undefined, this.currentQueryMeta?.traceId);
    return { shouldContinue: true };
  }

  /**
   * Réinitialise l'état du manager
   */
  reset(): void {
    this.currentQueryContext = null;
    this.currentQueryMeta = null;
    this.startTime = 0;
  }

  /**
   * Obtient le contexte actuel de la requête
   */
  getCurrentContext(): { context: QueryPayload | null; meta: WorkerMessage['meta'] | null } {
    return {
      context: this.currentQueryContext,
      meta: this.currentQueryMeta
    };
  }
}
