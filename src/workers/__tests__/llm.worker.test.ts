/**
 * Tests unitaires pour le LLM Worker
 * 
 * Teste les fonctionnalités principales du worker LLM:
 * - Initialisation du moteur
 * - Génération de réponses
 * - Changement de modèle
 * - Gestion des erreurs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkerMessage, QueryPayload } from '../../types';

// Mock du module @mlc-ai/web-llm
vi.mock('@mlc-ai/web-llm', () => ({
  WebWorkerMLCEngine: {
    create: vi.fn().mockResolvedValue({
      reload: vi.fn().mockResolvedValue(undefined),
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: 'Test response from LLM'
                }
              }
            ]
          })
        }
      }
    })
  }
}));

// Mock du errorLogger
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
  }
}));

// Mock du retry
vi.mock('../../utils/retry', () => ({
  withRetry: vi.fn((fn) => fn()),
  retryStrategies: {
    llm: {
      maxAttempts: 2,
      initialDelay: 1000,
      maxDelay: 3000,
      backoffFactor: 1.5,
    }
  }
}));

describe('LLM Worker', () => {
  let worker: Worker;
  let messageHandler: (event: MessageEvent) => void;
  let postMessageSpy: any;

  beforeEach(() => {
    // Simuler le worker
    postMessageSpy = vi.fn();
    
    // Mock de self.postMessage
    global.self = {
      postMessage: postMessageSpy,
      onmessage: null,
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialisation', () => {
    it('devrait répondre à un message init', async () => {
      const { default: workerModule } = await import('../llm.worker');
      
      const initMessage: WorkerMessage = {
        type: 'init',
        payload: {},
        meta: { traceId: 'test-123', timestamp: Date.now() }
      };

      // Simuler la réception du message
      if (global.self.onmessage) {
        global.self.onmessage({ data: initMessage } as MessageEvent);
      }

      // Attendre que les promesses se résolvent
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'init_complete',
          meta: initMessage.meta
        })
      );
    });
  });

  describe('Changement de modèle', () => {
    it('devrait permettre de changer le modèle', async () => {
      await import('../llm.worker');

      const setModelMessage: WorkerMessage<{ modelId: string }> = {
        type: 'set_model',
        payload: { modelId: 'Phi-3-mini-4k-instruct-q4f16_1-MLC' },
        meta: { traceId: 'test-456', timestamp: Date.now() }
      };

      if (global.self.onmessage) {
        global.self.onmessage({ data: setModelMessage } as MessageEvent);
      }

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'model_set',
          payload: { modelId: 'Phi-3-mini-4k-instruct-q4f16_1-MLC' }
        })
      );
    });
  });

  describe('Génération de réponse', () => {
    it('devrait générer une réponse avec le LLM', async () => {
      await import('../llm.worker');

      const queryPayload: QueryPayload & { 
        context?: string[]; 
        systemPrompt?: string;
        temperature?: number;
        maxTokens?: number;
      } = {
        query: 'Test query',
        conversationHistory: [],
        context: ['context item 1'],
        systemPrompt: 'You are a helpful assistant',
        temperature: 0.7,
        maxTokens: 256
      };

      const generateMessage: WorkerMessage<typeof queryPayload> = {
        type: 'generate_response',
        payload: queryPayload,
        meta: { traceId: 'test-789', timestamp: Date.now() }
      };

      if (global.self.onmessage) {
        global.self.onmessage({ data: generateMessage } as MessageEvent);
      }

      // Attendre que les promesses se résolvent
      await new Promise(resolve => setTimeout(resolve, 100));

      // Vérifier qu'une réponse a été envoyée
      expect(postMessageSpy).toHaveBeenCalled();
    });

    it('devrait utiliser le system prompt personnalisé', async () => {
      await import('../llm.worker');

      const customPrompt = 'You are a creative thinker';
      const queryPayload: QueryPayload & { 
        systemPrompt?: string;
      } = {
        query: 'Be creative',
        conversationHistory: [],
        systemPrompt: customPrompt,
      };

      const generateMessage: WorkerMessage<typeof queryPayload> = {
        type: 'generate_response',
        payload: queryPayload,
        meta: { traceId: 'test-custom', timestamp: Date.now() }
      };

      if (global.self.onmessage) {
        global.self.onmessage({ data: generateMessage } as MessageEvent);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(postMessageSpy).toHaveBeenCalled();
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs d\'initialisation', async () => {
      // Mock d'une erreur
      const { WebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
      vi.mocked(WebWorkerMLCEngine.create).mockRejectedValueOnce(
        new Error('WebGPU not available')
      );

      await import('../llm.worker');

      const generateMessage: WorkerMessage<QueryPayload> = {
        type: 'generate_response',
        payload: {
          query: 'Test',
          conversationHistory: []
        },
        meta: { traceId: 'test-error', timestamp: Date.now() }
      };

      if (global.self.onmessage) {
        global.self.onmessage({ data: generateMessage } as MessageEvent);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      // Vérifier qu'une erreur a été envoyée
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'llm_error'
        })
      );
    });
  });

  describe('Progression du chargement', () => {
    it('devrait envoyer des mises à jour de progression', async () => {
      const { WebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
      
      // Mock avec callback de progression
      vi.mocked(WebWorkerMLCEngine.create).mockImplementation(
        ({ initProgressCallback }: any) => {
          // Simuler la progression
          if (initProgressCallback) {
            setTimeout(() => {
              initProgressCallback({
                progress: 50,
                text: 'Loading model...',
                loaded: 500,
                total: 1000
              });
            }, 10);
          }
          
          return Promise.resolve({
            reload: vi.fn().mockResolvedValue(undefined),
            chat: {
              completions: {
                create: vi.fn().mockResolvedValue({
                  choices: [{ message: { content: 'Response' } }]
                })
              }
            }
          });
        }
      );

      await import('../llm.worker');

      const generateMessage: WorkerMessage<QueryPayload> = {
        type: 'generate_response',
        payload: {
          query: 'Test',
          conversationHistory: []
        },
        meta: { traceId: 'test-progress', timestamp: Date.now() }
      };

      if (global.self.onmessage) {
        global.self.onmessage({ data: generateMessage } as MessageEvent);
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      // Vérifier qu'une mise à jour de progression a été envoyée
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'llm_load_progress'
        })
      );
    });
  });
});
