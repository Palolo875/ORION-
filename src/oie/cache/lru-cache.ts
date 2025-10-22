/**
 * Cache LRU (Least Recently Used) pour les agents OIE
 * Gère la mémoire en déchargeant les agents les moins utilisés
 */

import { IAgent } from '../types/agent.types';
import { CacheConfig, CacheEntry } from '../types/cache.types';

export class LRUCache {
  private config: CacheConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private totalMemory = 0;
  
  constructor(config: CacheConfig) {
    this.config = config;
    console.log(`[LRUCache] Initialisé avec max ${config.maxMemoryMB}MB et ${config.maxAgentsInMemory} agents`);
  }
  
  async get(agentId: string): Promise<IAgent | null> {
    const entry = this.cache.get(agentId);
    
    if (!entry) {
      return null;
    }
    
    // Mettre à jour les stats d'accès
    entry.lastAccessedAt = Date.now();
    entry.accessCount++;
    
    console.log(`[LRUCache] Hit: ${agentId} (accès #${entry.accessCount})`);
    return entry.agent;
  }
  
  async set(agent: IAgent): Promise<void> {
    const agentId = agent.metadata.id;
    const memorySize = agent.metadata.modelSize;
    
    // Vérifier si éviction nécessaire
    while (this.needsEviction(memorySize)) {
      await this.evictLRU();
    }
    
    // Ajouter l'agent
    const entry: CacheEntry = {
      agentId,
      agent,
      loadedAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 1,
      memorySize
    };
    
    this.cache.set(agentId, entry);
    this.totalMemory += memorySize;
    
    console.log(`[LRUCache] Agent ajouté: ${agentId} (${memorySize}MB)`);
    console.log(`[LRUCache] Mémoire totale: ${this.totalMemory}MB / ${this.config.maxMemoryMB}MB`);
  }
  
  async remove(agentId: string): Promise<void> {
    const entry = this.cache.get(agentId);
    if (!entry) return;
    
    await entry.agent.unload();
    this.cache.delete(agentId);
    this.totalMemory -= entry.memorySize;
    
    console.log(`[LRUCache] Agent retiré: ${agentId}`);
  }
  
  private needsEviction(newSize: number): boolean {
    const wouldExceedMemory = this.totalMemory + newSize > this.config.maxMemoryMB;
    const wouldExceedCount = this.cache.size >= this.config.maxAgentsInMemory;
    
    return wouldExceedMemory || wouldExceedCount;
  }
  
  private async evictLRU(): Promise<void> {
    if (this.cache.size === 0) return;
    
    // Trouver l'agent le moins récemment utilisé
    let oldestEntry: CacheEntry | null = null;
    let oldestTime = Date.now();
    
    for (const entry of this.cache.values()) {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestEntry = entry;
      }
    }
    
    if (oldestEntry) {
      console.log(`[LRUCache] Éviction LRU: ${oldestEntry.agentId} (dernier accès: ${new Date(oldestEntry.lastAccessedAt).toLocaleTimeString()})`);
      await this.remove(oldestEntry.agentId);
    }
  }
  
  async clear(): Promise<void> {
    console.log(`[LRUCache] Nettoyage complet - ${this.cache.size} agents`);
    
    for (const agentId of Array.from(this.cache.keys())) {
      await this.remove(agentId);
    }
    
    this.totalMemory = 0;
  }
  
  getStats() {
    return {
      loadedAgents: this.cache.size, // Utiliser loadedAgents pour cohérence avec les tests
      agentsLoaded: this.cache.size, // Garder aussi agentsLoaded pour rétrocompatibilité
      totalMemoryMB: this.totalMemory,
      maxMemoryMB: this.config.maxMemoryMB,
      memoryUsagePercent: (this.totalMemory / this.config.maxMemoryMB) * 100,
      agents: Array.from(this.cache.values()).map(e => ({
        id: e.agentId,
        memoryMB: e.memorySize,
        accessCount: e.accessCount,
        loadedAt: new Date(e.loadedAt).toLocaleTimeString(),
        lastAccessedAt: new Date(e.lastAccessedAt).toLocaleTimeString()
      }))
    };
  }
}
