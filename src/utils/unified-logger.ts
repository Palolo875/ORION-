/**
 * Unified Logger pour ORION
 * Intègre le système de logging structuré avec le debug logger
 * Fournit une interface unifiée pour tous les logs de l'application
 */

import { logger as productionLogger, LogLevel } from './logger';
import { debugLogger } from '../oie/utils/debug-logger';

/**
 * Configuration du logger unifié
 */
interface UnifiedLoggerConfig {
  enableProductionLogger: boolean;
  enableDebugLogger: boolean;
  verboseMode: boolean;
  minLevel: LogLevel;
}

/**
 * Logger unifié qui combine les deux systèmes de logging
 */
class UnifiedLogger {
  private config: UnifiedLoggerConfig;
  
  constructor(config?: Partial<UnifiedLoggerConfig>) {
    const isDev = import.meta.env.DEV;
    
    this.config = {
      enableProductionLogger: true,
      enableDebugLogger: isDev,
      verboseMode: isDev,
      minLevel: isDev ? LogLevel.DEBUG : LogLevel.WARN,
      ...config
    };
    
    // Configurer le debug logger
    if (this.config.enableDebugLogger) {
      debugLogger.setVerbose(this.config.verboseMode);
    }
  }
  
  /**
   * Active ou désactive le mode verbose
   */
  setVerbose(enabled: boolean): void {
    this.config.verboseMode = enabled;
    if (this.config.enableDebugLogger) {
      debugLogger.setVerbose(enabled);
    }
  }
  
  /**
   * Définit le niveau minimum de log
   */
  setLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }
  
  /**
   * Log de debug (développement uniquement)
   */
  debug(component: string, message: string, data?: unknown): void {
    if (this.config.enableDebugLogger) {
      debugLogger.debug(component, message, data);
    }
    
    if (this.config.enableProductionLogger) {
      productionLogger.debug(component, message, data);
    }
  }
  
  /**
   * Log d'information
   */
  info(component: string, message: string, data?: unknown): void {
    if (this.config.enableDebugLogger) {
      debugLogger.info(component, message, data);
    }
    
    if (this.config.enableProductionLogger) {
      productionLogger.info(component, message, data);
    }
  }
  
  /**
   * Log d'avertissement
   */
  warn(component: string, message: string, data?: unknown): void {
    if (this.config.enableDebugLogger) {
      debugLogger.warn(component, message, data);
    }
    
    if (this.config.enableProductionLogger) {
      productionLogger.warn(component, message, data);
    }
  }
  
  /**
   * Log d'erreur
   */
  error(component: string, message: string, error?: Error | unknown): void {
    if (this.config.enableDebugLogger) {
      debugLogger.error(component, message, error);
    }
    
    if (this.config.enableProductionLogger) {
      productionLogger.error(component, message, error);
    }
  }
  
  /**
   * Log d'erreur critique
   */
  critical(component: string, message: string, error?: Error | unknown): void {
    // Toujours logger les erreurs critiques
    if (this.config.enableDebugLogger) {
      debugLogger.error(component, `[CRITICAL] ${message}`, error);
    }
    
    if (this.config.enableProductionLogger) {
      productionLogger.critical(component, message, error);
    }
  }
  
  /**
   * Log des performances
   */
  performance(component: string, operation: string, duration: number, details?: unknown): void {
    if (this.config.enableDebugLogger) {
      debugLogger.logPerformance(component, operation, duration, details);
    }
    
    if (this.config.enableProductionLogger && duration > 1000) {
      productionLogger.warn(component, `Opération lente: ${operation}`, {
        duration: `${duration.toFixed(2)}ms`,
        ...details
      });
    }
  }
  
  /**
   * Log de l'état de la mémoire
   */
  memory(component: string): void {
    if (this.config.enableDebugLogger) {
      debugLogger.logMemoryUsage(component);
    }
  }
  
  /**
   * Crée un logger contextualisé pour un composant
   */
  createContextLogger(component: string) {
    return {
      debug: (message: string, data?: unknown) => this.debug(component, message, data),
      info: (message: string, data?: unknown) => this.info(component, message, data),
      warn: (message: string, data?: unknown) => this.warn(component, message, data),
      error: (message: string, error?: Error | unknown) => this.error(component, message, error),
      critical: (message: string, error?: Error | unknown) => this.critical(component, message, error),
      performance: (operation: string, duration: number, details?: unknown) => 
        this.performance(component, operation, duration, details),
      memory: () => this.memory(component),
    };
  }
  
  /**
   * Exporte tous les logs (combinés)
   */
  exportLogs(): { debugLogs: string; productionLogs: string } {
    return {
      debugLogs: this.config.enableDebugLogger ? debugLogger.exportLogs() : '[]',
      productionLogs: this.config.enableProductionLogger ? productionLogger.exportLogs() : '[]'
    };
  }
  
  /**
   * Obtient les statistiques de logging
   */
  getStats(): Record<string, unknown> {
    const stats: Record<string, unknown> = {};
    
    if (this.config.enableDebugLogger) {
      stats.debug = {
        total: debugLogger.getLogs().length,
        errors: debugLogger.getLogsByLevel('error').length,
        warnings: debugLogger.getLogsByLevel('warn').length
      };
    }
    
    if (this.config.enableProductionLogger) {
      stats.production = productionLogger.getStats();
    }
    
    return stats;
  }
  
  /**
   * Efface tous les logs
   */
  clearLogs(): void {
    if (this.config.enableDebugLogger) {
      debugLogger.clearLogs();
    }
    
    if (this.config.enableProductionLogger) {
      productionLogger.clearLogs();
    }
  }
}

// Instance globale
export const unifiedLogger = new UnifiedLogger();

// Export pour customisation
export { UnifiedLogger };

// Helpers pour faciliter l'utilisation
export const setVerboseMode = (enabled: boolean) => unifiedLogger.setVerbose(enabled);
export const createLogger = (component: string) => unifiedLogger.createContextLogger(component);

// Logger par défaut
export default unifiedLogger;
