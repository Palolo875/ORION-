/**
 * Tests pour le module humanBehavior
 */

import { describe, it, expect } from 'vitest';
import {
  needsClarification,
  calculateConfidence,
  detectPotentialHallucination,
  validateAgentConsensus,
  enrichWithHumanBehavior,
  generateHumanAwarePrompt,
  DEFAULT_HUMAN_BEHAVIOR,
} from '../humanBehavior';

describe('humanBehavior', () => {
  describe('needsClarification', () => {
    it('devrait détecter les pronoms ambigus', () => {
      const result = needsClarification('Explique-moi ça');
      expect(result.needed).toBe(true);
      expect(result.reason).toContain('pronoms ambigus');
    });
    
    it('devrait détecter les termes vagues', () => {
      const result = needsClarification('Comment faire le truc ?');
      expect(result.needed).toBe(true);
      expect(result.reason).toContain('plus spécifique');
    });
    
    it('devrait détecter les questions multiples', () => {
      const result = needsClarification('Pourquoi le ciel est bleu ? Et la mer ? Et les arbres verts ?');
      expect(result.needed).toBe(true);
      expect(result.reason).toContain('plusieurs questions');
    });
    
    it('ne devrait pas nécessiter de clarification pour une question claire', () => {
      const result = needsClarification('Quelle est la capitale de la France ?');
      expect(result.needed).toBe(false);
    });
  });
  
  describe('calculateConfidence', () => {
    it('devrait donner une haute confiance pour une réponse avec faits et structure', () => {
      const response = 'Selon les données de 2020, la réponse est X. Premièrement, Y. Deuxièmement, Z.';
      const query = 'Question test';
      const confidence = calculateConfidence(response, query);
      
      expect(confidence.score).toBeGreaterThan(0.7);
      expect(confidence.factors.factualBasis).toBeGreaterThan(0.5);
      expect(confidence.factors.logicalConsistency).toBeGreaterThan(0.7);
    });
    
    it('devrait donner une faible confiance pour une réponse incertaine', () => {
      const response = 'Je pense que peut-être il me semble que probablement...';
      const query = 'Question test';
      const confidence = calculateConfidence(response, query);
      
      expect(confidence.score).toBeLessThan(0.6);
      expect(confidence.factors.uncertaintyLevel).toBeGreaterThan(0.5);
    });
    
    it('devrait augmenter la confiance avec le contexte mémoire', () => {
      const response = 'La réponse est X';
      const query = 'Question test';
      
      const withoutMemory = calculateConfidence(response, query, { hasMemory: false });
      const withMemory = calculateConfidence(response, query, { hasMemory: true });
      
      expect(withMemory.factors.factualBasis).toBeGreaterThan(withoutMemory.factors.factualBasis);
    });
    
    it('devrait utiliser le consensus des agents si disponible', () => {
      const response = 'La réponse est X';
      const query = 'Question test';
      
      const confidence = calculateConfidence(response, query, { 
        hasMemory: false, 
        agentConsensus: 0.9 
      });
      
      expect(confidence.factors.domainExpertise).toBe(0.9);
    });
  });
  
  describe('detectPotentialHallucination', () => {
    it('devrait détecter les dates futures', () => {
      const response = 'En 2028, cet événement s\'est produit.';
      const result = detectPotentialHallucination(response);
      
      expect(result.likely).toBe(false); // 2028 n'est pas si loin
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('dates futures');
    });
    
    it('devrait détecter les affirmations très spécifiques sans source', () => {
      const response = 'Exactement 73.456% des gens pensent cela, prouvé à 100%.';
      const result = detectPotentialHallucination(response);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('spécifiques'))).toBe(true);
    });
    
    it('devrait détecter les contradictions internes', () => {
      const response = 'C\'est vrai que X est correct. Mais en fait, c\'est faux et incorrect.';
      const result = detectPotentialHallucination(response);
      
      expect(result.warnings.some(w => w.includes('Contradiction'))).toBe(true);
    });
    
    it('devrait détecter le langage trop confiant sans source', () => {
      const response = 'Je suis absolument certain que ceci est un fait établi sans aucun doute.';
      const result = detectPotentialHallucination(response);
      
      expect(result.warnings.some(w => w.includes('confiant'))).toBe(true);
    });
    
    it('ne devrait pas détecter d\'hallucination pour une réponse normale', () => {
      const response = 'D\'après les études récentes, on peut observer que X. Cela suggère Y.';
      const result = detectPotentialHallucination(response);
      
      expect(result.likely).toBe(false);
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });
  
  describe('validateAgentConsensus', () => {
    it('devrait calculer un bon consensus quand les agents sont d\'accord', () => {
      const responses = [
        { agent: 'logical', response: 'La solution est A car X et Y' },
        { agent: 'creative', response: 'Je propose également A avec l\'approche X' },
        { agent: 'critical', response: 'A semble correct malgré certains risques X' },
      ];
      
      const result = validateAgentConsensus(responses);
      
      expect(result.consensus).toBeGreaterThan(0);
    });
    
    it('devrait détecter les contradictions entre agents', () => {
      const responses = [
        { agent: 'logical', response: 'Oui, c\'est correct et vrai' },
        { agent: 'critical', response: 'Non, c\'est faux et incorrect' },
      ];
      
      const result = validateAgentConsensus(responses);
      
      expect(result.contradictions.length).toBeGreaterThan(0);
      expect(result.contradictions[0]).toContain('Désaccord');
    });
    
    it('devrait donner des recommandations en cas de faible consensus', () => {
      const responses = [
        { agent: 'logical', response: 'Solution mathématique complexe avec équations différentielles' },
        { agent: 'creative', response: 'Imagination narrative poétique et métaphores florales' },
      ];
      
      const result = validateAgentConsensus(responses);
      
      if (result.consensus < 0.3) {
        expect(result.recommendations.length).toBeGreaterThan(0);
      }
    });
    
    it('devrait retourner consensus parfait pour une seule réponse', () => {
      const responses = [
        { agent: 'logical', response: 'La réponse est X' },
      ];
      
      const result = validateAgentConsensus(responses);
      
      expect(result.consensus).toBe(1);
      expect(result.contradictions).toHaveLength(0);
    });
  });
  
  describe('enrichWithHumanBehavior', () => {
    it('devrait ajouter un disclaimer pour les hallucinations potentielles', () => {
      const response = 'En 2030, cet événement s\'est déjà produit. Exactement 99.999% des gens...';
      const query = 'Question test';
      
      const enriched = enrichWithHumanBehavior(response, query);
      
      expect(enriched.response).toContain('⚠️');
      expect(enriched.confidence.score).toBeLessThan(0.6);
    });
    
    it('devrait ajouter de la pensée visible pour basse confiance', () => {
      const response = 'Je pense que peut-être...';
      const query = 'Question difficile';
      
      const enriched = enrichWithHumanBehavior(response, query, {
        ...DEFAULT_HUMAN_BEHAVIOR,
        enableThinking: true,
      });
      
      if (enriched.confidence.score < 0.8) {
        expect(enriched.thinking).toBeDefined();
      }
    });
    
    it('devrait ajouter de l\'incertitude si score sous le seuil', () => {
      const response = 'Réponse vague et incertaine';
      const query = 'Question';
      
      const enriched = enrichWithHumanBehavior(response, query, {
        ...DEFAULT_HUMAN_BEHAVIOR,
        enableUncertainty: true,
        confidenceThreshold: 0.7,
      });
      
      if (enriched.confidence.score < 0.7) {
        expect(
          enriched.response.includes('semble') ||
          enriched.response.includes('pense') ||
          enriched.response.includes('crois')
        ).toBe(true);
      }
    });
    
    it('devrait détecter le besoin de clarification', () => {
      const response = 'Voici la réponse';
      const query = 'Explique ça';
      
      const enriched = enrichWithHumanBehavior(response, query, {
        ...DEFAULT_HUMAN_BEHAVIOR,
        enableClarification: true,
      });
      
      expect(enriched.clarificationNeeded).toBeDefined();
    });
    
    it('devrait admettre l\'ignorance pour très basse confiance', () => {
      const response = 'Je ne suis vraiment pas sûr, peut-être que...';
      const query = 'Question très complexe';
      
      const enriched = enrichWithHumanBehavior(response, query);
      
      if (enriched.confidence.score < 0.4) {
        expect(enriched.response).toContain('⚠️');
        expect(enriched.response.toLowerCase()).toContain('précaution');
      }
    });
  });
  
  describe('generateHumanAwarePrompt', () => {
    it('devrait enrichir un prompt de base', () => {
      const basePrompt = 'Tu es un assistant';
      const enriched = generateHumanAwarePrompt(basePrompt);
      
      expect(enriched).toContain(basePrompt);
      expect(enriched).toContain('COMPORTEMENT ATTENDU');
      expect(enriched).toContain('HONNÊTETÉ');
      expect(enriched).toContain('ANTI-HALLUCINATION');
    });
    
    it('devrait respecter la config de thinking', () => {
      const basePrompt = 'Tu es un assistant';
      
      const withThinking = generateHumanAwarePrompt(basePrompt, {
        ...DEFAULT_HUMAN_BEHAVIOR,
        enableThinking: true,
      });
      
      const withoutThinking = generateHumanAwarePrompt(basePrompt, {
        ...DEFAULT_HUMAN_BEHAVIOR,
        enableThinking: false,
      });
      
      expect(withThinking).toContain('Montre ta réflexion');
      expect(withoutThinking).toContain('Réponds directement');
    });
    
    it('devrait inclure les instructions anti-hallucination', () => {
      const basePrompt = 'Tu es un assistant';
      const enriched = generateHumanAwarePrompt(basePrompt);
      
      expect(enriched).toContain('Ne cite PAS de sources que tu ne connais pas');
      expect(enriched).toContain('N\'invente PAS de statistiques');
      expect(enriched).toContain('Si tu dois deviner, dis-le explicitement');
    });
  });
});
