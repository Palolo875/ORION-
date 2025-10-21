// src/utils/sharedEmbedding.ts

/**
 * Client pour le Shared Embedding Worker
 * Permet aux autres workers d'utiliser le service d'embedding partagé
 */

import { logger } from './logger';

class SharedEmbeddingClient {
  private worker: Worker | null = null;
  private requestCounter = 0;
  private pendingRequests = new Map<string, {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
    timeout: number;
  }>();

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      this.worker = new Worker(
        new URL('../workers/shared-embedding.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event: MessageEvent) => {
        const { type, requestId, payload } = event.data;
        
        const pending = this.pendingRequests.get(requestId);
        if (!pending) return;

        clearTimeout(pending.timeout);
        this.pendingRequests.delete(requestId);

        if (type === 'error') {
          pending.reject(new Error(payload.error));
        } else {
          pending.resolve(payload);
        }
      };

      this.worker.onerror = (error) => {
        logger.error('SharedEmbeddingClient', 'Erreur worker', error);
      };

      // Initialiser le worker
      this.sendMessage('init', {});
      
      logger.info('SharedEmbeddingClient', 'Client initialisé');
    } catch (error) {
      logger.error('SharedEmbeddingClient', 'Erreur lors de l\'initialisation', error);
      throw error;
    }
  }

  private sendMessage<T>(type: string, payload: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker non initialisé'));
        return;
      }

      const requestId = `req_${this.requestCounter++}`;
      
      // Timeout de 30 secondes
      const timeout = window.setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Timeout - la requête a pris trop de temps'));
      }, 30000);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });
      
      this.worker.postMessage({ type, payload, requestId });
    });
  }

  async createEmbedding(text: string): Promise<number[]> {
    const result = await this.sendMessage<{ embedding: number[] }>('create_embedding', { text });
    return result.embedding;
  }

  async getStats() {
    return this.sendMessage('get_stats', {});
  }

  async clearCache() {
    return this.sendMessage('clear_cache', {});
  }

  async unload() {
    return this.sendMessage('unload', {});
  }

  terminate() {
    // Nettoyer toutes les requêtes en attente
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error('Worker terminé'));
    });
    this.pendingRequests.clear();

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Instance singleton
let sharedEmbeddingClient: SharedEmbeddingClient | null = null;

export function getSharedEmbeddingClient(): SharedEmbeddingClient {
  if (!sharedEmbeddingClient) {
    sharedEmbeddingClient = new SharedEmbeddingClient();
  }
  return sharedEmbeddingClient;
}

export function terminateSharedEmbeddingClient() {
  if (sharedEmbeddingClient) {
    sharedEmbeddingClient.terminate();
    sharedEmbeddingClient = null;
  }
}
