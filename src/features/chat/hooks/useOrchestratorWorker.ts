import { useRef, useEffect, useCallback } from "react";
import { WorkerMessage, QueryPayload, FinalResponsePayload, StatusUpdatePayload } from "@/types";
import type { LLMProgressPayload, MemoryImportPayload } from "@/types/worker-payloads";
import { FlowStep } from "@/utils/cognitiveFlowConstants";
import { DeviceProfile } from "@/utils/performance/deviceProfiler";
import { ProcessedFile } from "@/utils/fileProcessor";
import { logger } from "@/utils/logger";
import { errorLogger, UserMessages } from "@/utils/errorLogger";

/**
 * Props for the useOrchestratorWorker hook
 */
interface UseOrchestratorWorkerProps {
  /** Callback invoked when the orchestrator updates its processing status */
  onStatusUpdate: (step: FlowStep, details: string) => void;
  /** Callback for LLM model loading progress updates */
  onLoadProgress: (progress: { progress: number; text: string; loaded: number; total: number }) => void;
  /** Callback invoked when a final response is ready from the orchestrator */
  onFinalResponse: (response: FinalResponsePayload, traceId?: string) => void;
  /** Callback invoked when memory export completes */
  onExportComplete: () => void;
  /** Callback invoked when memory import completes */
  onImportComplete: () => void;
  /** Callback invoked when memory purge completes */
  onPurgeComplete: () => void;
}

/**
 * React hook to manage the orchestrator worker lifecycle and communication.
 * 
 * The orchestrator worker is the central coordinator in ORION's multi-worker architecture.
 * It manages:
 * - LLM worker (lazy-loaded)
 * - Memory worker (embeddings and vector search)
 * - Tool user worker (tool detection and execution)
 * - Context manager worker (conversation context optimization)
 * - Genius hour worker (background learning from feedback)
 * 
 * @param props - Configuration callbacks for worker events
 * @returns Object with methods to interact with the orchestrator worker
 * 
 * @example
 * ```tsx
 * const { sendQuery, purgeMemory } = useOrchestratorWorker({
 *   onStatusUpdate: (step, details) => console.log(step, details),
 *   onFinalResponse: (response) => setMessages(prev => [...prev, response]),
 *   // ... other callbacks
 * });
 * 
 * // Send a user query
 * sendQuery("What is TypeScript?", [], deviceProfile);
 * ```
 */
export function useOrchestratorWorker({
  onStatusUpdate,
  onLoadProgress,
  onFinalResponse,
  onExportComplete,
  onImportComplete,
  onPurgeComplete,
}: UseOrchestratorWorkerProps) {
  const orchestratorWorker = useRef<Worker | null>(null);

  useEffect(() => {
    try {
      // Initialize the orchestrator worker
      orchestratorWorker.current = new Worker(
        new URL('../../../workers/orchestrator.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Handle messages from the worker with error boundaries
      orchestratorWorker.current.onmessage = (event: MessageEvent<WorkerMessage<FinalResponsePayload | StatusUpdatePayload>>) => {
        try {
          const { type, payload, meta } = event.data;

          switch (type) {
            case 'status_update': {
              const statusPayload = payload as StatusUpdatePayload;
              onStatusUpdate(statusPayload.step, statusPayload.details);
              break;
            }
            case 'llm_load_progress': {
              const llmPayload = payload as unknown as LLMProgressPayload;
              onLoadProgress({
                progress: llmPayload.progress || 0,
                text: llmPayload.text || '',
                loaded: llmPayload.loaded || 0,
                total: llmPayload.total || 0,
              });
              break;
            }
            case 'export_complete':
              onExportComplete();
              break;
            case 'import_complete':
              onImportComplete();
              break;
            case 'purge_complete':
              onPurgeComplete();
              break;
            case 'final_response': {
              const finalPayload = payload as FinalResponsePayload;
              onFinalResponse(finalPayload, meta?.traceId);
              break;
            }
            default:
              logger.warn('OrchestratorWorker', `Unknown message type received: ${type}`);
          }
        } catch (error) {
          errorLogger.error(
            'OrchestratorWorker',
            'Error handling worker message',
            UserMessages.GENERIC_ERROR,
            error as Error,
            { messageType: event.data?.type }
          );
        }
      };

      // Handle worker errors with structured logging
      orchestratorWorker.current.onerror = (error) => {
        errorLogger.critical(
          'OrchestratorWorker',
          'Worker error occurred',
          UserMessages.WORKER_ERROR,
          error as unknown as Error
        );
      };

      logger.info('OrchestratorWorker', 'Worker initialized successfully');

      // Cleanup on unmount
      return () => {
        if (orchestratorWorker.current) {
          orchestratorWorker.current.terminate();
          logger.info('OrchestratorWorker', 'Worker terminated');
        }
      };
    } catch (error) {
      errorLogger.critical(
        'OrchestratorWorker',
        'Failed to initialize orchestrator worker',
        UserMessages.WORKER_INIT_FAILED,
        error as Error
      );
    }
  }, [onStatusUpdate, onLoadProgress, onFinalResponse, onExportComplete, onImportComplete, onPurgeComplete]);

  /**
   * Send a user query to the orchestrator for processing.
   * 
   * The query will be:
   * 1. Enriched with attachment context (if any)
   * 2. Analyzed for tools usage
   * 3. Searched against memory
   * 4. Routed to appropriate LLM agent(s)
   * 5. Processed with debate mechanism (if applicable)
   * 6. Returned via onFinalResponse callback
   * 
   * @param query - The user's question or prompt
   * @param conversationHistory - Previous messages for context
   * @param deviceProfile - Device capability profile (micro/lite/full)
   * @param attachments - Optional file attachments (images, text files, etc.)
   * 
   * @example
   * ```tsx
   * sendQuery(
   *   "Explain this code",
   *   previousMessages,
   *   'micro',
   *   [{ name: 'code.ts', content: '...', type: 'text/typescript' }]
   * );
   * ```
   */
  const sendQuery = useCallback((
    query: string,
    conversationHistory: { sender: 'user' | 'orion'; text: string; id?: string }[],
    deviceProfile: DeviceProfile | null,
    attachments?: ProcessedFile[]
  ) => {
    try {
      if (!orchestratorWorker.current) {
        errorLogger.error(
          'OrchestratorWorker',
          'Cannot send query: worker not initialized',
          UserMessages.WORKER_NOT_READY,
          new Error('Worker not initialized')
        );
        return;
      }

      // Enrich content with attachments
      let enrichedContent = query;
      if (attachments && attachments.length > 0) {
        const attachmentContext = attachments.map(file => {
          if (file.preview) {
            return `[Image jointe: ${file.name}, ${file.metadata?.width}x${file.metadata?.height}]`;
          } else {
            return `[Fichier joint: ${file.name}, contenu:\n${file.content.substring(0, 500)}${file.content.length > 500 ? '...' : ''}]`;
          }
        }).join('\n');
        
        enrichedContent = `${query}\n\n${attachmentContext}`;
      }

      const traceId = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const queryPayload: QueryPayload = {
        query: enrichedContent,
        conversationHistory,
        deviceProfile: deviceProfile || 'micro',
      };
      
      const message: WorkerMessage<QueryPayload> = {
        type: 'query',
        payload: queryPayload,
        meta: {
          traceId,
          timestamp: Date.now(),
        },
      };

      logger.info('OrchestratorWorker', 'Sending query to orchestrator', { 
        traceId,
        queryLength: query.length,
        hasAttachments: !!attachments?.length,
        deviceProfile: deviceProfile || 'micro'
      });
      
      orchestratorWorker.current.postMessage(message);
    } catch (error) {
      errorLogger.error(
        'OrchestratorWorker',
        'Error sending query',
        UserMessages.GENERIC_ERROR,
        error as Error,
        { query: query.substring(0, 100) }
      );
    }
  }, []);

  /**
   * Send user feedback (like/dislike) for a message to improve future responses.
   * 
   * Feedback is stored in memory and analyzed by the Genius Hour worker
   * to identify patterns and suggest improvements.
   * 
   * @param messageId - Unique identifier of the message being rated
   * @param feedback - User rating: 'good' or 'bad'
   * @param query - The original user query
   * @param response - The AI's response that's being rated
   */
  const sendFeedback = useCallback((
    messageId: string,
    feedback: 'good' | 'bad',
    query: string,
    response: string
  ) => {
    try {
      if (!orchestratorWorker.current) return;

      const traceId = `trace_feedback_${Date.now()}`;
      const message: WorkerMessage = {
        type: 'feedback',
        payload: { messageId, feedback, query, response },
        meta: { traceId, timestamp: Date.now() }
      };
      
      logger.info('OrchestratorWorker', 'Sending feedback', { messageId, feedback });
      orchestratorWorker.current.postMessage(message);
    } catch (error) {
      errorLogger.error(
        'OrchestratorWorker',
        'Error sending feedback',
        UserMessages.GENERIC_ERROR,
        error as Error,
        { messageId, feedback }
      );
    }
  }, []);

  /**
   * Purge all stored memory (embeddings, cached responses, etc.).
   * 
   * This will clear:
   * - Vector embeddings database
   * - Cached tool results
   * - Conversation context
   * - Genius Hour learnings
   * 
   * @warning This action is irreversible. Consider exporting memory first.
   */
  const purgeMemory = useCallback(() => {
    try {
      if (!orchestratorWorker.current) return;

      const traceId = `trace_purge_${Date.now()}`;
      logger.info('OrchestratorWorker', 'Purging memory', { traceId });
      
      orchestratorWorker.current.postMessage({
        type: 'purge_memory',
        payload: {},
        meta: { traceId, timestamp: Date.now() }
      });
    } catch (error) {
      errorLogger.error(
        'OrchestratorWorker',
        'Error purging memory',
        UserMessages.GENERIC_ERROR,
        error as Error
      );
    }
  }, []);

  /**
   * Export all memory data as JSON for backup or migration.
   * 
   * The exported data includes:
   * - Vector embeddings
   * - Conversation history
   * - Tool usage statistics
   * - User preferences
   * 
   * Result is delivered via the onExportComplete callback.
   */
  const exportMemory = useCallback(() => {
    try {
      if (!orchestratorWorker.current) return;

      const traceId = `trace_export_${Date.now()}`;
      logger.info('OrchestratorWorker', 'Exporting memory', { traceId });
      
      orchestratorWorker.current.postMessage({
        type: 'export_memory',
        payload: {},
        meta: { traceId, timestamp: Date.now() }
      });
    } catch (error) {
      errorLogger.error(
        'OrchestratorWorker',
        'Error exporting memory',
        UserMessages.GENERIC_ERROR,
        error as Error
      );
    }
  }, []);

  /**
   * Import previously exported memory data.
   * 
   * @param data - JSON string or object containing exported memory data
   * 
   * @throws Will log error if data format is invalid
   */
  const importMemory = useCallback((data: string | Record<string, unknown>) => {
    try {
      if (!orchestratorWorker.current) return;

      const traceId = `trace_import_${Date.now()}`;
      const importPayload: MemoryImportPayload = { data };
      
      logger.info('OrchestratorWorker', 'Importing memory', { traceId });
      
      orchestratorWorker.current.postMessage({
        type: 'import_memory',
        payload: importPayload,
        meta: { traceId, timestamp: Date.now() }
      });
    } catch (error) {
      errorLogger.error(
        'OrchestratorWorker',
        'Error importing memory',
        UserMessages.GENERIC_ERROR,
        error as Error
      );
    }
  }, []);

  /**
   * Switch the active LLM model.
   * 
   * This will:
   * 1. Unload the current model (if any)
   * 2. Load the new model (may take 10-30s depending on size)
   * 3. Notify UI via onLoadProgress callback
   * 
   * @param modelId - ID of the model to load (e.g., 'Phi-3-mini-4k-instruct-q4f16_1-MLC')
   * 
   * @example
   * ```tsx
   * setModel('Phi-3-mini-4k-instruct-q4f16_1-MLC');
   * ```
   */
  const setModel = useCallback((modelId: string) => {
    try {
      if (!orchestratorWorker.current) return;

      logger.info('OrchestratorWorker', 'Setting model', { modelId });
      
      orchestratorWorker.current.postMessage({
        type: 'set_model',
        payload: { modelId },
        meta: { traceId: `trace_model_${Date.now()}`, timestamp: Date.now() }
      });
    } catch (error) {
      errorLogger.error(
        'OrchestratorWorker',
        'Error setting model',
        UserMessages.GENERIC_ERROR,
        error as Error,
        { modelId }
      );
    }
  }, []);

  return {
    sendQuery,
    sendFeedback,
    purgeMemory,
    exportMemory,
    importMemory,
    setModel,
  };
}
