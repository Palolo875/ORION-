/**
 * Debugger - Outils de débogage avancés pour ORION
 * 
 * Ce module fournit des outils pour faciliter le débogage de l'application,
 * notamment l'inspection des workers, des états internes, et des performances.
 */

import { logger, LogLevel } from '../logger';
import { performanceMonitor } from './performanceMonitor';

/**
 * Options de débogage
 */
export interface DebugOptions {
  enableVerboseLogging?: boolean;
  enablePerformanceTracking?: boolean;
  enableStateInspection?: boolean;
  logWorkerMessages?: boolean;
}

/**
 * Snapshot de l'état de débogage
 */
export interface DebugSnapshot {
  timestamp: number;
  logs: string;
  performance: string;
  memory: {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  };
  userAgent: string;
  workers: {
    active: string[];
    errors: string[];
  };
}

/**
 * Classe de débogage
 */
class OrionDebugger {
  private options: DebugOptions = {
    enableVerboseLogging: false,
    enablePerformanceTracking: true,
    enableStateInspection: false,
    logWorkerMessages: false,
  };

  private activeWorkers: Set<string> = new Set();
  private workerErrors: Array<{ worker: string; error: string; timestamp: number }> = [];

  /**
   * Configure les options de débogage
   */
  configure(options: Partial<DebugOptions>): void {
    this.options = { ...this.options, ...options };
    
    if (this.options.enableVerboseLogging) {
      logger.info('Debugger', 'Verbose logging enabled');
    }
    
    if (this.options.enablePerformanceTracking) {
      logger.info('Debugger', 'Performance tracking enabled');
    }
  }

  /**
   * Enregistre un worker actif
   */
  registerWorker(workerName: string): void {
    this.activeWorkers.add(workerName);
    logger.debug('Debugger', `Worker registered: ${workerName}`);
  }

  /**
   * Désenregistre un worker
   */
  unregisterWorker(workerName: string): void {
    this.activeWorkers.delete(workerName);
    logger.debug('Debugger', `Worker unregistered: ${workerName}`);
  }

  /**
   * Enregistre une erreur de worker
   */
  logWorkerError(workerName: string, error: string): void {
    this.workerErrors.push({
      worker: workerName,
      error,
      timestamp: Date.now(),
    });

    logger.error('Debugger', `Worker error in ${workerName}`, { error });

    // Garder seulement les 100 dernières erreurs
    if (this.workerErrors.length > 100) {
      this.workerErrors.shift();
    }
  }

  /**
   * Crée un snapshot de l'état actuel pour le débogage
   */
  createSnapshot(): DebugSnapshot {
    const memory = performanceMonitor.checkMemoryUsage();

    return {
      timestamp: Date.now(),
      logs: logger.exportLogs(),
      performance: performanceMonitor.exportMetrics(),
      memory: {
        usedJSHeapSize: memory?.usedJSHeapSize,
        totalJSHeapSize: memory?.totalJSHeapSize,
        jsHeapSizeLimit: memory?.jsHeapSizeLimit,
      },
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      workers: {
        active: Array.from(this.activeWorkers),
        errors: this.workerErrors.map(e => `${e.worker}: ${e.error}`),
      },
    };
  }

  /**
   * Télécharge un snapshot de débogage
   */
  downloadSnapshot(filename = 'orion-debug-snapshot.json'): void {
    const snapshot = this.createSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
    logger.info('Debugger', `Debug snapshot downloaded: ${filename}`);
  }

  /**
   * Affiche un résumé du débogage dans la console
   */
  printSummary(): void {
    console.group('🔍 ORION Debug Summary');

    console.log('📊 Performance Report:');
    console.table(performanceMonitor.getReport().components);

    console.log('📝 Log Statistics:');
    console.table(logger.getStats());

    console.log('👷 Active Workers:', Array.from(this.activeWorkers));

    if (this.workerErrors.length > 0) {
      console.log('❌ Recent Worker Errors:');
      console.table(this.workerErrors.slice(-10));
    }

    const memory = performanceMonitor.checkMemoryUsage();
    if (memory) {
      console.log('💾 Memory Usage:');
      console.log(`  Used: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Total: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Limit: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Usage: ${((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1)}%`);
    }

    console.groupEnd();
  }

  /**
   * Active le mode débogage complet
   */
  enableDebugMode(): void {
    this.configure({
      enableVerboseLogging: true,
      enablePerformanceTracking: true,
      enableStateInspection: true,
      logWorkerMessages: true,
    });

    // Exposer les outils de debug dans window pour un accès facile depuis la console
    if (typeof window !== 'undefined') {
      (window as Window & { orionDebug?: unknown }).orionDebug = {
        snapshot: () => this.createSnapshot(),
        download: () => this.downloadSnapshot(),
        summary: () => this.printSummary(),
        logs: () => logger.getLogs(),
        performance: () => performanceMonitor.getReport(),
        clearLogs: () => logger.clearLogs(),
        clearMetrics: () => performanceMonitor.clearMetrics(),
      };

      console.log('🐛 ORION Debug Mode Enabled!');
      console.log('Available commands:');
      console.log('  window.orionDebug.snapshot() - Create debug snapshot');
      console.log('  window.orionDebug.download() - Download debug snapshot');
      console.log('  window.orionDebug.summary() - Print debug summary');
      console.log('  window.orionDebug.logs() - Get all logs');
      console.log('  window.orionDebug.performance() - Get performance report');
      console.log('  window.orionDebug.clearLogs() - Clear all logs');
      console.log('  window.orionDebug.clearMetrics() - Clear all metrics');
    }

    logger.info('Debugger', 'Debug mode enabled');
  }

  /**
   * Désactive le mode débogage
   */
  disableDebugMode(): void {
    this.configure({
      enableVerboseLogging: false,
      enablePerformanceTracking: true,
      enableStateInspection: false,
      logWorkerMessages: false,
    });

    if (typeof window !== 'undefined') {
      const windowWithDebug = window as Window & { orionDebug?: unknown };
      delete windowWithDebug.orionDebug;
    }

    logger.info('Debugger', 'Debug mode disabled');
  }

  /**
   * Trace une fonction pour le débogage
   */
  trace<T extends (...args: unknown[]) => unknown>(
    functionName: string,
    fn: T,
    component?: string
  ): T {
    return ((...args: unknown[]) => {
      const endTracking = performanceMonitor.startTracking(
        component || 'Global',
        functionName
      );

      try {
        const result = fn(...args);

        // Si c'est une promesse, tracker la résolution
        if (result instanceof Promise) {
          return result
            .then((value) => {
              endTracking();
              return value;
            })
            .catch((error) => {
              endTracking();
              throw error;
            });
        }

        endTracking();
        return result;
      } catch (error) {
        endTracking();
        throw error;
      }
    }) as T;
  }

  /**
   * Obtient les statistiques des erreurs de workers
   */
  getWorkerErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const error of this.workerErrors) {
      stats[error.worker] = (stats[error.worker] || 0) + 1;
    }

    return stats;
  }

  /**
   * Vérifie la santé du système
   */
  healthCheck(): {
    healthy: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Vérifier la mémoire
    const memory = performanceMonitor.checkMemoryUsage();
    if (memory) {
      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      if (usagePercent > 90) {
        issues.push(`High memory usage: ${usagePercent.toFixed(1)}%`);
      }
    }

    // Vérifier les erreurs récentes de workers
    const recentErrors = this.workerErrors.filter(
      e => Date.now() - e.timestamp < 60000 // Dernière minute
    );
    if (recentErrors.length > 10) {
      issues.push(`High error rate: ${recentErrors.length} errors in last minute`);
    }

    // Vérifier les performances
    const perfReport = performanceMonitor.getReport();
    for (const [component, summary] of Object.entries(perfReport.components)) {
      if (summary.p95 > 5000) { // Plus de 5 secondes au p95
        issues.push(`Slow component: ${component} (p95: ${summary.p95.toFixed(0)}ms)`);
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }
}

// Instance globale
export const orionDebugger = new OrionDebugger();

// Auto-activer en mode développement
if (import.meta.env.DEV) {
  orionDebugger.configure({
    enableVerboseLogging: false,
    enablePerformanceTracking: true,
    enableStateInspection: true,
    logWorkerMessages: false,
  });
}

// Export pour tests
export { OrionDebugger };
