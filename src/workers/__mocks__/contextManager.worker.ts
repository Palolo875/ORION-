// src/workers/__mocks__/contextManager.worker.ts

/**
 * Mock du ContextManager Worker pour les tests
 * Simule la compression de contexte
 */

import type { WorkerMessage } from '../../types';

export class MockContextManagerWorker {
  private listeners = new Map<string, Function>();
  
  postMessage(message: WorkerMessage) {
    const { type, payload, meta } = message;
    
    setTimeout(() => {
      const mockResponse = this.generateMockResponse(type, payload, meta);
      
      const listener = this.listeners.get('message');
      if (listener) {
        listener({ data: mockResponse });
      }
    }, 60); // 60ms de délai
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
    
    if (type === 'compress_context') {
      const messages = payload.messages || [];
      const originalCount = messages.length;
      
      // Simuler une compression (garder seulement les messages les plus récents)
      const maxTokens = payload.maxTokens || 3000;
      const compressionRatio = 0.6; // Garder 60% des messages
      const targetCount = Math.max(
        Math.floor(messages.length * compressionRatio),
        5 // Minimum 5 messages
      );
      
      const compressedMessages = messages.slice(-targetCount);
      
      return {
        type: 'context_compressed',
        payload: {
          compressedMessages,
          originalCount,
          compressedCount: compressedMessages.length,
          compressionRatio: compressedMessages.length / originalCount
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

export default MockContextManagerWorker;
