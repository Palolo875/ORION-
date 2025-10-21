// src/workers/__mocks__/contextManager.worker.ts

/**
 * Mock du ContextManager Worker pour les tests
 * Simule la compression de contexte
 */

import type { WorkerMessage } from '../../types';

export class MockContextManagerWorker {
  private listeners = new Map<string, (event: MessageEvent) => void>();
  
  postMessage(message: WorkerMessage) {
    const { type, payload, meta } = message;
    
    setTimeout(() => {
      const mockResponse = this.generateMockResponse(type, payload, meta);
      
      const listener = this.listeners.get('message');
      if (listener) {
        listener({ data: mockResponse } as MessageEvent);
      }
    }, 60); // 60ms de délai
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
    
    if (type === 'compress_context') {
      const payloadData = payload as Record<string, unknown>;
      const messages = (payloadData.messages || []) as unknown[];
      const originalCount = Array.isArray(messages) ? messages.length : 0;
      
      // Simuler une compression (garder seulement les messages les plus récents)
      const maxTokens = (payloadData.maxTokens as number) || 3000;
      const compressionRatio = 0.6; // Garder 60% des messages
      const targetCount = Math.max(
        Math.floor(originalCount * compressionRatio),
        5 // Minimum 5 messages
      );
      
      const compressedMessages = Array.isArray(messages) ? messages.slice(-targetCount) : [];
      
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
