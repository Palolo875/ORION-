// src/workers/__mocks__/memory.worker.ts

/**
 * Mock du Memory Worker pour les tests
 * Simule la recherche et le stockage en mémoire sans IndexedDB
 */

import type { WorkerMessage } from '../../types';

export class MockMemoryWorker {
  private listeners = new Map<string, (event: MessageEvent) => void>();
  private memories: Array<{ content: string; type: string; timestamp: number }> = [];
  
  constructor() {
    // Ajouter quelques mémoires par défaut pour les tests
    this.memories = [
      { content: 'Mémoire de test 1: Information importante', type: 'conversation', timestamp: Date.now() - 1000 },
      { content: 'Mémoire de test 2: Autre contexte pertinent', type: 'conversation', timestamp: Date.now() - 500 },
    ];
  }
  
  postMessage(message: WorkerMessage) {
    const { type, payload, meta } = message;
    
    setTimeout(() => {
      const mockResponse = this.generateMockResponse(type, payload, meta);
      
      const listener = this.listeners.get('message');
      if (listener) {
        listener({ data: mockResponse } as MessageEvent);
      }
    }, 50); // 50ms de délai
  }
  
  addEventListener(event: string, callback: (event: MessageEvent) => void) {
    this.listeners.set(event, callback);
  }
  
  removeEventListener(event: string) {
    this.listeners.delete(event);
  }
  
  terminate() {
    this.listeners.clear();
    this.memories = [];
  }
  
  private generateMockResponse(type: string, payload: unknown, meta?: WorkerMessage['meta']): WorkerMessage {
    if (type === 'init') {
      return {
        type: 'init_complete',
        payload: {},
        meta
      };
    }
    
    if (type === 'search') {
      // Rechercher dans les mémoires mockées
      const payloadData = payload as Record<string, unknown>;
      const query = ((payloadData.query as string) || '').toLowerCase();
      const results = this.memories
        .filter(m => m.content.toLowerCase().includes(query.substring(0, 20)))
        .slice(0, 3) // Max 3 résultats
        .map(m => ({ content: m.content }));
      
      return {
        type: 'search_result',
        payload: { results },
        meta
      };
    }
    
    if (type === 'store') {
      // Stocker une nouvelle mémoire
      const payloadData = payload as Record<string, unknown>;
      this.memories.push({
        content: (payloadData.content as string) || '',
        type: (payloadData.type as string) || 'conversation',
        timestamp: Date.now()
      });
      
      return {
        type: 'store_complete',
        payload: { success: true },
        meta
      };
    }
    
    if (type === 'add_feedback') {
      return {
        type: 'feedback_stored',
        payload: { success: true },
        meta
      };
    }
    
    if (type === 'purge_all') {
      this.memories = [];
      return {
        type: 'purge_complete',
        payload: { success: true },
        meta
      };
    }
    
    if (type === 'export_all') {
      return {
        type: 'export_complete',
        payload: { 
          memories: this.memories,
          count: this.memories.length 
        },
        meta
      };
    }
    
    if (type === 'import_all') {
      const payloadData = payload as Record<string, unknown>;
      const memories = (payloadData.memories as Array<{ content: string; type: string; timestamp: number }>) || [];
      this.memories = memories;
      return {
        type: 'import_complete',
        payload: { 
          success: true,
          count: this.memories.length 
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

export default MockMemoryWorker;
