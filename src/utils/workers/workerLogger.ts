/**
 * Logger pour Web Workers
 * Version simplifiée du logger principal pour les workers
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  component: string;
  message: string;
  data?: unknown;
  traceId?: string;
}

/**
 * Logger simplifié pour Web Workers
 */
class WorkerLogger {
  private config = {
    level: LogLevel.DEBUG, // En dev, tout afficher. En prod, sera supprimé par Vite
    enableConsole: true,
  };

  private log(
    level: LogLevel,
    component: string,
    message: string,
    data?: unknown,
    traceId?: string
  ): void {
    if (level < this.config.level) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      component,
      message,
      data,
      traceId
    };

    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Envoyer au thread principal pour stockage
    this.notifyMainThread(entry);
  }

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

  private notifyMainThread(entry: LogEntry): void {
    // Envoyer au thread principal si possible
    if (typeof self !== 'undefined' && 'postMessage' in self) {
      try {
        self.postMessage({
          type: 'log_entry',
          payload: entry
        });
      } catch (error) {
        // Ignorer les erreurs si le message ne peut pas être posté
      }
    }
  }

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
}

export const logger = new WorkerLogger();
