/**
 * Gestionnaire de Cache pour l'OIE
 * Coordonne le chargement et le déchargement des agents
 */

import { LRUCache } from './lru-cache';
import { IAgent } from '../types/agent.types';
import { CacheConfig } from '../types/cache.types';

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
    // 1. Vérifier le cache
    const cached = await this.cache.get(agentId);
    if (cached) {
      console.log(`[CacheManager] Hit: ${agentId}`);
      return cached;
    }
    
    // 2. Si déjà en cours de chargement, attendre
    if (this.loadingPromises.has(agentId)) {
      console.log(`[CacheManager] Chargement en cours: ${agentId} - attente...`);
      return await this.loadingPromises.get(agentId)!;
    }
    
    // 3. Charger l'agent
    console.log(`[CacheManager] Miss: ${agentId} - Chargement...`);
    
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
  }
  
  private async loadAgent(
    agentId: string,
    factory: () => IAgent
  ): Promise<IAgent> {
    const agent = factory();
    await agent.load();
    await this.cache.set(agent);
    return agent;
  }
  
  async unloadAll(): Promise<void> {
    console.log(`[CacheManager] Déchargement de tous les agents`);
    await this.cache.clear();
  }
  
  getStats() {
    return this.cache.getStats();
  }
}
