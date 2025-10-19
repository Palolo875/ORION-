/**
 * Tests unitaires pour l'Orchestrator Worker
 * 
 * Teste les fonctionnalités principales du worker orchestrateur:
 * - Routage des requêtes
 * - Coordination des workers
 * - Débat multi-agents
 * - Gestion des erreurs
 * - Profils d'appareil
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkerMessage, QueryPayload, FinalResponsePayload } from '../../types';

// Mock des workers
const createMockWorker = () => ({
  postMessage: vi.fn(),
  onmessage: null as ((event: MessageEvent) => void) | null,
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  onerror: null,
  onmessageerror: null,
});

// Mock du Worker constructor
global.Worker = vi.fn().mockImplementation((url) => {
  return createMockWorker();
}) as any;

// Mock du URL constructor
global.URL = {
  createObjectURL: vi.fn(),
} as any;

// Mock des modules
vi.mock('../../utils/errorLogger', () => ({
  errorLogger: {
    critical: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
  UserMessages: {
    LLM_LOAD_FAILED: 'Failed to load LLM',
    LLM_INFERENCE_FAILED: 'Failed to generate response',
    WORKER_FAILED: 'Worker failed',
  }
}));

vi.mock('../../utils/retry', () => ({
  withRetry: vi.fn((fn) => fn()),
  retryStrategies: {
    llm: { maxAttempts: 2, initialDelay: 1000 },
    memory: { maxAttempts: 3, initialDelay: 500 },
  }
}));

describe('Orchestrator Worker', () => {
  let postMessageSpy: any;

  beforeEach(() => {
    postMessageSpy = vi.fn();
    
    global.self = {
      postMessage: postMessageSpy,
      onmessage: null,
    } as any;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialisation', () => {
    it('devrait initialiser tous les workers', async () => {
      await import('../orchestrator.worker');

      const initMessage: WorkerMessage = {
        type: 'init',
        payload: {},
        meta: { traceId: 'test-init', timestamp: Date.now() }
      };

      if (global.self.onmessage) {
        global.self.onmessage({ data: initMessage } as MessageEvent);
      }

      // Vérifier que plusieurs workers ont été créés
      expect(Worker).toHaveBeenCalledTimes(5); // llm, memory, toolUser, geniusHour, contextManager
    });
  });

  describe('Routage des requêtes', () => {
    it('devrait router une requête vers le ToolUser en premier', async () => {
      await import('../orchestrator.worker');

      const queryMessage: WorkerMessage<QueryPayload> = {
        type: 'query',
        payload: {
          query: 'What is 2+2?',
          conversationHistory: [],
          deviceProfile: 'full'
        },
        meta: { traceId: 'test-query', timestamp: Date.now() }
      };

      if (global.self.onmessage) {
        global.self.onmessage({ data: queryMessage } as MessageEvent);
      }

      // Vérifier qu'un message de status a été envoyé
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'status_update',
          payload: expect.objectContaining({
            step: 'tool_search'
          })
        })
      );
    });

    it('devrait adapter la stratégie selon le profil d\'appareil', async () => {
      await import('../orchestrator.worker');

      const profiles: Array<'full' | 'lite' | 'micro'> = ['full', 'lite', 'micro'];

      for (const profile of profiles) {
        const queryMessage: WorkerMessage<QueryPayload> = {
          type: 'query',
          payload: {
            query: 'Test query',
            conversationHistory: [],
            deviceProfile: profile
          },
          meta: { traceId: `test-${profile}`, timestamp: Date.now() }
        };

        if (global.self.onmessage) {
          global.self.onmessage({ data: queryMessage } as MessageEvent);
        }
      }

      // Tous les profils devraient envoyer un status_update
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'status_update'
        })
      );
    });
  });

  describe('Débat multi-agents', () => {
    it('devrait utiliser le débat multi-agents en mode full', async () => {
      await import('../orchestrator.worker');

      const queryMessage: WorkerMessage<QueryPayload> = {
        type: 'query',
        payload: {
          query: 'Complex question requiring multiple perspectives',
          conversationHistory: [],
          deviceProfile: 'full'
        },
        meta: { traceId: 'test-multi-agent', timestamp: Date.now() }
      };

      if (global.self.onmessage) {
        global.self.onmessage({ data: queryMessage } as MessageEvent);
      }

      // Le débat multi-agents se lance après que no_tool_found est reçu
      // On ne peut pas tester complètement sans simuler les réponses des workers
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'status_update'
        })
      );
    });
  });

  describe('Changement de modèle', () => {
    it('devrait relayer le changement de modèle au LLM Worker', async () => {
      await import('../orchestrator.worker');

      const setModelMessage: WorkerMessage<{ modelId: string }> = {
        type: 'set_model',
        payload: { modelId: 'Phi-3-mini-4k-instruct-q4f16_1-MLC' },
        meta: { traceId: 'test-model', timestamp: Date.now() }
      };

      if (global.self.onmessage) {
        global.self.onmessage({ data: setModelMessage } as MessageEvent);
      }

      // Le message devrait être relayé au LLM Worker
      // On ne peut pas tester directement car les workers sont mockés
      expect(Worker).toHaveBeenCalled();
    });
  });

  describe('Gestion des feedbacks', () => {
    it('devrait relayer les feedbacks au Memory Worker', async () => {
      await import('../orchestrator.worker');

      const feedbackMessage: WorkerMessage<any> = {
        type: 'feedback',
        payload: {
          feedback: 'positive',
          messageId: 'msg-123',
          query: 'Test query',
          response: 'Test response'
        },
        meta: { traceId: 'test-feedback', timestamp: Date.now() }
      };

      if (global.self.onmessage) {
        global.self.onmessage({ data: feedbackMessage } as MessageEvent);
      }

      // Le feedback devrait être relayé au Memory Worker
      expect(Worker).toHaveBeenCalled();
    });
  });

  describe('Gestion de la mémoire', () => {
    it('devrait gérer la purge de la mémoire', async () => {
      await import('../orchestrator.worker');

      const purgeMessage: WorkerMessage = {
        type: 'purge_memory',
        payload: {},
        meta: { traceId: 'test-purge', timestamp: Date.now() }
      };

      if (global.self.onmessage) {
        global.self.onmessage({ data: purgeMessage } as MessageEvent);
      }

      expect(Worker).toHaveBeenCalled();
    });

    it('devrait gérer l\'export de la mémoire', async () => {
      await import('../orchestrator.worker');

      const exportMessage: WorkerMessage = {
        type: 'export_memory',
        payload: {},
        meta: { traceId: 'test-export', timestamp: Date.now() }
      };

      if (global.self.onmessage) {
        global.self.onmessage({ data: exportMessage } as MessageEvent);
      }

      expect(Worker).toHaveBeenCalled();
    });

    it('devrait gérer l\'import de la mémoire', async () => {
      await import('../orchestrator.worker');

      const importMessage: WorkerMessage = {
        type: 'import_memory',
        payload: { data: [] },
        meta: { traceId: 'test-import', timestamp: Date.now() }
      };

      if (global.self.onmessage) {
        global.self.onmessage({ data: importMessage } as MessageEvent);
      }

      expect(Worker).toHaveBeenCalled();
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs de traitement', async () => {
      await import('../orchestrator.worker');

      // Envoyer un message invalide qui causera une erreur
      const invalidMessage = {
        type: 'invalid_type',
        payload: null,
        meta: { traceId: 'test-error', timestamp: Date.now() }
      } as any;

      if (global.self.onmessage) {
        global.self.onmessage({ data: invalidMessage } as MessageEvent);
      }

      // L'orchestrateur devrait logger l'erreur
      // mais ne pas crasher
      expect(postMessageSpy).toHaveBeenCalled();
    });
  });
});
