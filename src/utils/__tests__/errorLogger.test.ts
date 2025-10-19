import { describe, it, expect, beforeEach } from 'vitest';
import { errorLogger, UserMessages } from '../errorLogger';

describe('ErrorLogger', () => {
  beforeEach(() => {
    errorLogger.clear();
  });

  it('should log an error correctly', () => {
    const log = errorLogger.error(
      'TestComponent',
      'Technical error message',
      'User-friendly message'
    );
    
    expect(log).toMatchObject({
      severity: 'error',
      component: 'TestComponent',
      technicalMessage: 'Technical error message',
      userMessage: 'User-friendly message',
    });
    expect(log.id).toBeDefined();
    expect(log.timestamp).toBeDefined();
  });

  it('should retrieve logs by severity', () => {
    errorLogger.info('Component1', 'Info msg', 'Info for user');
    errorLogger.error('Component2', 'Error msg', 'Error for user');
    errorLogger.warning('Component3', 'Warn msg', 'Warning for user');
    
    const errorLogs = errorLogger.getLogs('error');
    expect(errorLogs).toHaveLength(1);
    expect(errorLogs[0].severity).toBe('error');
  });

  it('should retrieve logs by component', () => {
    errorLogger.info('LLM', 'Msg 1', 'User msg 1');
    errorLogger.error('Memory', 'Msg 2', 'User msg 2');
    errorLogger.warning('LLM', 'Msg 3', 'User msg 3');
    
    const llmLogs = errorLogger.getLogsByComponent('LLM');
    expect(llmLogs).toHaveLength(2);
  });

  it('should limit number of logs stored', () => {
    for (let i = 0; i < 150; i++) {
      errorLogger.info('Test', `Message ${i}`, `User message ${i}`);
    }
    
    const logs = errorLogger.getLogs();
    expect(logs.length).toBeLessThanOrEqual(100);
  });

  it('should export logs as JSON', () => {
    errorLogger.error('Test', 'Error message', 'User error');
    const exported = errorLogger.export();
    
    expect(exported).toBeTruthy();
    const parsed = JSON.parse(exported);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
  });

  it('should notify subscribers on new log', () => {
    let receivedLog = null;
    const unsubscribe = errorLogger.subscribe((log) => {
      receivedLog = log;
    });
    
    const log = errorLogger.warning('Test', 'Warning', 'User warning');
    expect(receivedLog).toEqual(log);
    
    unsubscribe();
  });

  it('should have user messages defined', () => {
    expect(UserMessages.LLM_LOAD_FAILED).toBeDefined();
    expect(UserMessages.MEMORY_SEARCH_FAILED).toBeDefined();
    expect(UserMessages.UNKNOWN_ERROR).toBeDefined();
    expect(typeof UserMessages.LLM_LOAD_FAILED).toBe('string');
  });
});
