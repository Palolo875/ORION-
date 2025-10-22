import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOIE } from '../useOIE';

console.log('🎭 Tests avec MOCKS (rapide)');

describe('useOIE Hook', () => {
  it('should initialize without auto-init', () => {
    const { result } = renderHook(() => useOIE({ autoInit: false }));
    
    expect(result.current).toBeDefined();
    expect(typeof result.current.ask).toBe('function');
    expect(typeof result.current.getStats).toBe('function');
    expect(typeof result.current.shutdown).toBe('function');
  });

  it('should provide required properties', () => {
    const { result } = renderHook(() => useOIE({ autoInit: false }));
    
    expect(result.current).toHaveProperty('isReady');
    expect(result.current).toHaveProperty('isProcessing');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('ask');
    expect(result.current).toHaveProperty('getStats');
    expect(result.current).toHaveProperty('shutdown');
    expect(result.current).toHaveProperty('availableAgents');
  });

  it('should track ready state', () => {
    const { result } = renderHook(() => useOIE({ autoInit: false }));
    
    expect(typeof result.current.isReady).toBe('boolean');
  });

  it('should track processing state', () => {
    const { result } = renderHook(() => useOIE({ autoInit: false }));
    
    expect(typeof result.current.isProcessing).toBe('boolean');
  });

  it('should track error state', () => {
    const { result } = renderHook(() => useOIE({ autoInit: false }));
    
    expect(result.current.error === null || typeof result.current.error === 'string').toBe(true);
  });

  it('should provide available agents', () => {
    const { result } = renderHook(() => useOIE({ autoInit: false }));
    
    expect(Array.isArray(result.current.availableAgents)).toBe(true);
  });

  it('should accept configuration', () => {
    const { result } = renderHook(() => useOIE({ 
      autoInit: false,
      maxMemoryMB: 4000,
      enableVision: true,
      enableCode: true
    }));
    
    expect(result.current).toBeDefined();
  });
});
