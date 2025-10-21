import { useRef, useEffect, useCallback } from "react";
import { WorkerMessage, QueryPayload, FinalResponsePayload, StatusUpdatePayload } from "@/types";
import type { LLMProgressPayload, MemoryImportPayload } from "@/types/worker-payloads";
import { FlowStep } from "@/utils/cognitiveFlowConstants";
import { DeviceProfile } from "@/utils/performance/deviceProfiler";
import { ProcessedFile } from "@/utils/fileProcessor";

interface UseOrchestratorWorkerProps {
  onStatusUpdate: (step: FlowStep, details: string) => void;
  onLoadProgress: (progress: { progress: number; text: string; loaded: number; total: number }) => void;
  onFinalResponse: (response: FinalResponsePayload, traceId?: string) => void;
  onExportComplete: () => void;
  onImportComplete: () => void;
  onPurgeComplete: () => void;
}

/**
 * Custom hook to manage the orchestrator worker lifecycle and communication
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
    // Initialize the orchestrator worker
    orchestratorWorker.current = new Worker(
      new URL('../../../workers/orchestrator.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Handle messages from the worker
    orchestratorWorker.current.onmessage = (event: MessageEvent<WorkerMessage<FinalResponsePayload | StatusUpdatePayload>>) => {
      const { type, payload, meta } = event.data;

      switch (type) {
        case 'status_update': {
          const statusPayload = payload as StatusUpdatePayload;
          onStatusUpdate(statusPayload.step, statusPayload.details);
          break;
        }
        case 'llm_load_progress': {
          const llmPayload = payload as LLMProgressPayload;
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
      }
    };

    // Handle worker errors
    orchestratorWorker.current.onerror = (error) => {
      console.error('[UI] Erreur du worker:', error);
    };

    console.log('[UI] Orchestrator Worker initialisé');

    // Cleanup on unmount
    return () => {
      orchestratorWorker.current?.terminate();
      console.log('[UI] Orchestrator Worker terminé.');
    };
  }, [onStatusUpdate, onLoadProgress, onFinalResponse, onExportComplete, onImportComplete, onPurgeComplete]);

  const sendQuery = useCallback((
    query: string,
    conversationHistory: { sender: 'user' | 'orion'; text: string; id?: string }[],
    deviceProfile: DeviceProfile | null,
    attachments?: ProcessedFile[]
  ) => {
    if (!orchestratorWorker.current) {
      console.error('[UI] Worker non initialisé');
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

    console.log(`[UI] Envoi de la requête avec traceId: ${traceId}`);
    orchestratorWorker.current.postMessage(message);
  }, []);

  const sendFeedback = useCallback((
    messageId: string,
    feedback: 'good' | 'bad',
    query: string,
    response: string
  ) => {
    if (!orchestratorWorker.current) return;

    const traceId = `trace_feedback_${Date.now()}`;
    const message: WorkerMessage = {
      type: 'feedback',
      payload: { messageId, feedback, query, response },
      meta: { traceId, timestamp: Date.now() }
    };
    orchestratorWorker.current.postMessage(message);
  }, []);

  const purgeMemory = useCallback(() => {
    if (!orchestratorWorker.current) return;

    const traceId = `trace_purge_${Date.now()}`;
    orchestratorWorker.current.postMessage({
      type: 'purge_memory',
      payload: {},
      meta: { traceId, timestamp: Date.now() }
    });
  }, []);

  const exportMemory = useCallback(() => {
    if (!orchestratorWorker.current) return;

    const traceId = `trace_export_${Date.now()}`;
    orchestratorWorker.current.postMessage({
      type: 'export_memory',
      payload: {},
      meta: { traceId, timestamp: Date.now() }
    });
  }, []);

  const importMemory = useCallback((data: string | Record<string, unknown>) => {
    if (!orchestratorWorker.current) return;

    const traceId = `trace_import_${Date.now()}`;
    const importPayload: MemoryImportPayload = { data };
    orchestratorWorker.current.postMessage({
      type: 'import_memory',
      payload: importPayload,
      meta: { traceId, timestamp: Date.now() }
    });
  }, []);

  const setModel = useCallback((modelId: string) => {
    if (!orchestratorWorker.current) return;

    orchestratorWorker.current.postMessage({
      type: 'set_model',
      payload: { modelId },
      meta: { traceId: `trace_model_${Date.now()}`, timestamp: Date.now() }
    });
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
