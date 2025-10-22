import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getModelLoader, destroyModelLoader, formatBytes } from '../modelLoader';

console.log('🎭 Tests avec MOCKS (rapide)');

describe('ModelLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    destroyModelLoader();
  });

  describe('Singleton instance', () => {
    it('should create model loader instance', () => {
      const loader = getModelLoader();
      expect(loader).toBeDefined();
    });

    it('should return same instance on multiple calls', () => {
      const loader1 = getModelLoader();
      const loader2 = getModelLoader();
      expect(loader1).toBe(loader2);
    });
  });

  describe('Model management', () => {
    it('should get loaded models list', () => {
      const loader = getModelLoader();
      const models = loader.getLoadedModels();
      expect(Array.isArray(models)).toBe(true);
    });

    it('should get stats', () => {
      const loader = getModelLoader();
      const stats = loader.getStats();
      expect(stats).toHaveProperty('loadedModels');
      expect(stats).toHaveProperty('totalMemoryUsage');
      expect(stats).toHaveProperty('strategy');
    });

    it('should calculate total memory usage', () => {
      const loader = getModelLoader();
      const usage = loader.getTotalMemoryUsage();
      expect(typeof usage).toBe('number');
      expect(usage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Utility functions', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(1024)).toContain('KB');
      expect(formatBytes(1024 * 1024)).toContain('MB');
      expect(formatBytes(1024 * 1024 * 1024)).toContain('GB');
    });
  });

  describe('Cleanup', () => {
    it('should destroy loader instance', () => {
      getModelLoader();
      expect(() => destroyModelLoader()).not.toThrow();
    });
  });
});
