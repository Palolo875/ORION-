/**
 * Tests pour le CacheManager
 * Vérifie la gestion du cache LRU des agents
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheManager } from '../cache/cache-manager';
import { IAgent } from '../types/agent.types';

// Mock d'un agent simple
class MockAgent implements IAgent {
  metadata = {
    id: 'test-agent',
    name: 'Test Agent',
    capabilities: ['conversation' as const],
    modelSize: 100,
    priority: 10
  };
  
  state: 'unloaded' | 'loading' | 'ready' | 'busy' | 'error' = 'unloaded';
  loadCalled = 0;
  unloadCalled = 0;
  
  async load(): Promise<void> {
    this.loadCalled++;
    this.state = 'ready';
    // Simuler un délai de chargement
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  async unload(): Promise<void> {
    this.unloadCalled++;
    this.state = 'unloaded';
  }
  
  async process(input: any): Promise<any> {
    return {
      agentId: this.metadata.id,
      content: 'Mock response',
      confidence: 90,
      processingTime: 100
    };
  }
}

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  
  beforeEach(() => {
    cacheManager = new CacheManager({
      maxMemoryMB: 500,
      maxAgentsInMemory: 2
    });
  });
  
  describe('Basic Operations', () => {
    it('should load and cache an agent', async () => {
      const factory = () => new MockAgent();
      
      const agent = await cacheManager.getAgent('test-agent', factory);
      
      expect(agent).toBeDefined();
      expect(agent.state).toBe('ready');
      expect((agent as MockAgent).loadCalled).toBe(1);
    });
    
    it('should return cached agent on subsequent calls', async () => {
      const factory = () => new MockAgent();
      
      const agent1 = await cacheManager.getAgent('test-agent', factory);
      const agent2 = await cacheManager.getAgent('test-agent', factory);
      
      expect(agent1).toBe(agent2); // Même instance
      expect((agent1 as MockAgent).loadCalled).toBe(1); // Chargé une seule fois
    });
    
    it('should handle concurrent loading requests', async () => {
      const factory = () => new MockAgent();
      
      // Lancer plusieurs getAgent en parallèle
      const promises = [
        cacheManager.getAgent('test-agent', factory),
        cacheManager.getAgent('test-agent', factory),
        cacheManager.getAgent('test-agent', factory)
      ];
      
      const agents = await Promise.all(promises);
      
      // Tous devraient être la même instance
      expect(agents[0]).toBe(agents[1]);
      expect(agents[1]).toBe(agents[2]);
      
      // L'agent ne devrait être chargé qu'une seule fois
      expect((agents[0] as MockAgent).loadCalled).toBe(1);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle agent load errors', async () => {
      class FailingAgent extends MockAgent {
        async load(): Promise<void> {
          this.state = 'error';
          throw new Error('Load failed');
        }
      }
      
      const factory = () => new FailingAgent();
      
      await expect(
        cacheManager.getAgent('failing-agent', factory)
      ).rejects.toThrow('Load failed');
    });
    
    it('should cleanup loading promise on error', async () => {
      class FailingAgent extends MockAgent {
        async load(): Promise<void> {
          throw new Error('Load failed');
        }
      }
      
      const factory = () => new FailingAgent();
      
      try {
        await cacheManager.getAgent('failing-agent', factory);
      } catch (e) {
        // Erreur attendue
      }
      
      // Une nouvelle tentative devrait créer un nouveau agent
      class SuccessAgent extends MockAgent {}
      const successFactory = () => new SuccessAgent();
      
      const agent = await cacheManager.getAgent('failing-agent', successFactory);
      expect(agent).toBeDefined();
      expect(agent.state).toBe('ready');
    });
  });
  
  describe('Statistics', () => {
    it('should provide cache statistics', async () => {
      const factory = () => new MockAgent();
      
      await cacheManager.getAgent('agent-1', factory);
      await cacheManager.getAgent('agent-2', factory);
      
      const stats = cacheManager.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.loadedAgents).toBe(2);
    });
  });
  
  describe('Unload All', () => {
    it('should unload all cached agents', async () => {
      const factory1 = () => new MockAgent();
      const factory2 = () => {
        const agent = new MockAgent();
        agent.metadata.id = 'agent-2';
        return agent;
      };
      
      const agent1 = await cacheManager.getAgent('agent-1', factory1);
      const agent2 = await cacheManager.getAgent('agent-2', factory2);
      
      await cacheManager.unloadAll();
      
      expect((agent1 as MockAgent).unloadCalled).toBeGreaterThan(0);
      expect((agent2 as MockAgent).unloadCalled).toBeGreaterThan(0);
    });
    
    it('should handle unload errors gracefully', async () => {
      class ErrorUnloadAgent extends MockAgent {
        async unload(): Promise<void> {
          throw new Error('Unload failed');
        }
      }
      
      const factory = () => new ErrorUnloadAgent();
      await cacheManager.getAgent('error-agent', factory);
      
      // Ne devrait pas throw
      await expect(cacheManager.unloadAll()).resolves.not.toThrow();
    });
  });
});
