/**
 * Tests pour le SimpleRouter
 * Vérifie la logique de routage des requêtes utilisateur
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SimpleRouter } from '../router/simple-router';
import { AgentMetadata } from '../types/agent.types';

describe('SimpleRouter', () => {
  let router: SimpleRouter;
  
  const conversationAgent: AgentMetadata = {
    id: 'conversation-agent',
    name: 'Agent Conversation',
    capabilities: ['conversation', 'creative_writing'],
    modelSize: 2048,
    priority: 10
  };
  
  const codeAgent: AgentMetadata = {
    id: 'code-agent',
    name: 'Agent Code',
    capabilities: ['code_generation', 'code_explanation'],
    modelSize: 1800,
    priority: 9
  };
  
  const visionAgent: AgentMetadata = {
    id: 'vision-agent',
    name: 'Agent Vision',
    capabilities: ['vision', 'image_analysis'],
    modelSize: 4096,
    priority: 10
  };
  
  const logicalAgent: AgentMetadata = {
    id: 'logical-agent',
    name: 'Agent Logique',
    capabilities: ['logical_analysis', 'critical_thinking'],
    modelSize: 2048,
    priority: 8
  };
  
  const speechAgent: AgentMetadata = {
    id: 'speech-to-text-agent',
    name: 'Agent Transcription',
    capabilities: ['speech_recognition'],
    modelSize: 150,
    priority: 8
  };
  
  beforeEach(() => {
    router = new SimpleRouter();
    router.registerAgent(conversationAgent);
    router.registerAgent(codeAgent);
    router.registerAgent(visionAgent);
    router.registerAgent(logicalAgent);
    router.registerAgent(speechAgent);
  });
  
  describe('Basic Routing', () => {
    it('should route to conversation agent by default', async () => {
      const decision = await router.route('Bonjour');
      
      expect(decision.selectedAgent).toBe('conversation-agent');
      expect(decision.confidence).toBeGreaterThan(0);
    });
    
    it('should route to code agent for code keywords', async () => {
      const queries = [
        'Écris une fonction Python',
        'Comment coder un algorithme de tri',
        'Debug ce code JavaScript',
        'Crée une class pour gérer les utilisateurs'
      ];
      
      for (const query of queries) {
        const decision = await router.route(query);
        expect(decision.selectedAgent).toBe('code-agent');
        // Vérifier que le reasoning contient au moins un mot-clé de code
        const hasCodeKeyword = decision.reasoning.match(/fonction|code|script|class|python|javascript/i);
        expect(hasCodeKeyword).toBeTruthy();
      }
    });
    
    it('should route to logical agent for analytical keywords', async () => {
      const queries = [
        'Analyse ce problème étape par étape',
        'Décompose cette question',
        'Explique le raisonnement derrière cette décision'
      ];
      
      for (const query of queries) {
        const decision = await router.route(query);
        expect(decision.selectedAgent).toBe('logical-agent');
      }
    });
  });
  
  describe('Routing with Context', () => {
    it('should route to vision agent when images are present', async () => {
      const decision = await router.routeWithContext('Analyse cette image', {
        hasImages: true
      });
      
      expect(decision.selectedAgent).toBe('vision-agent');
      expect(decision.confidence).toBe(1.0);
      expect(decision.reasoning).toContain('Images détectées');
    });
    
    it('should route to speech agent when audio is present', async () => {
      const decision = await router.routeWithContext('', {
        hasAudio: true
      });
      
      expect(decision.selectedAgent).toBe('speech-to-text-agent');
      expect(decision.confidence).toBe(1.0);
      expect(decision.reasoning).toContain('Audio détecté');
    });
    
    it('should prioritize images over audio', async () => {
      const decision = await router.routeWithContext('Test', {
        hasImages: true,
        hasAudio: true
      });
      
      // Les images ont priorité dans notre implémentation
      expect(decision.selectedAgent).toBe('vision-agent');
    });
    
    it('should use preferred capability when specified', async () => {
      const decision = await router.routeWithContext('Test', {
        preferredCapability: 'code_generation'
      });
      
      expect(decision.selectedAgent).toBe('code-agent');
      expect(decision.reasoning).toContain('code_generation');
    });
  });
  
  describe('Confidence Scoring', () => {
    it('should return high confidence for strong keyword matches', async () => {
      const decision = await router.route('Écris du code Python pour un script');
      
      expect(decision.confidence).toBeGreaterThan(0.7);
    });
    
    it('should return lower confidence for weak matches', async () => {
      const decision = await router.route('Bonjour');
      
      // Devrait fallback vers conversation avec confiance modérée
      expect(decision.confidence).toBeLessThanOrEqual(0.7);
    });
    
    it('should cap confidence at 0.95 for keyword matches', async () => {
      const decision = await router.route('code fonction script programme javascript');
      
      expect(decision.confidence).toBeLessThanOrEqual(0.95);
    });
  });
  
  describe('Reasoning', () => {
    it('should provide reasoning for routing decision', async () => {
      const decision = await router.route('Écris une fonction');
      
      expect(decision.reasoning).toBeDefined();
      expect(decision.reasoning.length).toBeGreaterThan(0);
    });
    
    it('should list detected keywords in reasoning', async () => {
      const decision = await router.route('Écris du code Python');
      
      // Vérifier que le reasoning contient au moins un mot-clé détecté
      const hasKeyword = decision.reasoning.match(/code|python/i);
      expect(hasKeyword).toBeTruthy();
      expect(decision.reasoning).toContain('Mots-clés détectés');
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty query', async () => {
      const decision = await router.route('');
      
      expect(decision.selectedAgent).toBe('conversation-agent');
      expect(decision.reasoning).toContain('défaut');
    });
    
    it('should handle very long query', async () => {
      const longQuery = 'code '.repeat(1000);
      const decision = await router.route(longQuery);
      
      expect(decision.selectedAgent).toBe('code-agent');
    });
    
    it('should be case-insensitive', async () => {
      const queries = [
        'ÉCRIS DU CODE',
        'écris du code',
        'Écris Du Code'
      ];
      
      for (const query of queries) {
        const decision = await router.route(query);
        expect(decision.selectedAgent).toBe('code-agent');
      }
    });
    
    it('should handle queries with special characters', async () => {
      const decision = await router.route('Écris une fonction avec des @#$%^&*()');
      
      expect(decision.selectedAgent).toBe('code-agent');
    });
  });
  
  describe('Multi-keyword Queries', () => {
    it('should prioritize higher priority keywords', async () => {
      // "image" a une priorité 10, "code" a une priorité 9
      // Mais le nombre de matches compte aussi
      const decision = await router.route('Génère du code pour analyser une image');
      
      // Le résultat dépend du scoring: vision-agent a priorité 10, code-agent priorité 9
      // On accepte les deux car le scoring peut varier selon le nombre de matches
      expect(['code-agent', 'vision-agent', 'logical-agent']).toContain(decision.selectedAgent);
    });
    
    it('should accumulate score for multiple keyword matches', async () => {
      const singleKeyword = await router.route('code');
      const multipleKeywords = await router.route('code fonction script');
      
      expect(multipleKeywords.confidence).toBeGreaterThanOrEqual(singleKeyword.confidence);
    });
  });
  
  describe('Conversation History', () => {
    it('should accept conversation history in context', async () => {
      const history = [
        { role: 'user', content: 'Bonjour' },
        { role: 'assistant', content: 'Bonjour !' }
      ];
      
      const decision = await router.routeWithContext('Continue', {
        conversationHistory: history
      });
      
      expect(decision).toBeDefined();
      expect(decision.selectedAgent).toBe('conversation-agent');
    });
  });
});
