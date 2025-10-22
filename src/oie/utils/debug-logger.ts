/**
 * Système de logging avancé pour le débogage de l'OIE
 * Fournit un mode verbose avec des logs structurés et détaillés
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: unknown;
}

export class DebugLogger {
  private static instance: DebugLogger;
  private verboseMode: boolean = false;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private listeners: Array<(entry: LogEntry) => void> = [];
  
  private constructor() {}
  
  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }
  
  /**
   * Active ou désactive le mode verbose
   */
  setVerbose(enabled: boolean): void {
    this.verboseMode = enabled;
    console.log(`[DebugLogger] Mode verbose: ${enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
  }
  
  /**
   * Vérifie si le mode verbose est activé
   */
  isVerbose(): boolean {
    return this.verboseMode;
  }
  
  /**
   * Log un message de débogage (uniquement en mode verbose)
   */
  debug(component: string, message: string, data?: unknown): void {
    if (!this.verboseMode) return;
    this.log('debug', component, message, data);
  }
  
  /**
   * Log un message d'information
   */
  info(component: string, message: string, data?: unknown): void {
    this.log('info', component, message, data);
  }
  
  /**
   * Log un avertissement
   */
  warn(component: string, message: string, data?: unknown): void {
    this.log('warn', component, message, data);
  }
  
  /**
   * Log une erreur
   */
  error(component: string, message: string, data?: unknown): void {
    this.log('error', component, message, data);
  }
  
  /**
   * Méthode interne de logging
   */
  private log(level: LogLevel, component: string, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      data
    };
    
    // Ajouter au buffer de logs
    this.logs.push(entry);
    
    // Limiter la taille du buffer
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // Notifier les listeners
    this.listeners.forEach(listener => listener(entry));
    
    // Afficher dans la console
    this.logToConsole(entry);
  }
  
  /**
   * Affiche un log dans la console avec formatage
   */
  private logToConsole(entry: LogEntry): void {
    const prefix = `[${entry.component}]`;
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    
    const styles: Record<LogLevel, string> = {
      debug: 'color: #888',
      info: 'color: #0ea5e9',
      warn: 'color: #f59e0b',
      error: 'color: #ef4444; font-weight: bold'
    };
    
    const consoleMethod = entry.level === 'error' ? console.error :
                         entry.level === 'warn' ? console.warn :
                         console.log;
    
    if (this.verboseMode || entry.level !== 'debug') {
      if (entry.data) {
        consoleMethod(
          `%c${timestamp} ${prefix} ${entry.message}`,
          styles[entry.level],
          entry.data
        );
      } else {
        consoleMethod(
          `%c${timestamp} ${prefix} ${entry.message}`,
          styles[entry.level]
        );
      }
    }
  }
  
  /**
   * Récupère tous les logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }
  
  /**
   * Récupère les logs filtrés par niveau
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }
  
  /**
   * Récupère les logs filtrés par composant
   */
  getLogsByComponent(component: string): LogEntry[] {
    return this.logs.filter(log => log.component === component);
  }
  
  /**
   * Efface tous les logs
   */
  clearLogs(): void {
    this.logs = [];
    console.log('[DebugLogger] Logs effacés');
  }
  
  /**
   * Exporte les logs au format JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
  
  /**
   * Télécharge les logs dans un fichier
   */
  downloadLogs(filename: string = 'orion-debug-logs.json'): void {
    const blob = new Blob([this.exportLogs()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    console.log(`[DebugLogger] Logs téléchargés: ${filename}`);
  }
  
  /**
   * Ajoute un listener pour les nouveaux logs
   */
  addListener(listener: (entry: LogEntry) => void): () => void {
    this.listeners.push(listener);
    
    // Retourne une fonction de cleanup
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Log les informations système (en mode verbose)
   */
  logSystemInfo(): void {
    if (!this.verboseMode) return;
    
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      memory: (performance as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory ? {
        usedJSHeapSize: (((performance as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize) / 1024 / 1024).toFixed(2) + ' MB',
        totalJSHeapSize: (((performance as { memory: { totalJSHeapSize: number } }).memory.totalJSHeapSize) / 1024 / 1024).toFixed(2) + ' MB',
        jsHeapSizeLimit: (((performance as { memory: { jsHeapSizeLimit: number } }).memory.jsHeapSizeLimit) / 1024 / 1024).toFixed(2) + ' MB'
      } : 'Non disponible',
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      connection: (navigator as { connection?: { effectiveType: string; downlink: number; rtt: number } }).connection ? {
        effectiveType: (navigator as { connection: { effectiveType: string; downlink: number; rtt: number } }).connection.effectiveType,
        downlink: (navigator as { connection: { effectiveType: string; downlink: number; rtt: number } }).connection.downlink + ' Mbps',
        rtt: (navigator as { connection: { effectiveType: string; downlink: number; rtt: number } }).connection.rtt + ' ms'
      } : 'Non disponible'
    };
    
    this.debug('System', 'Informations système', info);
  }
  
  /**
   * Log les performances d'une opération
   */
  logPerformance(component: string, operation: string, duration: number, details?: unknown): void {
    const message = `${operation} - ${duration.toFixed(2)}ms`;
    const data = {
      operation,
      duration: `${duration.toFixed(2)}ms`,
      ...details
    };
    
    if (duration > 1000) {
      this.warn(component, `⚠️ Opération lente: ${message}`, data);
    } else {
      this.debug(component, message, data);
    }
  }
  
  /**
   * Log l'état de la mémoire
   */
  logMemoryUsage(component: string): void {
    if (!this.verboseMode) return;
    
    if ((performance as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory) {
      const memory = (performance as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      const used = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
      const total = (memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
      const limit = (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2);
      
      this.debug(component, `Mémoire: ${used} MB / ${total} MB (limite: ${limit} MB)`);
    }
  }
}

// Export d'une instance singleton
export const debugLogger = DebugLogger.getInstance();

// Helper functions pour faciliter l'utilisation
export const setVerboseMode = (enabled: boolean) => debugLogger.setVerbose(enabled);
export const isVerboseMode = () => debugLogger.isVerbose();
export const logDebug = (component: string, message: string, data?: unknown) => 
  debugLogger.debug(component, message, data);
export const logInfo = (component: string, message: string, data?: unknown) => 
  debugLogger.info(component, message, data);
export const logWarn = (component: string, message: string, data?: unknown) => 
  debugLogger.warn(component, message, data);
export const logError = (component: string, message: string, data?: unknown) => 
  debugLogger.error(component, message, data);
