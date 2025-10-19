import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  detectBrowserCompatibility, 
  getBrowserRecommendation, 
  getBrowserInfo 
} from './browserCompatibility';

describe('browserCompatibility', () => {
  beforeEach(() => {
    // Reset navigator.gpu mock before each test
    Object.defineProperty(navigator, 'gpu', {
      writable: true,
      value: undefined,
    });
  });

  describe('getBrowserInfo', () => {
    it('should detect browser information', () => {
      const info = getBrowserInfo();
      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('version');
      expect(info).toHaveProperty('os');
    });
  });

  describe('getBrowserRecommendation', () => {
    it('should return a recommendation string', () => {
      const recommendation = getBrowserRecommendation();
      expect(recommendation).toBeTruthy();
      expect(typeof recommendation).toBe('string');
      expect(recommendation.length).toBeGreaterThan(0);
    });

    it('should mention recommended browsers', () => {
      const recommendation = getBrowserRecommendation();
      const hasChrome = recommendation.toLowerCase().includes('chrome');
      const hasEdge = recommendation.toLowerCase().includes('edge');
      expect(hasChrome || hasEdge).toBe(true);
    });
  });

  describe('detectBrowserCompatibility', () => {
    it('should return compatibility object', async () => {
      const result = await detectBrowserCompatibility();
      
      expect(result).toHaveProperty('webGPU');
      expect(result).toHaveProperty('webGL');
      expect(result).toHaveProperty('speechRecognition');
      expect(result).toHaveProperty('speechSynthesis');
      expect(result).toHaveProperty('fileAPI');
      expect(result).toHaveProperty('webWorkers');
      expect(result).toHaveProperty('isCompatible');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('recommendations');
    });

    it('should detect WebGL support', async () => {
      const result = await detectBrowserCompatibility();
      expect(result.webGL).toHaveProperty('supported');
      expect(result.webGL).toHaveProperty('message');
      expect(typeof result.webGL.supported).toBe('boolean');
    });

    it('should detect Web Workers support', async () => {
      const result = await detectBrowserCompatibility();
      // In test environment, Worker might not be available
      expect(typeof result.webWorkers.supported).toBe('boolean');
    });

    it('should detect File API support', async () => {
      const result = await detectBrowserCompatibility();
      expect(result.fileAPI.supported).toBe(true);
    });

    it('should provide warnings when features are missing', async () => {
      const result = await detectBrowserCompatibility();
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should provide recommendations when features are missing', async () => {
      const result = await detectBrowserCompatibility();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should mark as incompatible when Web Workers are not available', async () => {
      // Mock Worker as undefined
      const originalWorker = global.Worker;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).Worker = undefined;
      
      const result = await detectBrowserCompatibility();
      expect(result.isCompatible).toBe(false);
      expect(result.warnings.some(w => w.includes('Web Workers'))).toBe(true);
      
      // Restore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).Worker = originalWorker;
    });
  });
});
