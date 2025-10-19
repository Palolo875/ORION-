/**
 * Performance Monitor - Suivi des performances d'ORION
 * 
 * Ce module fournit des outils pour surveiller et optimiser les performances
 * de l'application, notamment les temps de réponse, l'utilisation mémoire,
 * et les métriques des workers.
 */

import { logger } from '../logger';

/**
 * Métriques de performance
 */
export interface PerformanceMetrics {
  component: string;
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Métriques mémoire
 */
export interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

/**
 * Résumé des performances
 */
export interface PerformanceSummary {
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  totalOperations: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Moniteur de performances
 */
class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 1000;
  private observers: Map<string, PerformanceObserver> = new Map();

  constructor() {
    // Initialiser les observers pour différents types de métriques
    this.initializeObservers();
    
    // Surveiller la mémoire périodiquement (toutes les 30 secondes)
    if (typeof window !== 'undefined') {
      setInterval(() => this.checkMemoryUsage(), 30000);
    }
  }

  /**
   * Initialise les Performance Observers
   */
  private initializeObservers(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      // Observer pour les mesures custom
      const measureObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          logger.debug('PerformanceMonitor', `Measure: ${entry.name}`, {
            duration: entry.duration,
            startTime: entry.startTime,
          });
        }
      });
      measureObserver.observe({ entryTypes: ['measure'] });
      this.observers.set('measure', measureObserver);

      // Observer pour les ressources (si besoin de debug)
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;
          // Log seulement les ressources lentes (> 1s)
          if (resourceEntry.duration > 1000) {
            logger.warn('PerformanceMonitor', `Slow resource: ${entry.name}`, {
              duration: resourceEntry.duration,
              size: resourceEntry.transferSize,
            });
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', resourceObserver);

    } catch (error) {
      logger.error('PerformanceMonitor', 'Failed to initialize observers', error);
    }
  }

  /**
   * Démarre le suivi d'une opération
   * @param component - Nom du composant
   * @param operation - Nom de l'opération
   * @returns Fonction pour terminer le suivi
   */
  startTracking(component: string, operation: string): () => void {
    const startTime = performance.now();
    const markStart = `${component}:${operation}:start`;
    
    if (typeof window !== 'undefined') {
      performance.mark(markStart);
    }

    return (metadata?: Record<string, unknown>) => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      const markEnd = `${component}:${operation}:end`;

      if (typeof window !== 'undefined') {
        performance.mark(markEnd);
        performance.measure(`${component}:${operation}`, markStart, markEnd);
      }

      const metric: PerformanceMetrics = {
        component,
        operation,
        duration,
        timestamp: Date.now(),
        metadata,
      };

      this.recordMetric(metric);

      // Log si l'opération est lente (> 1s)
      if (duration > 1000) {
        logger.warn('PerformanceMonitor', `Slow operation: ${component}.${operation}`, {
          duration: `${duration.toFixed(2)}ms`,
          metadata,
        });
      } else {
        logger.debug('PerformanceMonitor', `${component}.${operation} completed`, {
          duration: `${duration.toFixed(2)}ms`,
        });
      }
    };
  }

  /**
   * Enregistre une métrique
   */
  private recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);

    // Limiter le nombre de métriques en mémoire
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * Obtient les métriques pour un composant
   */
  getMetrics(filter?: {
    component?: string;
    operation?: string;
    since?: number;
  }): PerformanceMetrics[] {
    let filtered = [...this.metrics];

    if (filter?.component) {
      filtered = filtered.filter(m => m.component === filter.component);
    }

    if (filter?.operation) {
      filtered = filtered.filter(m => m.operation === filter.operation);
    }

    if (filter?.since) {
      filtered = filtered.filter(m => m.timestamp >= filter.since);
    }

    return filtered;
  }

  /**
   * Obtient un résumé des performances
   */
  getSummary(component?: string, operation?: string): PerformanceSummary | null {
    const metrics = this.getMetrics({ component, operation });

    if (metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((acc, d) => acc + d, 0);

    return {
      averageDuration: sum / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      totalOperations: durations.length,
      p50: this.percentile(durations, 50),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99),
    };
  }

  /**
   * Calcule le percentile
   */
  private percentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Vérifie l'utilisation mémoire
   */
  checkMemoryUsage(): MemoryMetrics | null {
    if (typeof window === 'undefined') {
      return null;
    }

    // Check if memory API is available (Chrome only)
    const perfWithMemory = performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };

    if (!perfWithMemory.memory) {
      return null;
    }

    const memory = perfWithMemory.memory;
    const metrics: MemoryMetrics = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      timestamp: Date.now(),
    };

    const usagePercent = (metrics.usedJSHeapSize / metrics.jsHeapSizeLimit) * 100;

    // Alerter si utilisation > 90%
    if (usagePercent > 90) {
      logger.warn('PerformanceMonitor', 'High memory usage detected', {
        usagePercent: `${usagePercent.toFixed(1)}%`,
        usedMB: `${(metrics.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        limitMB: `${(metrics.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
      });
    }

    return metrics;
  }

  /**
   * Obtient un rapport complet des performances
   */
  getReport(): {
    components: Record<string, PerformanceSummary>;
    totalMetrics: number;
    memory: MemoryMetrics | null;
  } {
    const components: Record<string, PerformanceSummary> = {};

    // Grouper par composant
    const componentNames = [...new Set(this.metrics.map(m => m.component))];

    for (const component of componentNames) {
      const summary = this.getSummary(component);
      if (summary) {
        components[component] = summary;
      }
    }

    return {
      components,
      totalMetrics: this.metrics.length,
      memory: this.checkMemoryUsage(),
    };
  }

  /**
   * Exporte les métriques en JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      report: this.getReport(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Vide toutes les métriques
   */
  clearMetrics(): void {
    this.metrics = [];
    logger.info('PerformanceMonitor', 'Metrics cleared');
  }

  /**
   * Détruit le moniteur et nettoie les observers
   */
  destroy(): void {
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();
    this.metrics = [];
  }
}

// Instance globale
export const performanceMonitor = new PerformanceMonitor();

/**
 * Hook pour tracker une opération dans un composant React
 * @example
 * const endTracking = usePerformanceTracking('ChatInput', 'sendMessage');
 * // ... do work ...
 * endTracking({ messageLength: 150 });
 */
export function usePerformanceTracking(
  component: string,
  operation: string
): (metadata?: Record<string, unknown>) => void {
  return performanceMonitor.startTracking(component, operation);
}

// Export pour tests
export { PerformanceMonitor };
