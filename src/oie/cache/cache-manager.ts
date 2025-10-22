/**
 * Gestionnaire de Cache pour l'OIE
 * Coordonne le chargement et le déchargement des agents
 */

import { LRUCache } from './lru-cache';
import { IAgent } from '../types/agent.types';
import { CacheConfig } from '../types/cache.types';

// Type pour les erreurs enrichies du cache
interface CacheError extends Error {
  agentId?: string;
  phase?: 'cache_retrieval' | 'agent_loading';
  originalError?: unknown;
}

export class CacheManager {
  private cache: LRUCache;
  private loadingPromises: Map<string, Promise<IAgent>> = new Map();
  
  constructor(config: CacheConfig) {
    this.cache = new LRUCache(config);
  }
  
  async getAgent(
    agentId: string,
    factory: () => IAgent
  ): Promise<IAgent> {
    try {
      // 1. Vérifier le cache
      const cached = await this.cache.get(agentId);
      if (cached) {
        console.log(`[CacheManager] ✅ Hit: ${agentId}`);
        return cached;
      }
      
      // 2. Si déjà en cours de chargement, attendre
      if (this.loadingPromises.has(agentId)) {
        console.log(`[CacheManager] ⏳ Chargement en cours: ${agentId} - attente...`);
        return await this.loadingPromises.get(agentId)!;
      }
      
      // 3. Charger l'agent
      console.log(`[CacheManager] ❌ Miss: ${agentId} - Chargement...`);
      
      const loadPromise = this.loadAgent(agentId, factory);
      this.loadingPromises.set(agentId, loadPromise);
      
      try {
        const agent = await loadPromise;
        this.loadingPromises.delete(agentId);
        return agent;
      } catch (error) {
        this.loadingPromises.delete(agentId);
        throw error;
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      const cacheError: CacheError = new Error(
        `Échec de récupération de l'agent ${agentId}: ${errorMsg}`
      );
      cacheError.agentId = agentId;
      cacheError.phase = 'cache_retrieval';
      cacheError.originalError = error;
      
      console.error(`[CacheManager] ❌ Erreur:`, cacheError);
      throw cacheError;
    }
  }
  
  private async loadAgent(
    agentId: string,
    factory: () => IAgent
  ): Promise<IAgent> {
    try {
      const agent = factory();
      await agent.load();
      await this.cache.set(agent);
      console.log(`[CacheManager] ✅ Agent ${agentId} chargé et mis en cache`);
      return agent;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      const loadError: CacheError = new Error(
        `Échec du chargement de l'agent ${agentId}: ${errorMsg}`
      );
      loadError.agentId = agentId;
      loadError.phase = 'agent_loading';
      loadError.originalError = error;
      
      console.error(`[CacheManager] ❌ Erreur de chargement:`, loadError);
      throw loadError;
    }
  }
  
  async unloadAll(): Promise<void> {
    console.log(`[CacheManager] Déchargement de tous les agents`);
    
    try {
      await this.cache.clear();
      console.log(`[CacheManager] ✅ Tous les agents déchargés`);
    } catch (error: unknown) {
      console.error(`[CacheManager] ⚠️ Erreur lors du déchargement complet:`, error);
      // Ne pas bloquer sur les erreurs de déchargement
    }
  }
  
  getStats() {
    return this.cache.getStats();
  }
}
