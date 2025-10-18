/**
 * Logger structuré pour ORION
 * Remplace console.log avec un système de logging production-ready
 */

/**
 * Niveaux de log
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

/**
 * Configuration du logger
 */
interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStoredLogs: number;
  sensitiveFields: string[];
}

/**
 * Structure d'un log
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  component: string;
  message: string;
  data?: unknown;
  traceId?: string;
  userId?: string;
}

/**
 * Logger production-ready
 */
class Logger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  
  constructor(config?: Partial<LoggerConfig>) {
    const isDev = import.meta.env.DEV;
    const isProd = import.meta.env.PROD;
    
    this.config = {
      level: isProd ? LogLevel.WARN : LogLevel.DEBUG,
      enableConsole: isDev,
      enableStorage: true,
      maxStoredLogs: 1000,
      sensitiveFields: ['password', 'token', 'apiKey', 'secret', 'credential', 'key'],
      ...config
    };
  }
  
  /**
   * Méthode principale de logging
   */
  private log(
    level: LogLevel,
    component: string,
    message: string,
    data?: unknown,
    traceId?: string
  ): void {
    // Filtrer selon le niveau
    if (level < this.config.level) return;
    
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      component,
      message,
      data: this.sanitizeData(data),
      traceId
    };
    
    // Console (dev seulement)
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }
    
    // Stockage (pour export/debug)
    if (this.config.enableStorage) {
      this.storeLog(entry);
    }
    
    // Alerting pour erreurs critiques
    if (level >= LogLevel.ERROR) {
      this.handleError(entry);
    }
  }
  
  /**
   * Sanitize les données sensibles
   */
  private sanitizeData(data: unknown): unknown {
    if (!data) return data;
    
    // Primitive : retourner tel quel
    if (typeof data !== 'object') return data;
    
    // Array : sanitize récursif
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }
    
    // Object : masquer les champs sensibles
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      
      // Masquer les champs sensibles
      if (this.config.sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = this.sanitizeData(value);
      }
    }
    
    return sanitized;
  }
  
  /**
   * Log vers la console (dev)
   */
  private logToConsole(entry: LogEntry): void {
    const emoji = {
      [LogLevel.DEBUG]: '🐛',
      [LogLevel.INFO]: 'ℹ️',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.ERROR]: '❌',
      [LogLevel.CRITICAL]: '🔥'
    }[entry.level];
    
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `${emoji} [${entry.component}] ${timestamp}`;
    
    const method = {
      [LogLevel.DEBUG]: console.debug,
      [LogLevel.INFO]: console.info,
      [LogLevel.WARN]: console.warn,
      [LogLevel.ERROR]: console.error,
      [LogLevel.CRITICAL]: console.error
    }[entry.level];
    
    if (entry.data) {
      method(prefix, entry.message, entry.data);
    } else {
      method(prefix, entry.message);
    }
  }
  
  /**
   * Stocker le log (pour export/debug)
   */
  private storeLog(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Limiter la taille du buffer
    if (this.logs.length > this.config.maxStoredLogs) {
      this.logs.shift(); // FIFO
    }
  }
  
  /**
   * Gérer les erreurs critiques
   */
  private handleError(entry: LogEntry): void {
    // En production : envoyer à un service de monitoring
    // Pour l'instant : stocker localement pour export
    
    if (entry.level === LogLevel.CRITICAL) {
      // Notifier l'utilisateur
      this.notifyUser('Une erreur critique est survenue');
    }
  }
  
  /**
   * Notifier l'utilisateur (toast/notification)
   */
  private notifyUser(message: string): void {
    // Intégration avec le système de toast
    if (typeof window !== 'undefined') {
      // Toast est disponible via le hook use-toast
      const event = new CustomEvent('orion:error', {
        detail: { message }
      });
      window.dispatchEvent(event);
    }
  }
  
  // ==================== API Publique ====================
  
  debug(component: string, message: string, data?: unknown, traceId?: string): void {
    this.log(LogLevel.DEBUG, component, message, data, traceId);
  }
  
  info(component: string, message: string, data?: unknown, traceId?: string): void {
    this.log(LogLevel.INFO, component, message, data, traceId);
  }
  
  warn(component: string, message: string, data?: unknown, traceId?: string): void {
    this.log(LogLevel.WARN, component, message, data, traceId);
  }
  
  error(component: string, message: string, error?: Error | unknown, traceId?: string): void {
    this.log(LogLevel.ERROR, component, message, {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    }, traceId);
  }
  
  critical(component: string, message: string, error?: Error | unknown, traceId?: string): void {
    this.log(LogLevel.CRITICAL, component, message, {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    }, traceId);
  }
  
  /**
   * Exporter les logs (pour debug)
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
  
  /**
   * Vider les logs
   */
  clearLogs(): void {
    this.logs = [];
  }
  
  /**
   * Obtenir les logs filtrés
   */
  getLogs(filter?: {
    level?: LogLevel;
    component?: string;
    since?: number;
  }): LogEntry[] {
    let filtered = [...this.logs];
    
    if (filter?.level !== undefined) {
      filtered = filtered.filter(log => log.level >= filter.level!);
    }
    
    if (filter?.component) {
      filtered = filtered.filter(log => log.component === filter.component);
    }
    
    if (filter?.since) {
      filtered = filtered.filter(log => log.timestamp >= filter.since!);
    }
    
    return filtered;
  }

  /**
   * Obtenir des statistiques sur les logs
   */
  getStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byComponent: Record<string, number>;
  } {
    const byLevel: Record<LogLevel, number> = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
      [LogLevel.CRITICAL]: 0
    };
    
    const byComponent: Record<string, number> = {};
    
    for (const log of this.logs) {
      byLevel[log.level]++;
      byComponent[log.component] = (byComponent[log.component] || 0) + 1;
    }
    
    return {
      total: this.logs.length,
      byLevel,
      byComponent
    };
  }
}

// Instance globale
export const logger = new Logger();

// Export pour tests
export { Logger };
