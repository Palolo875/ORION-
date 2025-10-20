// src/workers/__mocks__/geniusHour.worker.ts

/**
 * Mock du GeniusHour Worker pour les tests
 * Simule l'apprentissage en arrière-plan
 */

import type { WorkerMessage } from '../../types';

export class MockGeniusHourWorker {
  private listeners = new Map<string, Function>();
  
  postMessage(message: WorkerMessage) {
    const { type, payload, meta } = message;
    
    setTimeout(() => {
      const mockResponse = this.generateMockResponse(type, payload, meta);
      
      const listener = this.listeners.get('message');
      if (listener) {
        listener({ data: mockResponse });
      }
    }, 40);
  }
  
  addEventListener(event: string, callback: Function) {
    this.listeners.set(event, callback);
  }
  
  removeEventListener(event: string) {
    this.listeners.delete(event);
  }
  
  terminate() {
    this.listeners.clear();
  }
  
  private generateMockResponse(type: string, payload: any, meta?: WorkerMessage['meta']): WorkerMessage {
    if (type === 'init') {
      return {
        type: 'init_complete',
        payload: {},
        meta
      };
    }
    
    return {
      type: 'genius_update',
      payload: {
        status: 'mock',
        message: '[Mock] Apprentissage en arrière-plan'
      },
      meta
    };
  }
}

export default MockGeniusHourWorker;
