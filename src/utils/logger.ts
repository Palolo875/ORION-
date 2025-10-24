/**
 * Logger structuré pour ORION
 * Remplace console.log avec un système de logging production-ready
 * 
 * Features:
 * - Logs structurés au format JSON
 * - Filtrage par niveau (DEBUG, INFO, WARN, ERROR, CRITICAL)
 * - Sanitization automatique des données sensibles
 * - Export pour debugging
 * - Intégration avec monitoring (Sentry, etc.)
 * - Trace IDs pour suivre les requêtes
 * - Performance metrics
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
  // Nouveaux champs
  enablePerformanceTracking: boolean;
  enableContextTracking: boolean;
  outputFormat: 'pretty' | 'json';
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
  // Nouveaux champs
  duration?: number; // Pour les métriques de performance
  context?: Record<string, unknown>; // Contexte additionnel
  tags?: string[]; // Tags pour filtrage
  environment?: string; // dev, staging, production
}

/**
 * Logger production-ready avec features avancées
 */
class Logger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private performanceMarks = new Map<string, number>();
  private globalContext: Record<string, unknown> = {};
  
  constructor(config?: Partial<LoggerConfig>) {
    const isDev = import.meta.env.DEV;
    const isProd = import.meta.env.PROD;
    
    this.config = {
      level: isProd ? LogLevel.WARN : LogLevel.DEBUG,
      enableConsole: isDev,
      enableStorage: true,
      maxStoredLogs: 1000,
      sensitiveFields: ['password', 'token', 'apiKey', 'secret', 'credential', 'key'],
      enablePerformanceTracking: true,
      enableContextTracking: true,
      outputFormat: isDev ? 'pretty' : 'json',
      ...config
    };
    
    // Capturer l'environnement
    if (this.config.enableContextTracking) {
      this.globalContext = {
        environment: isProd ? 'production' : 'development',
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
        timestamp: Date.now(),
      };
    }
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
    const method = {
      [LogLevel.DEBUG]: console.debug,
      [LogLevel.INFO]: console.info,
      [LogLevel.WARN]: console.warn,
      [LogLevel.ERROR]: console.error,
      [LogLevel.CRITICAL]: console.error
    }[entry.level];
    
    if (this.config.outputFormat === 'json') {
      // Format JSON structuré (production)
      method(JSON.stringify({
        timestamp: new Date(entry.timestamp).toISOString(),
        level: LogLevel[entry.level],
        component: entry.component,
        message: entry.message,
        ...entry.data && { data: entry.data },
        ...entry.traceId && { traceId: entry.traceId },
        ...entry.duration && { duration: `${entry.duration}ms` },
        ...entry.context && { context: entry.context },
        ...entry.tags && { tags: entry.tags },
      }));
    } else {
      // Format pretty (development)
      const emoji = {
        [LogLevel.DEBUG]: '🐛',
        [LogLevel.INFO]: 'ℹ️',
        [LogLevel.WARN]: '⚠️',
        [LogLevel.ERROR]: '❌',
        [LogLevel.CRITICAL]: '🔥'
      }[entry.level];
      
      const timestamp = new Date(entry.timestamp).toISOString();
      const prefix = `${emoji} [${entry.component}] ${timestamp}`;
      const suffix = entry.duration ? ` (${entry.duration}ms)` : '';
      
      if (entry.data) {
        method(prefix, entry.message + suffix, entry.data);
      } else {
        method(prefix, entry.message + suffix);
      }
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
  
  /**
   * Marquer le début d'une opération pour mesurer la performance
   */
  startPerformance(operationId: string): void {
    if (!this.config.enablePerformanceTracking) return;
    this.performanceMarks.set(operationId, performance.now());
  }
  
  /**
   * Terminer une opération et logger sa durée
   */
  endPerformance(operationId: string, component: string, message: string): number | null {
    if (!this.config.enablePerformanceTracking) return null;
    
    const startTime = this.performanceMarks.get(operationId);
    if (!startTime) {
      this.warn(component, `Performance mark not found: ${operationId}`);
      return null;
    }
    
    const duration = performance.now() - startTime;
    this.performanceMarks.delete(operationId);
    
    this.info(component, message, { duration: `${duration.toFixed(2)}ms` });
    return duration;
  }
  
  /**
   * Définir un contexte global pour tous les logs suivants
   */
  setGlobalContext(context: Record<string, unknown>): void {
    this.globalContext = { ...this.globalContext, ...context };
  }
  
  /**
   * Obtenir le contexte global
   */
  getGlobalContext(): Record<string, unknown> {
    return { ...this.globalContext };
  }
  
  /**
   * Créer un logger enfant avec un contexte spécifique
   */
  createChild(component: string, context?: Record<string, unknown>): ChildLogger {
    return new ChildLogger(this, component, context);
  }
}

/**
 * Logger enfant avec contexte spécifique
 */
class ChildLogger {
  constructor(
    private parent: Logger,
    private component: string,
    private context?: Record<string, unknown>
  ) {}
  
  debug(message: string, data?: unknown): void {
    this.parent.debug(this.component, message, { ...this.context, ...data as object });
  }
  
  info(message: string, data?: unknown): void {
    this.parent.info(this.component, message, { ...this.context, ...data as object });
  }
  
  warn(message: string, data?: unknown): void {
    this.parent.warn(this.component, message, { ...this.context, ...data as object });
  }
  
  error(message: string, error?: Error | unknown): void {
    this.parent.error(this.component, message, error);
  }
  
  critical(message: string, error?: Error | unknown): void {
    this.parent.critical(this.component, message, error);
  }
}

// Instance globale
export const logger = new Logger();

// Export pour tests
export { Logger, ChildLogger };
