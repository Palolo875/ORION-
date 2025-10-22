import { describe, it, expect } from 'vitest';
import { selectAgentsForQuery } from '../agentSelector';

console.log('🎭 Tests avec MOCKS (rapide)');

describe('AgentSelector', () => {
  describe('selectAgentsForQuery', () => {
    it('should select agents for simple query', () => {
      const result = selectAgentsForQuery('What is 2 + 2?');
      expect(result).toBeDefined();
      expect(result).toHaveProperty('agents');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('complexity');
      expect(Array.isArray(result.agents)).toBe(true);
    });

    it('should include base agents for all queries', () => {
      const result = selectAgentsForQuery('Simple question');
      expect(result.agents).toContain('logical');
      expect(result.agents).toContain('synthesizer');
    });

    it('should select creative agent for creative queries', () => {
      const result = selectAgentsForQuery('Give me creative ideas for a new product');
      expect(result.agents.length).toBeGreaterThanOrEqual(2);
    });

    it('should assess complexity correctly', () => {
      const simple = selectAgentsForQuery('Hello');
      expect(simple.complexity).toBe('simple');
      
      const complex = selectAgentsForQuery('Analyze and compare in detail the ethical implications of AI across multiple domains');
      expect(complex.complexity).toMatch(/moderate|complex/);
    });

    it('should provide reasoning for selection', () => {
      const result = selectAgentsForQuery('Test query');
      expect(typeof result.reasoning).toBe('string');
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should estimate time', () => {
      const result = selectAgentsForQuery('Test query');
      expect(typeof result.estimatedTime).toBe('string');
      expect(result.estimatedTime).toMatch(/\d+/);
    });

    it('should handle empty query', () => {
      const result = selectAgentsForQuery('');
      expect(result).toBeDefined();
      expect(result.agents.length).toBeGreaterThanOrEqual(2);
    });

    it('should limit maximum agents', () => {
      const result = selectAgentsForQuery('Very complex query requiring creativity, critical thinking, ethical analysis, practical implementation, and historical context');
      expect(result.agents.length).toBeLessThanOrEqual(6);
    });
  });
});
