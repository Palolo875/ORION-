// src/workers/__mocks__/toolUser.worker.ts

/**
 * Mock du ToolUser Worker pour les tests
 * Simule la détection et l'exécution d'outils
 */

import type { WorkerMessage } from '../../types';

export class MockToolUserWorker {
  private listeners = new Map<string, (event: MessageEvent) => void>();
  
  postMessage(message: WorkerMessage) {
    const { type, payload, meta } = message;
    
    setTimeout(() => {
      const mockResponse = this.generateMockResponse(type, payload, meta);
      
      const listener = this.listeners.get('message');
      if (listener) {
        listener({ data: mockResponse } as MessageEvent);
      }
    }, 80); // 80ms de délai
  }
  
  addEventListener(event: string, callback: (event: MessageEvent) => void) {
    this.listeners.set(event, callback);
  }
  
  removeEventListener(event: string) {
    this.listeners.delete(event);
  }
  
  terminate() {
    this.listeners.clear();
  }
  
  private generateMockResponse(type: string, payload: unknown, meta?: WorkerMessage['meta']): WorkerMessage {
    if (type === 'init') {
      return {
        type: 'init_complete',
        payload: {},
        meta
      };
    }
    
    if (type === 'find_and_execute_tool') {
      const payloadData = payload as Record<string, unknown>;
      const query = ((payloadData.query as string) || '').toLowerCase();
      
      // Simuler la détection d'outils basée sur la requête
      if (query.includes('calcul') || query.includes('math')) {
        return {
          type: 'tool_executed',
          payload: {
            toolName: 'calculator',
            result: '[Mock] Résultat du calcul: 42',
            executionTime: 50
          },
          meta
        };
      }
      
      if (query.includes('timer') || query.includes('rappel')) {
        return {
          type: 'tool_executed',
          payload: {
            toolName: 'timer',
            result: '[Mock] Timer configuré pour 5 minutes',
            executionTime: 30
          },
          meta
        };
      }
      
      if (query.includes('search') || query.includes('recherche')) {
        return {
          type: 'tool_executed',
          payload: {
            toolName: 'search',
            result: '[Mock] Résultats de recherche pour: ' + query.substring(0, 50),
            executionTime: 120
          },
          meta
        };
      }
      
      // Pas d'outil trouvé
      return {
        type: 'no_tool_found',
        payload: {
          query: (payloadData.query as string) || '',
          reason: '[Mock] Aucun outil détecté pour cette requête'
        },
        meta
      };
    }
    
    return {
      type: 'error',
      payload: { error: `[Mock] Type non géré: ${type}` },
      meta
    };
  }
}

export default MockToolUserWorker;
