// src/hooks/useMemoryMonitoring.ts

/**
 * Hook React pour surveiller la mémoire en temps réel
 * 
 * Usage:
 * ```tsx
 * const { snapshot, stats, pressure } = useMemoryMonitoring();
 * ```
 */

import { useEffect, useState } from 'react';
import { getMemoryMonitor, type MemorySnapshot } from '../utils/performance/memoryMonitor';

export function useMemoryMonitoring() {
  const [snapshot, setSnapshot] = useState<MemorySnapshot | null>(null);
  const [pressure, setPressure] = useState<'low' | 'medium' | 'high' | 'critical'>('low');

  useEffect(() => {
    const monitor = getMemoryMonitor();

    // Fonction de callback pour les mises à jour
    const handleSnapshot = (newSnapshot: MemorySnapshot) => {
      setSnapshot(newSnapshot);
      setPressure(newSnapshot.pressure);
    };

    // S'abonner aux mises à jour
    monitor.addListener(handleSnapshot);

    // Prendre un snapshot initial
    monitor.takeSnapshot().then(handleSnapshot);

    // Cleanup
    return () => {
      monitor.removeListener(handleSnapshot);
    };
  }, []);

  // Calculer les stats
  const stats = snapshot ? {
    usagePercent: snapshot.jsHeapUsagePercent,
    usedMemory: snapshot.jsHeapUsed,
    totalMemory: snapshot.jsHeapLimit,
    loadedModels: snapshot.loadedModelsCount,
    recommendations: snapshot.recommendations,
  } : null;

  return {
    snapshot,
    stats,
    pressure,
    isHealthy: pressure === 'low' || pressure === 'medium',
    needsAttention: pressure === 'high',
    isCritical: pressure === 'critical',
  };
}

/**
 * Hook pour surveiller un modèle spécifique
 */
export function useModelMemory(modelId?: string) {
  const { snapshot } = useMemoryMonitoring();
  
  return {
    isLoaded: modelId ? true : false, // Simplification - à améliorer
    memoryUsage: snapshot?.totalModelSize || 0,
    loadedModelsCount: snapshot?.loadedModelsCount || 0,
  };
}

/**
 * Hook pour les alertes mémoire
 */
export function useMemoryAlerts() {
  const { pressure, snapshot } = useMemoryMonitoring();
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    if (snapshot) {
      const newAlerts: string[] = [];

      if (pressure === 'critical') {
        newAlerts.push('⚠️ CRITIQUE: Mémoire insuffisante! Déchargez des modèles.');
      } else if (pressure === 'high') {
        newAlerts.push('⚠️ Attention: Utilisation mémoire élevée.');
      }

      if (snapshot.storageUsagePercent && snapshot.storageUsagePercent > 90) {
        newAlerts.push('💾 Stockage presque plein! Nettoyez le cache.');
      }

      if (snapshot.loadedModelsCount > 3) {
        newAlerts.push(`🤖 Trop de modèles chargés (${snapshot.loadedModelsCount}). Limitez à 2-3 max.`);
      }

      setAlerts(newAlerts);
    }
  }, [pressure, snapshot]);

  return {
    alerts,
    hasAlerts: alerts.length > 0,
    criticalAlerts: alerts.filter(a => a.includes('CRITIQUE')),
  };
}
