/**
 * Tests pour le gestionnaire de stockage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageManager } from '../storageManager';

describe('StorageManager', () => {
  let storageManager: StorageManager;

  beforeEach(() => {
    storageManager = new StorageManager();
  });

  describe('formatBytes', () => {
    it('devrait formater correctement les octets', () => {
      expect(storageManager.formatBytes(0)).toBe('0 B');
      expect(storageManager.formatBytes(1024)).toBe('1.00 KB');
      expect(storageManager.formatBytes(1024 * 1024)).toBe('1.00 MB');
      expect(storageManager.formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
      expect(storageManager.formatBytes(5 * 1024 * 1024 * 1024)).toBe('5.00 GB');
      expect(storageManager.formatBytes(Infinity)).toBe('∞');
    });
  });

  describe('getStorageInfo', () => {
    it('devrait retourner des informations de stockage valides', async () => {
      // Mock navigator.storage.estimate
      const mockEstimate = vi.fn().mockResolvedValue({
        usage: 1024 * 1024 * 100, // 100 MB
        quota: 1024 * 1024 * 1024, // 1 GB
      });

      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: mockEstimate,
        },
        configurable: true,
      });

      const info = await storageManager.getStorageInfo();

      expect(info.usage).toBe(1024 * 1024 * 100);
      expect(info.quota).toBe(1024 * 1024 * 1024);
      expect(info.percentage).toBeCloseTo(9.76, 1);
      expect(info.isLimited).toBe(true);
    });

    it('devrait gérer l\'absence de l\'API Storage Estimate', async () => {
      // Remove storage API
      Object.defineProperty(navigator, 'storage', {
        value: undefined,
        configurable: true,
      });

      const info = await storageManager.getStorageInfo();

      expect(info.usage).toBe(0);
      expect(info.quota).toBe(Infinity);
      expect(info.percentage).toBe(0);
      expect(info.isLimited).toBe(false);
    });
  });

  describe('canLoadModel', () => {
    it('devrait autoriser le chargement si l\'espace est suffisant', async () => {
      const mockEstimate = vi.fn().mockResolvedValue({
        usage: 1024 * 1024 * 100, // 100 MB
        quota: 1024 * 1024 * 1024 * 10, // 10 GB
      });

      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: mockEstimate,
        },
        configurable: true,
      });

      const modelSize = 500 * 1024 * 1024; // 500 MB
      const warning = await storageManager.canLoadModel(modelSize);

      expect(warning.canProceed).toBe(true);
      expect(warning.level).toBe('info');
    });

    it('devrait alerter si l\'espace est insuffisant', async () => {
      const mockEstimate = vi.fn().mockResolvedValue({
        usage: 1024 * 1024 * 900, // 900 MB
        quota: 1024 * 1024 * 1024, // 1 GB
      });

      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: mockEstimate,
        },
        configurable: true,
      });

      const modelSize = 500 * 1024 * 1024; // 500 MB (dépassera le quota)
      const warning = await storageManager.canLoadModel(modelSize);

      expect(warning.canProceed).toBe(false);
      expect(warning.level).toBe('critical');
    });

    it('devrait alerter si proche de la limite critique', async () => {
      const mockEstimate = vi.fn().mockResolvedValue({
        usage: 1024 * 1024 * 400, // 400 MB
        quota: 1024 * 1024 * 1024, // 1 GB
      });

      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: mockEstimate,
        },
        configurable: true,
      });

      const modelSize = 600 * 1024 * 1024; // 600 MB (atteindra ~97%)
      const warning = await storageManager.canLoadModel(modelSize);

      expect(warning.canProceed).toBe(true);
      expect(warning.level).toBe('critical');
    });

    it('devrait alerter avec warning si dépasse 75%', async () => {
      const mockEstimate = vi.fn().mockResolvedValue({
        usage: 1024 * 1024 * 500, // 500 MB
        quota: 1024 * 1024 * 1024, // 1 GB
      });

      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: mockEstimate,
        },
        configurable: true,
      });

      const modelSize = 400 * 1024 * 1024; // 400 MB (atteindra ~88%)
      const warning = await storageManager.canLoadModel(modelSize);

      expect(warning.canProceed).toBe(true);
      expect(warning.level).toBe('warning');
    });
  });

  describe('getStorageStatus', () => {
    it('devrait retourner un statut critique si > 90%', async () => {
      const mockEstimate = vi.fn().mockResolvedValue({
        usage: 1024 * 1024 * 950, // 950 MB
        quota: 1024 * 1024 * 1024, // 1 GB
      });

      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: mockEstimate,
        },
        configurable: true,
      });

      const status = await storageManager.getStorageStatus();

      expect(status.level).toBe('critical');
      expect(status.canProceed).toBe(false);
    });

    it('devrait retourner un avertissement si > 75%', async () => {
      const mockEstimate = vi.fn().mockResolvedValue({
        usage: 1024 * 1024 * 800, // 800 MB
        quota: 1024 * 1024 * 1024, // 1 GB
      });

      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: mockEstimate,
        },
        configurable: true,
      });

      const status = await storageManager.getStorageStatus();

      expect(status.level).toBe('warning');
      expect(status.canProceed).toBe(true);
    });

    it('devrait retourner info si < 75%', async () => {
      const mockEstimate = vi.fn().mockResolvedValue({
        usage: 1024 * 1024 * 100, // 100 MB
        quota: 1024 * 1024 * 1024, // 1 GB
      });

      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: mockEstimate,
        },
        configurable: true,
      });

      const status = await storageManager.getStorageStatus();

      expect(status.level).toBe('info');
      expect(status.canProceed).toBe(true);
    });
  });
});
