/**
 * Hook React pour surveiller le stockage du navigateur
 * 
 * Surveille l'utilisation du stockage et fournit des alertes
 * lorsque les quotas sont dépassés ou approchent des limites.
 */

import { useState, useEffect, useCallback } from 'react';
import { storageManager, StorageInfo, StorageWarning } from '@/utils/browser/storageManager';
import { STORAGE_CONFIG } from '@/config/constants';
import { logger } from '@/utils/logger';

export interface UseStorageMonitorOptions {
  enabled?: boolean;
  monitorInterval?: number;
  onWarning?: (warning: StorageWarning) => void;
}

export function useStorageMonitor(options: UseStorageMonitorOptions = {}) {
  const {
    enabled = true,
    monitorInterval = STORAGE_CONFIG.MONITOR_INTERVAL,
    onWarning,
  } = options;

  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [storageWarning, setStorageWarning] = useState<StorageWarning | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Vérifie le stockage actuel
   */
  const checkStorage = useCallback(async () => {
    try {
      const info = await storageManager.getStorageInfo();
      const status = await storageManager.getStorageStatus();
      
      setStorageInfo(info);
      setStorageWarning(status);

      if ((status.level === 'warning' || status.level === 'critical') && onWarning) {
        onWarning(status);
      }

      logger.debug('useStorageMonitor', 'Storage checked', {
        usage: storageManager.formatBytes(info.usage),
        quota: storageManager.formatBytes(info.quota),
        percentage: info.percentage.toFixed(1) + '%',
      });
    } catch (error) {
      logger.error('useStorageMonitor', 'Error checking storage', error);
    } finally {
      setIsLoading(false);
    }
  }, [onWarning]);

  /**
   * Vérifie si un modèle peut être chargé
   */
  const canLoadModel = useCallback(async (modelSize: number): Promise<StorageWarning> => {
    const warning = await storageManager.canLoadModel(modelSize);
    setStorageWarning(warning);
    return warning;
  }, []);

  /**
   * Vide les caches pour libérer de l'espace
   */
  const clearCaches = useCallback(async (): Promise<number> => {
    const freedSpace = await storageManager.clearCaches();
    await checkStorage(); // Rafraîchir les infos après nettoyage
    return freedSpace;
  }, [checkStorage]);

  /**
   * Demande la persistance du stockage
   */
  const requestPersistence = useCallback(async (): Promise<boolean> => {
    const result = await storageManager.requestPersistence();
    await checkStorage();
    return result;
  }, [checkStorage]);

  /**
   * Obtient des recommandations d'optimisation
   */
  const getRecommendations = useCallback(async (): Promise<string[]> => {
    return await storageManager.getOptimizationRecommendations();
  }, []);

  /**
   * Formate les octets en format lisible
   */
  const formatBytes = useCallback((bytes: number): string => {
    return storageManager.formatBytes(bytes);
  }, []);

  // Vérification initiale
  useEffect(() => {
    if (enabled) {
      checkStorage();
    }
  }, [enabled, checkStorage]);

  // Monitoring périodique
  useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(() => {
      checkStorage();
    }, monitorInterval);

    return () => clearInterval(intervalId);
  }, [enabled, monitorInterval, checkStorage]);

  return {
    storageInfo,
    storageWarning,
    isLoading,
    checkStorage,
    canLoadModel,
    clearCaches,
    requestPersistence,
    getRecommendations,
    formatBytes,
  };
}
