import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceMonitor } from './performanceMonitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  describe('startTracking', () => {
    it('should track operation duration', () => {
      const endTracking = monitor.startTracking('TestComponent', 'testOperation');
      
      // Simuler une opération qui prend du temps
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Attendre ~10ms
      }
      
      endTracking();

      const metrics = monitor.getMetrics({
        component: 'TestComponent',
        operation: 'testOperation',
      });

      expect(metrics).toHaveLength(1);
      expect(metrics[0].component).toBe('TestComponent');
      expect(metrics[0].operation).toBe('testOperation');
      expect(metrics[0].duration).toBeGreaterThan(0);
      expect(metrics[0].metadata).toEqual({ testData: 'value' });
    });

    it('should track multiple operations', () => {
      const end1 = monitor.startTracking('Component1', 'op1');
      const end2 = monitor.startTracking('Component2', 'op2');
      
      end1();
      end2();

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(2);
    });
  });

  describe('getMetrics', () => {
    beforeEach(() => {
      const end1 = monitor.startTracking('ComponentA', 'operation1');
      const end2 = monitor.startTracking('ComponentA', 'operation2');
      const end3 = monitor.startTracking('ComponentB', 'operation1');
      
      end1();
      end2();
      end3();
    });

    it('should filter metrics by component', () => {
      const metrics = monitor.getMetrics({ component: 'ComponentA' });
      expect(metrics).toHaveLength(2);
      expect(metrics.every(m => m.component === 'ComponentA')).toBe(true);
    });

    it('should filter metrics by operation', () => {
      const metrics = monitor.getMetrics({ operation: 'operation1' });
      expect(metrics).toHaveLength(2);
      expect(metrics.every(m => m.operation === 'operation1')).toBe(true);
    });

    it('should filter metrics by component and operation', () => {
      const metrics = monitor.getMetrics({
        component: 'ComponentA',
        operation: 'operation1',
      });
      expect(metrics).toHaveLength(1);
      expect(metrics[0].component).toBe('ComponentA');
      expect(metrics[0].operation).toBe('operation1');
    });

    it('should filter metrics by timestamp', () => {
      const now = Date.now();
      const metrics = monitor.getMetrics({ since: now - 1000 });
      expect(metrics.length).toBeGreaterThan(0);
    });
  });

  describe('getSummary', () => {
    it('should return null for no metrics', () => {
      const summary = monitor.getSummary('NonExistent', 'operation');
      expect(summary).toBeNull();
    });

    it('should calculate performance summary', () => {
      // Créer plusieurs métriques avec des durées différentes
      for (let i = 0; i < 10; i++) {
        const end = monitor.startTracking('TestComponent', 'testOp');
        // Simuler différentes durées
        const start = Date.now();
        while (Date.now() - start < i) {
          // Attendre
        }
        end();
      }

      const summary = monitor.getSummary('TestComponent', 'testOp');
      
      expect(summary).not.toBeNull();
      expect(summary!.totalOperations).toBe(10);
      expect(summary!.averageDuration).toBeGreaterThan(0);
      expect(summary!.minDuration).toBeGreaterThanOrEqual(0);
      expect(summary!.maxDuration).toBeGreaterThanOrEqual(summary!.minDuration);
      expect(summary!.p50).toBeGreaterThanOrEqual(0);
      expect(summary!.p95).toBeGreaterThanOrEqual(summary!.p50);
      expect(summary!.p99).toBeGreaterThanOrEqual(summary!.p95);
    });
  });

  describe('getReport', () => {
    it('should generate complete performance report', () => {
      const end1 = monitor.startTracking('Component1', 'op1');
      const end2 = monitor.startTracking('Component2', 'op2');
      
      end1();
      end2();

      const report = monitor.getReport();

      expect(report.totalMetrics).toBe(2);
      expect(Object.keys(report.components)).toContain('Component1');
      expect(Object.keys(report.components)).toContain('Component2');
    });
  });

  describe('exportMetrics', () => {
    it('should export metrics as JSON', () => {
      const end = monitor.startTracking('TestComponent', 'testOp');
      end();

      const exported = monitor.exportMetrics();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveProperty('metrics');
      expect(parsed).toHaveProperty('report');
      expect(parsed).toHaveProperty('exportedAt');
      expect(Array.isArray(parsed.metrics)).toBe(true);
    });
  });

  describe('clearMetrics', () => {
    it('should clear all metrics', () => {
      const end = monitor.startTracking('TestComponent', 'testOp');
      end();

      expect(monitor.getMetrics()).toHaveLength(1);

      monitor.clearMetrics();

      expect(monitor.getMetrics()).toHaveLength(0);
    });
  });

  describe('checkMemoryUsage', () => {
    it('should return null in test environment without performance.memory', () => {
      const memory = monitor.checkMemoryUsage();
      // Dans les tests, performance.memory n'est généralement pas disponible
      expect(memory).toBeNull();
    });
  });
});
