import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModelCache } from '../modelCache';

console.log('🎭 Tests avec MOCKS (rapide)');

describe('ModelCache', () => {
  let cache: ModelCache;

  beforeEach(() => {
    cache = new ModelCache();
  });

  describe('Initialization', () => {
    it('should create cache instance', () => {
      expect(cache).toBeDefined();
    });
  });

  describe('Cache operations', () => {
    it('should handle cache get', async () => {
      const result = await cache.get('test-model');
      expect(result === null || result instanceof ArrayBuffer).toBe(true);
    });

    it('should handle cache set', async () => {
      const buffer = new ArrayBuffer(1024);
      await expect(cache.set('test-model', buffer)).resolves.not.toThrow();
    });

    it('should handle cache delete', async () => {
      await expect(cache.delete('test-model')).resolves.not.toThrow();
    });

    it('should handle cache clear', async () => {
      await expect(cache.clear()).resolves.not.toThrow();
    });
  });

  describe('Cache statistics', () => {
    it('should get cache stats', () => {
      const stats = cache.getStats();
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('memoryCount');
      expect(stats).toHaveProperty('memorySizeMB');
      expect(stats).toHaveProperty('maxMemorySizeMB');
    });

    it('should track memory size', () => {
      const stats = cache.getStats();
      expect(typeof stats.memorySizeMB).toBe('number');
      expect(stats.memorySizeMB).toBeGreaterThanOrEqual(0);
    });

    it('should track memory count', () => {
      const stats = cache.getStats();
      expect(typeof stats.memoryCount).toBe('number');
      expect(stats.memoryCount).toBeGreaterThanOrEqual(0);
    });
  });
});
