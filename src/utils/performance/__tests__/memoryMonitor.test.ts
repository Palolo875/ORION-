import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryMonitor } from '../memoryMonitor';

console.log('🎭 Tests avec MOCKS (rapide)');

describe('MemoryMonitor', () => {
  let monitor: MemoryMonitor;

  beforeEach(() => {
    monitor = new MemoryMonitor();
  });

  describe('Initialization', () => {
    it('should create monitor instance', () => {
      expect(monitor).toBeDefined();
    });
  });

  describe('Memory Tracking', () => {
    it('should take snapshot', async () => {
      const snapshot = await monitor.takeSnapshot();
      expect(snapshot).toBeDefined();
      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('jsHeapUsed');
      expect(snapshot).toHaveProperty('jsHeapTotal');
    });

    it('should get latest snapshot', () => {
      const snapshot = monitor.getLatestSnapshot();
      if (snapshot) {
        expect(snapshot).toHaveProperty('timestamp');
      }
    });

    it('should get all snapshots', () => {
      const snapshots = monitor.getSnapshots();
      expect(Array.isArray(snapshots)).toBe(true);
    });
  });

  describe('Memory Status', () => {
    it('should get memory stats', () => {
      const stats = monitor.getStats();
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('averageUsage');
      expect(stats).toHaveProperty('peakUsage');
      expect(stats).toHaveProperty('minUsage');
    });

    it('should track memory pressure', async () => {
      const snapshot = await monitor.takeSnapshot();
      expect(snapshot.pressure).toMatch(/low|medium|high|critical/);
    });

    it('should reset history', () => {
      expect(() => monitor.reset()).not.toThrow();
    });
  });

  describe('Monitoring Control', () => {
    it('should start monitoring', () => {
      expect(() => monitor.startMonitoring(5000)).not.toThrow();
    });

    it('should stop monitoring', () => {
      monitor.startMonitoring(5000);
      expect(() => monitor.stopMonitoring()).not.toThrow();
    });

    it('should handle multiple starts gracefully', () => {
      monitor.startMonitoring(5000);
      expect(() => monitor.startMonitoring(5000)).not.toThrow();
      monitor.stopMonitoring();
    });
  });

  describe('Listeners', () => {
    it('should add listener', () => {
      const listener = vi.fn();
      expect(() => monitor.addListener(listener)).not.toThrow();
    });

    it('should remove listener', () => {
      const listener = vi.fn();
      monitor.addListener(listener);
      expect(() => monitor.removeListener(listener)).not.toThrow();
    });
  });
});
