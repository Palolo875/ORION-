/**
 * Tests unitaires pour le Circuit Breaker
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker, CircuitBreakerManager } from '../circuitBreaker';

// Helper pour attendre
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: 'test-circuit',
      failureThreshold: 3,
      resetTimeout: 1000,
      successThreshold: 2,
      requestTimeout: 500
    });
  });

  describe('State transitions', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should open after threshold failures', async () => {
      const failingFn = async () => {
        throw new Error('Test failure');
      };

      // Provoquer 3 échecs
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(failingFn);
        } catch (error) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('OPEN');
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      const failingFn = async () => {
        throw new Error('Test failure');
      };

      // Ouvrir le circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(failingFn);
        } catch (error) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('OPEN');

      // Attendre le timeout
      await sleep(1100);

      expect(breaker.getState()).toBe('HALF_OPEN');
    });

    it('should close after successful executions in HALF_OPEN', async () => {
      const successFn = async () => 'success';

      // Forcer l'ouverture
      breaker.forceOpen();
      expect(breaker.getState()).toBe('OPEN');

      // Attendre pour passer en HALF_OPEN
      await sleep(1100);

      // Exécuter avec succès pour refermer
      await breaker.execute(successFn);
      await breaker.execute(successFn);

      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('Execution', () => {
    it('should execute function successfully in CLOSED state', async () => {
      const fn = async () => 'success';
      const result = await breaker.execute(fn);

      expect(result).toBe('success');
    });

    it('should reject when OPEN without fallback', async () => {
      const fn = async () => 'success';

      breaker.forceOpen();

      await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('should use fallback when OPEN', async () => {
      const fn = async () => 'primary';
      const fallback = async () => 'fallback';

      breaker.forceOpen();

      const result = await breaker.execute(fn, fallback);
      expect(result).toBe('fallback');
    });

    it('should timeout long-running requests', async () => {
      const slowFn = async () => {
        await sleep(2000);
        return 'too slow';
      };

      await expect(breaker.execute(slowFn)).rejects.toThrow('timeout');
    });
  });

  describe('Statistics', () => {
    it('should track successful requests', async () => {
      const fn = async () => 'success';

      await breaker.execute(fn);
      await breaker.execute(fn);

      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.uptimePercentage).toBe(100);
    });

    it('should track failed requests', async () => {
      const failingFn = async () => {
        throw new Error('Test failure');
      };

      try {
        await breaker.execute(failingFn);
      } catch (error) {
        // Expected
      }

      const stats = breaker.getStats();
      expect(stats.failures).toBeGreaterThan(0);
    });

    it('should calculate uptime percentage', async () => {
      const successFn = async () => 'success';
      const failingFn = async () => {
        throw new Error('failure');
      };

      await breaker.execute(successFn);
      try {
        await breaker.execute(failingFn);
      } catch (error) {
        // Expected
      }

      const stats = breaker.getStats();
      expect(stats.uptimePercentage).toBe(50);
    });
  });

  describe('Reset', () => {
    it('should reset all statistics', async () => {
      const fn = async () => 'success';

      await breaker.execute(fn);
      breaker.reset();

      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.state).toBe('CLOSED');
    });
  });
});

describe('CircuitBreakerManager', () => {
  let manager: CircuitBreakerManager;

  beforeEach(() => {
    manager = new CircuitBreakerManager();
  });

  it('should create and retrieve breakers', () => {
    const breaker1 = manager.getBreaker('service-1');
    const breaker2 = manager.getBreaker('service-1');

    expect(breaker1).toBe(breaker2); // Same instance
  });

  it('should create different breakers for different services', () => {
    const breaker1 = manager.getBreaker('service-1');
    const breaker2 = manager.getBreaker('service-2');

    expect(breaker1).not.toBe(breaker2);
  });

  it('should get health summary', () => {
    const breaker1 = manager.getBreaker('service-1');
    const breaker2 = manager.getBreaker('service-2');
    const breaker3 = manager.getBreaker('service-3');

    breaker1.forceClose();
    breaker2.forceOpen();

    const health = manager.getHealthSummary();

    expect(health.total).toBe(3);
    expect(health.healthy).toBeGreaterThan(0);
    expect(health.down).toBeGreaterThan(0);
  });

  it('should reset all breakers', () => {
    const breaker1 = manager.getBreaker('service-1');
    const breaker2 = manager.getBreaker('service-2');

    breaker1.forceOpen();
    breaker2.forceOpen();

    manager.resetAll();

    expect(breaker1.getState()).toBe('CLOSED');
    expect(breaker2.getState()).toBe('CLOSED');
  });

  it('should remove breakers', () => {
    manager.getBreaker('service-1');
    manager.removeBreaker('service-1');

    const stats = manager.getAllStats();
    expect(stats.size).toBe(0);
  });
});
