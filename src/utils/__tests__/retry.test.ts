import { describe, it, expect, vi } from 'vitest';
import { withRetry, retryStrategies } from '../retry';

describe('Retry utility', () => {
  it('should succeed on first attempt if function works', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn);
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');
    
    const result = await withRetry(fn, {
      maxAttempts: 3,
      initialDelay: 10,
    });
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw error after all attempts fail', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    
    await expect(
      withRetry(fn, { maxAttempts: 2, initialDelay: 10 })
    ).rejects.toThrow('always fails');
    
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should call onRetry callback on each retry', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockResolvedValue('success');
    
    const onRetry = vi.fn();
    
    await withRetry(fn, {
      maxAttempts: 2,
      initialDelay: 10,
      onRetry,
    });
    
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
  });

  it('should have correct retry strategies defined', () => {
    expect(retryStrategies.llm).toBeDefined();
    expect(retryStrategies.memory).toBeDefined();
    expect(retryStrategies.embedding).toBeDefined();
    expect(retryStrategies.storage).toBeDefined();
    
    expect(retryStrategies.llm.maxAttempts).toBeGreaterThan(0);
    expect(retryStrategies.memory.initialDelay).toBeGreaterThan(0);
  });
});
