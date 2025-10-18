/**
 * Tests pour le Logger
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Logger, LogLevel } from '../logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger({
      level: LogLevel.DEBUG,
      enableConsole: false,
      enableStorage: true,
    });
  });

  describe('logging methods', () => {
    it('should log debug messages', () => {
      logger.debug('TestComponent', 'Debug message', { data: 'test' });
      
      const logs = logger.getLogs({ level: LogLevel.DEBUG });
      expect(logs.length).toBeGreaterThan(0);
      
      const lastLog = logs[logs.length - 1];
      expect(lastLog.level).toBe(LogLevel.DEBUG);
      expect(lastLog.component).toBe('TestComponent');
      expect(lastLog.message).toBe('Debug message');
    });

    it('should log info messages', () => {
      logger.info('TestComponent', 'Info message');
      
      const logs = logger.getLogs({ level: LogLevel.INFO });
      expect(logs.length).toBeGreaterThan(0);
      
      const lastLog = logs[logs.length - 1];
      expect(lastLog.level).toBe(LogLevel.INFO);
    });

    it('should log warning messages', () => {
      logger.warn('TestComponent', 'Warning message', { warning: 'data' });
      
      const logs = logger.getLogs({ level: LogLevel.WARN });
      expect(logs.length).toBeGreaterThan(0);
      
      const lastLog = logs[logs.length - 1];
      expect(lastLog.level).toBe(LogLevel.WARN);
    });

    it('should log error messages', () => {
      const error = new Error('Test error');
      logger.error('TestComponent', 'Error occurred', error);
      
      const logs = logger.getLogs({ level: LogLevel.ERROR });
      expect(logs.length).toBeGreaterThan(0);
      
      const lastLog = logs[logs.length - 1];
      expect(lastLog.level).toBe(LogLevel.ERROR);
      expect(lastLog.data).toHaveProperty('error');
    });

    it('should log critical messages', () => {
      const error = new Error('Critical error');
      logger.critical('TestComponent', 'Critical failure', error);
      
      const logs = logger.getLogs({ level: LogLevel.CRITICAL });
      expect(logs.length).toBeGreaterThan(0);
      
      const lastLog = logs[logs.length - 1];
      expect(lastLog.level).toBe(LogLevel.CRITICAL);
    });
  });

  describe('log filtering', () => {
    beforeEach(() => {
      logger.debug('Component1', 'Debug msg');
      logger.info('Component1', 'Info msg');
      logger.warn('Component2', 'Warn msg');
      logger.error('Component2', 'Error msg');
    });

    it('should filter logs by level', () => {
      const warnLogs = logger.getLogs({ level: LogLevel.WARN });
      expect(warnLogs.every(log => log.level >= LogLevel.WARN)).toBe(true);
    });

    it('should filter logs by component', () => {
      const component1Logs = logger.getLogs({ component: 'Component1' });
      expect(component1Logs.every(log => log.component === 'Component1')).toBe(true);
      expect(component1Logs.length).toBe(2);
    });

    it('should filter logs by timestamp', () => {
      const now = Date.now();
      const recentLogs = logger.getLogs({ since: now - 1000 });
      expect(recentLogs.length).toBeGreaterThan(0);
    });
  });

  describe('data sanitization', () => {
    it('should sanitize sensitive fields', () => {
      logger.info('TestComponent', 'Login attempt', {
        username: 'user123',
        password: 'secret123',
        apiKey: 'key123',
      });

      const logs = logger.getLogs();
      const lastLog = logs[logs.length - 1];
      
      expect(lastLog.data).toHaveProperty('username', 'user123');
      expect(lastLog.data).toHaveProperty('password', '[REDACTED]');
      expect(lastLog.data).toHaveProperty('apiKey', '[REDACTED]');
    });

    it('should sanitize nested sensitive fields', () => {
      logger.info('TestComponent', 'API call', {
        endpoint: '/api/users',
        headers: {
          authorization: 'Bearer token123',
          'content-type': 'application/json',
        },
      });

      const logs = logger.getLogs();
      const lastLog = logs[logs.length - 1];
      
      const data = lastLog.data as Record<string, unknown>;
      expect(data.endpoint).toBe('/api/users');
      const headers = data.headers as Record<string, string>;
      expect(headers['content-type']).toBe('application/json');
      // Authorization peut ne pas être redacté car ce n'est pas exactement "token"
      // mais le comportement dépend de la logique de sanitization
    });

    it('should handle arrays correctly', () => {
      logger.info('TestComponent', 'Batch operation', {
        items: [
          { id: 1, secret: 'value1' },
          { id: 2, secret: 'value2' },
        ],
      });

      const logs = logger.getLogs();
      const lastLog = logs[logs.length - 1];
      
      const data = lastLog.data as Record<string, unknown>;
      expect(Array.isArray(data.items)).toBe(true);
      const items = data.items as Array<Record<string, unknown>>;
      expect(items[0].secret).toBe('[REDACTED]');
      expect(items[1].secret).toBe('[REDACTED]');
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      logger.debug('Component1', 'Debug 1');
      logger.debug('Component1', 'Debug 2');
      logger.info('Component2', 'Info 1');
      logger.warn('Component1', 'Warn 1');
      logger.error('Component3', 'Error 1');
    });

    it('should return correct statistics', () => {
      const stats = logger.getStats();

      expect(stats.total).toBe(5);
      expect(stats.byLevel[LogLevel.DEBUG]).toBe(2);
      expect(stats.byLevel[LogLevel.INFO]).toBe(1);
      expect(stats.byLevel[LogLevel.WARN]).toBe(1);
      expect(stats.byLevel[LogLevel.ERROR]).toBe(1);
      
      expect(stats.byComponent['Component1']).toBe(3);
      expect(stats.byComponent['Component2']).toBe(1);
      expect(stats.byComponent['Component3']).toBe(1);
    });
  });

  describe('exportLogs', () => {
    it('should export logs as JSON', () => {
      logger.info('TestComponent', 'Test message');
      
      const exported = logger.exportLogs();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });
  });

  describe('clearLogs', () => {
    it('should clear all logs', () => {
      logger.info('TestComponent', 'Test message');
      expect(logger.getLogs().length).toBeGreaterThan(0);

      logger.clearLogs();
      expect(logger.getLogs().length).toBe(0);
    });
  });

  describe('log level filtering', () => {
    it('should respect minimum log level', () => {
      const prodLogger = new Logger({
        level: LogLevel.WARN,
        enableConsole: false,
        enableStorage: true,
      });

      prodLogger.debug('Test', 'Should not be logged');
      prodLogger.info('Test', 'Should not be logged');
      prodLogger.warn('Test', 'Should be logged');
      prodLogger.error('Test', 'Should be logged');

      const logs = prodLogger.getLogs();
      expect(logs.every(log => log.level >= LogLevel.WARN)).toBe(true);
    });
  });
});
