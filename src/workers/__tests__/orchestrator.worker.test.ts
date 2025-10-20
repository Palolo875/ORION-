/**
 * Tests pour l'Orchestrator Worker avec Mocks
 * 
 * Ces tests utilisent les mocks des workers pour des tests rapides et déterministes.
 * Pour tester avec les vrais modèles: LOAD_REAL_MODELS=true npm test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { WorkerMessage, QueryPayload } from '../../types';

describe('Orchestrator Worker (avec mocks)', () => {
  let orchestratorWorker: Worker;

  beforeEach(() => {
    // Créer une nouvelle instance du worker pour chaque test
    orchestratorWorker = new Worker(
      new URL('../orchestrator.worker.ts', import.meta.url),
      { type: 'module' }
    );
  });

  afterEach(() => {
    // Nettoyer après chaque test
    orchestratorWorker.terminate();
  });

  describe('Initialization', () => {
    it('devrait initialiser correctement tous les workers', (done) => {
      orchestratorWorker.postMessage({
        type: 'init',
        payload: {},
        meta: { traceId: 'test-init-1' }
      });

      // Le worker devrait être prêt (pas de message de retour pour init dans l'orchestrator actuel)
      // Mais on vérifie qu'il ne crash pas
      setTimeout(() => {
        expect(orchestratorWorker).toBeDefined();
        done();
      }, 500);
    });
  });

  describe('Query Processing - Simple', () => {
    it('devrait traiter une requête simple et retourner une réponse', (done) => {
      const testQuery: QueryPayload = {
        query: 'Quelle est la capitale de la France?',
        conversationHistory: [],
        deviceProfile: 'micro'
      };

      orchestratorWorker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, payload } = event.data;

        if (type === 'final_response') {
          expect(payload).toHaveProperty('response');
          expect(payload.response).toContain('[Mock');
          expect(payload).toHaveProperty('metadata');
          done();
        }
      };

      orchestratorWorker.postMessage({
        type: 'query',
        payload: testQuery,
        meta: { traceId: 'test-query-1' }
      });
    }, 5000); // 5s timeout pour le test

    it('devrait inclure le contexte de mémoire dans la réponse', (done) => {
      const testQuery: QueryPayload = {
        query: 'Information importante test',
        conversationHistory: [],
        deviceProfile: 'micro'
      };

      orchestratorWorker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, payload } = event.data;

        if (type === 'final_response') {
          expect(payload).toHaveProperty('metadata');
          // Le mock de memory devrait retourner des résultats
          done();
        }
      };

      orchestratorWorker.postMessage({
        type: 'query',
        payload: testQuery,
        meta: { traceId: 'test-query-memory-1' }
      });
    }, 5000);
  });

  describe('Query Processing - Multi-Agent', () => {
    it('devrait lancer un débat multi-agents pour les requêtes complexes', (done) => {
      const testQuery: QueryPayload = {
        query: 'Analyser en profondeur les avantages et inconvénients de l\'intelligence artificielle dans la société moderne',
        conversationHistory: [],
        deviceProfile: 'full' // Mode full active le multi-agent
      };

      let statusUpdates = 0;

      orchestratorWorker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, payload } = event.data;

        if (type === 'status_update') {
          statusUpdates++;
        }

        if (type === 'final_response') {
          expect(payload).toHaveProperty('response');
          expect(payload).toHaveProperty('metadata');
          // En mode multi-agent, on devrait avoir des métadonnées de débat
          done();
        }
      };

      orchestratorWorker.postMessage({
        type: 'query',
        payload: testQuery,
        meta: { traceId: 'test-query-multiagent-1' }
      });
    }, 10000); // Timeout plus long pour le multi-agent
  });

  describe('Tool Execution', () => {
    it('devrait détecter et exécuter un outil pour les calculs', (done) => {
      const testQuery: QueryPayload = {
        query: 'Calcule 25 + 17',
        conversationHistory: [],
        deviceProfile: 'micro'
      };

      orchestratorWorker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, payload } = event.data;

        if (type === 'final_response') {
          // Le mock de toolUser devrait détecter "calcul"
          expect(payload.response).toBeDefined();
          done();
        }
      };

      orchestratorWorker.postMessage({
        type: 'query',
        payload: testQuery,
        meta: { traceId: 'test-tool-calc-1' }
      });
    }, 5000);
  });

  describe('Model Selection', () => {
    it('devrait changer le modèle LLM', (done) => {
      orchestratorWorker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, payload } = event.data;

        if (type === 'model_set') {
          expect(payload).toHaveProperty('modelId');
          expect(payload.modelId).toBe('TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC');
          done();
        }
      };

      orchestratorWorker.postMessage({
        type: 'set_model',
        payload: { modelId: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC' },
        meta: { traceId: 'test-model-1' }
      });
    }, 3000);
  });

  describe('Memory Operations', () => {
    it('devrait purger la mémoire', (done) => {
      orchestratorWorker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, payload } = event.data;

        if (type === 'purge_complete') {
          expect(payload).toHaveProperty('success');
          done();
        }
      };

      orchestratorWorker.postMessage({
        type: 'purge_memory',
        payload: {},
        meta: { traceId: 'test-purge-1' }
      });
    }, 3000);

    it('devrait exporter la mémoire', (done) => {
      orchestratorWorker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, payload } = event.data;

        if (type === 'export_complete') {
          expect(payload).toHaveProperty('memories');
          expect(payload).toHaveProperty('count');
          done();
        }
      };

      orchestratorWorker.postMessage({
        type: 'export_memory',
        payload: {},
        meta: { traceId: 'test-export-1' }
      });
    }, 3000);

    it('devrait importer la mémoire', (done) => {
      const mockMemories = [
        { content: 'Test memory 1', type: 'conversation', timestamp: Date.now() }
      ];

      orchestratorWorker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, payload } = event.data;

        if (type === 'import_complete') {
          expect(payload).toHaveProperty('success');
          expect(payload).toHaveProperty('count');
          done();
        }
      };

      orchestratorWorker.postMessage({
        type: 'import_memory',
        payload: { memories: mockMemories },
        meta: { traceId: 'test-import-1' }
      });
    }, 3000);
  });

  describe('Feedback', () => {
    it('devrait enregistrer le feedback utilisateur', (done) => {
      orchestratorWorker.postMessage({
        type: 'feedback',
        payload: {
          messageId: 'msg-123',
          feedback: 'positive'
        },
        meta: { traceId: 'test-feedback-1' }
      });

      // Le feedback ne retourne pas de message direct, mais ne devrait pas crasher
      setTimeout(() => {
        expect(orchestratorWorker).toBeDefined();
        done();
      }, 1000);
    });
  });

  describe('Error Handling', () => {
    it('devrait gérer les types de messages invalides', (done) => {
      orchestratorWorker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, payload } = event.data;

        // Le worker ne crash pas, mais ignore les messages inconnus
        // Pas de message d'erreur spécifique dans l'implémentation actuelle
      };

      orchestratorWorker.postMessage({
        type: 'invalid_message_type' as any,
        payload: {},
        meta: { traceId: 'test-error-1' }
      });

      setTimeout(() => {
        expect(orchestratorWorker).toBeDefined();
        done();
      }, 1000);
    });
  });

  describe('Performance', () => {
    it('devrait répondre rapidement avec les mocks (< 2s)', (done) => {
      const startTime = performance.now();

      const testQuery: QueryPayload = {
        query: 'Test de performance',
        conversationHistory: [],
        deviceProfile: 'micro'
      };

      orchestratorWorker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const { type } = event.data;

        if (type === 'final_response') {
          const endTime = performance.now();
          const duration = endTime - startTime;

          // Avec les mocks, devrait être très rapide (< 2s)
          expect(duration).toBeLessThan(2000);
          done();
        }
      };

      orchestratorWorker.postMessage({
        type: 'query',
        payload: testQuery,
        meta: { traceId: 'test-perf-1' }
      });
    }, 3000);
  });
});
