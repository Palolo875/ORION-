/**
 * Types pour le système de cache LRU de l'OIE
 */

export interface CacheConfig {
  maxMemoryMB: number;
  maxAgentsInMemory: number;
}

export interface CacheEntry {
  agentId: string;
  agent: any;
  loadedAt: number;
  lastAccessedAt: number;
  accessCount: number;
  memorySize: number;
}
