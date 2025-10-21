// src/utils/performance/memoryMonitor.ts

/**
 * Moniteur de performance mémoire pour ORION
 * 
 * Surveille en temps réel:
 * - Utilisation mémoire globale
 * - Modèles chargés
 * - Pression mémoire
 * - Cache et stockage
 */

import { logger } from '../logger';
import { detectMemoryPressure } from '../../config/modelOptimization';

export interface MemorySnapshot {
  timestamp: number;
  
  // Mémoire JavaScript
  jsHeapUsed: number;
  jsHeapTotal: number;
  jsHeapLimit: number;
  jsHeapUsagePercent: number;
  
  // Pression
  pressure: 'low' | 'medium' | 'high' | 'critical';
  
  // Stockage
  storageUsed?: number;
  storageQuota?: number;
  storageUsagePercent?: number;
  
  // Modèles
  loadedModelsCount: number;
  totalModelSize: number;
  
  // Recommendations
  recommendations: string[];
}

export class MemoryMonitor {
  private snapshots: MemorySnapshot[] = [];
  private maxSnapshots = 100;
  private monitoringInterval: number | null = null;
  private listeners = new Set<(snapshot: MemorySnapshot) => void>();

  constructor() {
    this.startMonitoring();
  }

  /**
   * Démarre la surveillance automatique
   */
  startMonitoring(intervalMs = 30000) {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    logger.info('MemoryMonitor', 'Démarrage de la surveillance mémoire', {
      interval: `${intervalMs / 1000}s`,
    });

    this.monitoringInterval = window.setInterval(() => {
      this.takeSnapshot();
    }, intervalMs);

    // Première snapshot immédiate
    this.takeSnapshot();
  }

  /**
   * Arrête la surveillance
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('MemoryMonitor', 'Arrêt de la surveillance mémoire');
    }
  }

  /**
   * Prend un instantané de la mémoire
   */
  async takeSnapshot(): Promise<MemorySnapshot> {
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      jsHeapUsed: 0,
      jsHeapTotal: 0,
      jsHeapLimit: 0,
      jsHeapUsagePercent: 0,
      pressure: 'low',
      loadedModelsCount: 0,
      totalModelSize: 0,
      recommendations: [],
    };

    // Mémoire JavaScript
    // @ts-expect-error - performance.memory non standard
    if (performance.memory) {
      // @ts-expect-error - performance.memory
      const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
      
      snapshot.jsHeapUsed = usedJSHeapSize;
      snapshot.jsHeapTotal = totalJSHeapSize;
      snapshot.jsHeapLimit = jsHeapSizeLimit;
      snapshot.jsHeapUsagePercent = (usedJSHeapSize / jsHeapSizeLimit) * 100;
    }

    // Pression mémoire
    const pressure = await detectMemoryPressure();
    snapshot.pressure = pressure.pressure;

    // Stockage
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        snapshot.storageUsed = estimate.usage || 0;
        snapshot.storageQuota = estimate.quota || 0;
        snapshot.storageUsagePercent = estimate.quota 
          ? ((estimate.usage || 0) / estimate.quota) * 100 
          : 0;
      } catch (error) {
        logger.warn('MemoryMonitor', 'Impossible d\'estimer le stockage', error);
      }
    }

    // Modèles chargés (via événements custom)
    try {
      const modelLoader = (window as Window & { __modelLoader?: { getStats: () => { loadedModels: number; totalMemoryUsage: number } } }).__modelLoader;
      if (modelLoader) {
        const stats = modelLoader.getStats();
        snapshot.loadedModelsCount = stats.loadedModels;
        snapshot.totalModelSize = stats.totalMemoryUsage;
      }
    } catch {
      // Ignorer si le model loader n'est pas disponible
    }

    // Générer des recommandations
    snapshot.recommendations = this.generateRecommendations(snapshot);

    // Ajouter aux snapshots
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    // Notifier les listeners
    this.notifyListeners(snapshot);

    // Logger si pression élevée
    if (snapshot.pressure === 'high' || snapshot.pressure === 'critical') {
      logger.warn('MemoryMonitor', 'Pression mémoire détectée', {
        pressure: snapshot.pressure,
        usage: `${snapshot.jsHeapUsagePercent.toFixed(1)}%`,
        recommendations: snapshot.recommendations,
      });
    }

    return snapshot;
  }

  /**
   * Génère des recommandations basées sur l'état actuel
   */
  private generateRecommendations(snapshot: MemorySnapshot): string[] {
    const recommendations: string[] = [];

    // Recommandations mémoire JS
    if (snapshot.jsHeapUsagePercent > 90) {
      recommendations.push('URGENT: Mémoire critique! Décharger les modèles inutilisés immédiatement.');
    } else if (snapshot.jsHeapUsagePercent > 75) {
      recommendations.push('Mémoire élevée. Considérer le déchargement de modèles.');
    } else if (snapshot.jsHeapUsagePercent > 50) {
      recommendations.push('Utilisation mémoire modérée. Surveillance recommandée.');
    }

    // Recommandations stockage
    if (snapshot.storageUsagePercent && snapshot.storageUsagePercent > 90) {
      recommendations.push('URGENT: Stockage presque plein! Nettoyer le cache.');
    } else if (snapshot.storageUsagePercent && snapshot.storageUsagePercent > 75) {
      recommendations.push('Stockage élevé. Considérer le nettoyage du cache.');
    }

    // Recommandations modèles
    if (snapshot.loadedModelsCount > 3) {
      recommendations.push(`${snapshot.loadedModelsCount} modèles chargés. Limiter à 2-3 modèles max.`);
    }

    // Recommandations pression
    if (snapshot.pressure === 'critical') {
      recommendations.push('Activer le mode économie d\'énergie et limiter les fonctionnalités.');
    } else if (snapshot.pressure === 'high') {
      recommendations.push('Utiliser la quantization q4 pour tous les modèles.');
    }

    return recommendations;
  }

  /**
   * Enregistre un listener pour les snapshots
   */
  addListener(callback: (snapshot: MemorySnapshot) => void) {
    this.listeners.add(callback);
  }

  /**
   * Supprime un listener
   */
  removeListener(callback: (snapshot: MemorySnapshot) => void) {
    this.listeners.delete(callback);
  }

  /**
   * Notifie tous les listeners
   */
  private notifyListeners(snapshot: MemorySnapshot) {
    this.listeners.forEach(listener => {
      try {
        listener(snapshot);
      } catch (error) {
        logger.error('MemoryMonitor', 'Erreur dans listener', error);
      }
    });
  }

  /**
   * Récupère l'historique des snapshots
   */
  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Récupère le dernier snapshot
   */
  getLatestSnapshot(): MemorySnapshot | null {
    return this.snapshots[this.snapshots.length - 1] || null;
  }

  /**
   * Calcule les statistiques sur une période
   */
  getStats(periodMs = 300000): {
    averageUsage: number;
    peakUsage: number;
    minUsage: number;
    averagePressure: string;
    warnings: number;
  } {
    const cutoff = Date.now() - periodMs;
    const recentSnapshots = this.snapshots.filter(s => s.timestamp >= cutoff);

    if (recentSnapshots.length === 0) {
      return {
        averageUsage: 0,
        peakUsage: 0,
        minUsage: 0,
        averagePressure: 'unknown',
        warnings: 0,
      };
    }

    const usages = recentSnapshots.map(s => s.jsHeapUsagePercent);
    const pressures = recentSnapshots.map(s => s.pressure);

    return {
      averageUsage: usages.reduce((a, b) => a + b, 0) / usages.length,
      peakUsage: Math.max(...usages),
      minUsage: Math.min(...usages),
      averagePressure: this.getMostCommonPressure(pressures),
      warnings: recentSnapshots.filter(s => 
        s.pressure === 'high' || s.pressure === 'critical'
      ).length,
    };
  }

  private getMostCommonPressure(pressures: string[]): string {
    const counts = pressures.reduce((acc, p) => {
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
  }

  /**
   * Exporte les données pour analyse
   */
  exportData(): string {
    return JSON.stringify({
      snapshots: this.snapshots,
      stats: this.getStats(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Réinitialise l'historique
   */
  reset() {
    this.snapshots = [];
    logger.info('MemoryMonitor', 'Historique réinitialisé');
  }

  /**
   * Nettoie et arrête le moniteur
   */
  destroy() {
    this.stopMonitoring();
    this.listeners.clear();
    this.snapshots = [];
  }
}

// Instance singleton
let memoryMonitor: MemoryMonitor | null = null;

export function getMemoryMonitor(): MemoryMonitor {
  if (!memoryMonitor) {
    memoryMonitor = new MemoryMonitor();
  }
  return memoryMonitor;
}

export function destroyMemoryMonitor() {
  if (memoryMonitor) {
    memoryMonitor.destroy();
    memoryMonitor = null;
  }
}

/**
 * Formatte les octets en string lisible
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
