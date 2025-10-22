/**
 * Types pour le système de cache LRU de l'OIE
 */

import type { IAgent } from './agent.types';

export interface CacheConfig {
  maxMemoryMB: number;
  maxAgentsInMemory: number;
}

export interface CacheEntry {
  agentId: string;
  agent: IAgent;
  loadedAt: number;
  lastAccessedAt: number;
  accessCount: number;
  memorySize: number;
}
