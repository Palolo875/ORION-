import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSemanticCache } from '../useSemanticCache';

console.log('🎭 Tests avec MOCKS (rapide)');

describe('useSemanticCache Hook', () => {
  it('should initialize semantic cache', () => {
    const { result } = renderHook(() => useSemanticCache());
    
    expect(result.current).toBeDefined();
  });

  it('should provide cache operations', () => {
    const { result } = renderHook(() => useSemanticCache());
    
    expect(typeof result.current.findInCache).toBe('function');
    expect(typeof result.current.addToCache).toBe('function');
    expect(typeof result.current.invalidateCache).toBe('function');
    expect(typeof result.current.invalidateByKeywords).toBe('function');
  });

  it('should provide cache stats', () => {
    const { result } = renderHook(() => useSemanticCache());
    
    expect(typeof result.current.getCacheStats).toBe('function');
  });

  it('should handle cache find operation', async () => {
    const { result } = renderHook(() => useSemanticCache());
    
    const cached = await result.current.findInCache('test query');
    expect(cached === null || typeof cached === 'object').toBe(true);
  });

  it('should handle cache invalidation', () => {
    const { result } = renderHook(() => useSemanticCache());
    
    expect(() => result.current.invalidateCache()).not.toThrow();
  });

  it('should track cache statistics', () => {
    const { result } = renderHook(() => useSemanticCache());
    
    const stats = result.current.getCacheStats();
    expect(stats).toBeDefined();
  });

  it('should support enabled/disabled mode', () => {
    const { result } = renderHook(() => useSemanticCache({ enabled: false }));
    
    expect(result.current).toBeDefined();
  });

  it('should support callbacks', () => {
    const onCacheHit = vi.fn();
    const onCacheMiss = vi.fn();
    
    const { result } = renderHook(() => useSemanticCache({ 
      onCacheHit, 
      onCacheMiss 
    }));
    
    expect(result.current).toBeDefined();
  });

  it('should export cache data', () => {
    const { result } = renderHook(() => useSemanticCache());
    
    expect(typeof result.current.exportCache).toBe('function');
  });

  it('should import cache data', () => {
    const { result } = renderHook(() => useSemanticCache());
    
    expect(typeof result.current.importCache).toBe('function');
  });
});
