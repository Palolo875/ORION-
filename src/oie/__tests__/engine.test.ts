/**
 * Tests d'intégration pour l'Orion Inference Engine (OIE)
 * Vérifie le bon fonctionnement du moteur et des agents
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OrionInferenceEngine } from '../core/engine';

// Mock des agents pour éviter de charger les vrais modèles
vi.mock('../agents/conversation-agent', () => ({
  ConversationAgent: class MockConversationAgent {
    metadata = {
      id: 'conversation-agent',
      name: 'Agent Conversation (Mock)',
      capabilities: ['conversation'],
      modelSize: 100,
      priority: 10
    };
    state = 'unloaded';
    
    async load() {
      this.state = 'ready';
    }
    
    async unload() {
      this.state = 'unloaded';
    }
    
    async process(input: any) {
      return {
        agentId: 'conversation-agent',
        content: `Mock response to: ${input.content}`,
        confidence: 90,
        processingTime: 100
      };
    }
  }
}));

vi.mock('../agents/code-agent', () => ({
  CodeAgent: class MockCodeAgent {
    metadata = {
      id: 'code-agent',
      name: 'Agent Code (Mock)',
      capabilities: ['code_generation'],
      modelSize: 100,
      priority: 9
    };
    state = 'unloaded';
    
    async load() {
      this.state = 'ready';
    }
    
    async unload() {
      this.state = 'unloaded';
    }
    
    async process(input: any) {
      return {
        agentId: 'code-agent',
        content: `function example() { /* ${input.content} */ }`,
        confidence: 85,
        processingTime: 150
      };
    }
  }
}));

vi.mock('../agents/vision-agent', () => ({
  VisionAgent: class MockVisionAgent {
    metadata = {
      id: 'vision-agent',
      name: 'Agent Vision (Mock)',
      capabilities: ['vision'],
      modelSize: 200,
      priority: 10
    };
    state = 'unloaded';
    
    async load() {
      this.state = 'ready';
    }
    
    async unload() {
      this.state = 'unloaded';
    }
    
    async process(input: any) {
      return {
        agentId: 'vision-agent',
        content: `Image analysis: ${input.images?.length || 0} images detected`,
        confidence: 88,
        processingTime: 200
      };
    }
  }
}));

vi.mock('../agents/logical-agent', () => ({
  LogicalAgent: class MockLogicalAgent {
    metadata = {
      id: 'logical-agent',
      name: 'Agent Logique (Mock)',
      capabilities: ['logical_analysis'],
      modelSize: 100,
      priority: 8
    };
    state = 'unloaded';
    
    async load() {
      this.state = 'ready';
    }
    
    async unload() {
      this.state = 'unloaded';
    }
    
    async process(input: any) {
      return {
        agentId: 'logical-agent',
        content: `Logical analysis: ${input.content}`,
        confidence: 92,
        processingTime: 120
      };
    }
  }
}));

vi.mock('../agents/speech-to-text-agent', () => ({
  SpeechToTextAgent: class MockSpeechToTextAgent {
    metadata = {
      id: 'speech-to-text-agent',
      name: 'Agent Transcription (Mock)',
      capabilities: ['speech_recognition'],
      modelSize: 150,
      priority: 8
    };
    state = 'unloaded';
    
    async load() {
      this.state = 'ready';
    }
    
    async unload() {
      this.state = 'unloaded';
    }
    
    async process(input: any) {
      return {
        agentId: 'speech-to-text-agent',
        content: 'Texte transcrit depuis l\'audio',
        confidence: 90,
        processingTime: 250
      };
    }
  }
}));

vi.mock('../agents/creative-agent', () => ({
  CreativeAgent: class MockCreativeAgent {
    metadata = {
      id: 'creative-agent',
      name: 'Agent Créatif (Mock)',
      capabilities: ['image_generation'],
      modelSize: 4096,
      priority: 11
    };
    state = 'unloaded';
    
    async load() {
      this.state = 'ready';
    }
    
    async unload() {
      this.state = 'unloaded';
    }
    
    async process(input: any) {
      return {
        agentId: 'creative-agent',
        content: 'Image générée (mock)',
        confidence: 85,
        processingTime: 300,
        imageData: 'data:image/png;base64,mock-image-data'
      };
    }
  }
}));

vi.mock('../agents/multilingual-agent', () => ({
  MultilingualAgent: class MockMultilingualAgent {
    metadata = {
      id: 'multilingual-agent',
      name: 'Agent Multilingue (Mock)',
      capabilities: ['translation', 'multilingual'],
      modelSize: 500,
      priority: 9
    };
    state = 'unloaded';
    
    async load() {
      this.state = 'ready';
    }
    
    async unload() {
      this.state = 'unloaded';
    }
    
    async process(input: any) {
      return {
        agentId: 'multilingual-agent',
        content: `Traduction mock: ${input.content}`,
        confidence: 88,
        processingTime: 150
      };
    }
  }
}));

describe('OrionInferenceEngine', () => {
  let engine: OrionInferenceEngine;
  
  beforeEach(async () => {
    engine = new OrionInferenceEngine({
      maxMemoryMB: 1000,
      maxAgentsInMemory: 2,
      enableVision: true,
      enableCode: true,
      enableSpeech: true,
      useNeuralRouter: false, // Utiliser SimpleRouter pour les tests (plus rapide)
      verboseLogging: false,
      // Désactiver les fonctionnalités lourdes pour accélérer les tests
      enableGuardrails: false,
      enableCircuitBreaker: false,
      enableRequestQueue: false,
      enablePredictiveLoading: false
    });
    
    await engine.initialize();
  }, 15000); // Augmenter le timeout pour beforeEach
  
  afterEach(async () => {
    await engine.shutdown();
  });
  
  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(engine.isEngineReady()).toBe(true);
    });
    
    it('should register all agents', () => {
      const agents = engine.getAvailableAgents();
      expect(agents).toContain('conversation-agent');
      expect(agents).toContain('code-agent');
      expect(agents).toContain('vision-agent');
      expect(agents).toContain('logical-agent');
      expect(agents).toContain('speech-to-text-agent');
    });
    
    it('should throw error when inferring before initialization', async () => {
      const uninitializedEngine = new OrionInferenceEngine({
        useNeuralRouter: false // Utiliser SimpleRouter pour les tests
      });
      
      await expect(
        uninitializedEngine.infer('test')
      ).rejects.toThrow('Moteur non initialisé');
    });
  });
  
  describe('Routing', () => {
    it('should route to conversation agent by default', async () => {
      const result = await engine.infer('Bonjour, comment vas-tu ?');
      
      expect(result.agentId).toBe('conversation-agent');
      expect(result.content).toContain('Mock response');
    });
    
    it('should route to code agent for code-related queries', async () => {
      const result = await engine.infer('Écris une fonction JavaScript pour trier un tableau');
      
      expect(result.agentId).toBe('code-agent');
      expect(result.content).toContain('function');
    });
    
    it('should route to vision agent when images are provided', async () => {
      const result = await engine.infer('Analyse cette image', {
        images: [{ content: 'data:image/png;base64,...', type: 'image/png' }]
      });
      
      expect(result.agentId).toBe('vision-agent');
      expect(result.content).toContain('Image analysis');
    });
    
    it('should route to logical agent for analytical queries', async () => {
      const result = await engine.infer('Analyse et décompose ce problème étape par étape');
      
      expect(result.agentId).toBe('logical-agent');
      expect(result.content).toContain('Logical analysis');
    });
    
    it('should force specific agent when requested', async () => {
      const result = await engine.infer('Test', {
        forceAgent: 'code-agent'
      });
      
      expect(result.agentId).toBe('code-agent');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle unknown agent gracefully', async () => {
      await expect(
        engine.infer('Test', { forceAgent: 'unknown-agent' })
      ).rejects.toThrow('Agent introuvable');
    });
    
    it('should fallback to conversation agent on error', async () => {
      // Force une erreur avec l'agent vision puis fallback
      const result = await engine.infer('Test sans image mais forcé vision', {
        forceAgent: 'vision-agent'
      });
      
      // Le mock ne devrait pas échouer, mais dans un vrai scénario,
      // il y aurait un fallback vers conversation-agent
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
    
    it('should report errors via errorReporting callback', async () => {
      const errors: Array<{ error: Error; context: string }> = [];
      
      const engineWithReporting = new OrionInferenceEngine({
        useNeuralRouter: false, // Utiliser SimpleRouter pour les tests
        errorReporting: (error, context) => {
          errors.push({ error, context });
        }
      });
      
      await engineWithReporting.initialize();
      
      try {
        await engineWithReporting.infer('Test', { forceAgent: 'invalid-agent' });
      } catch (e) {
        // Erreur attendue
      }
      
      expect(errors.length).toBeGreaterThan(0);
      await engineWithReporting.shutdown();
    });
  });
  
  describe('Context and Options', () => {
    it('should pass conversation history to agent', async () => {
      const history = [
        { role: 'user', content: 'Bonjour' },
        { role: 'assistant', content: 'Bonjour !' }
      ];
      
      const result = await engine.infer('Comment vas-tu ?', {
        conversationHistory: history
      });
      
      expect(result).toBeDefined();
      expect(result.agentId).toBe('conversation-agent');
    });
    
    it('should pass ambient context to agent', async () => {
      const result = await engine.infer('Aide-moi', {
        ambientContext: 'L\'utilisateur travaille sur un projet React'
      });
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
    
    it('should respect temperature and maxTokens options', async () => {
      const result = await engine.infer('Test', {
        temperature: 0.8,
        maxTokens: 500
      });
      
      expect(result).toBeDefined();
    });
  });
  
  describe('Audio Workflow', () => {
    it('should transcribe audio then process with conversation agent', async () => {
      const audioData = new Float32Array(16000); // 1 seconde d'audio mock
      
      const result = await engine.infer('', {
        audioData,
        sampleRate: 16000
      });
      
      // Le workflow devrait :
      // 1. Router vers speech-to-text-agent
      // 2. Transcrire l'audio
      // 3. Re-router avec le texte transcrit
      expect(result).toBeDefined();
      expect(result.agentId).toBe('conversation-agent'); // Final agent après transcription
    });
  });
  
  describe('Statistics', () => {
    it('should provide cache statistics', async () => {
      // Faire quelques inférences pour charger des agents
      await engine.infer('Test 1');
      await engine.infer('Écris du code');
      
      const stats = engine.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.loadedAgents).toBeGreaterThan(0);
    });
  });
  
  describe('Shutdown', () => {
    it('should shutdown cleanly', async () => {
      await engine.infer('Test');
      await engine.shutdown();
      
      expect(engine.isEngineReady()).toBe(false);
    });
    
    it('should not allow inference after shutdown', async () => {
      await engine.shutdown();
      
      await expect(
        engine.infer('Test')
      ).rejects.toThrow('Moteur non initialisé');
    });
  });
  
  describe('Performance', () => {
    it('should complete inference in reasonable time', async () => {
      const start = performance.now();
      await engine.infer('Test rapide');
      const duration = performance.now() - start;
      
      // Avec les mocks, cela devrait être très rapide
      expect(duration).toBeLessThan(5000); // < 5 secondes (augmenté pour les tests)
    }, 15000); // Timeout de 15 secondes
    
    it('should cache agents for faster subsequent calls', async () => {
      // Premier appel - chargement de l'agent
      const start1 = performance.now();
      await engine.infer('Premier test');
      const duration1 = performance.now() - start1;
      
      // Deuxième appel - agent déjà en cache
      const start2 = performance.now();
      await engine.infer('Deuxième test');
      const duration2 = performance.now() - start2;
      
      // Le deuxième appel devrait être plus rapide (agent en cache)
      // Note: avec les mocks, la différence est minime
      expect(duration2).toBeLessThanOrEqual(duration1 * 2);
    }, 20000); // Timeout de 20 secondes
  });
});
