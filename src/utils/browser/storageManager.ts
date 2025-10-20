/**
 * Gestionnaire de Stockage pour ORION
 * 
 * Surveille l'utilisation du stockage du navigateur et alerte
 * lorsque les quotas sont dépassés ou approchent des limites.
 * 
 * Caractéristiques :
 * - Vérifie les quotas de stockage (Cache API, IndexedDB, localStorage)
 * - Alerte si un modèle LLM (jusqu'à 5GB) risque de dépasser le quota
 * - Fournit des recommandations pour libérer de l'espace
 * - Compatible avec tous les navigateurs modernes
 */

import { logger } from '../logger';

export interface StorageInfo {
  usage: number;
  quota: number;
  percentage: number;
  available: number;
  isLimited: boolean;
}

export interface StorageBreakdown {
  total: StorageInfo;
  caches?: number;
  indexedDB?: number;
  localStorage?: number;
  serviceWorkerRegistrations?: number;
}

export interface StorageWarning {
  level: 'info' | 'warning' | 'critical';
  message: string;
  recommendation: string;
  canProceed: boolean;
}

/**
 * Classe de gestion du stockage navigateur
 */
export class StorageManager {
  private readonly WARNING_THRESHOLD = 0.75; // 75% d'utilisation
  private readonly CRITICAL_THRESHOLD = 0.9; // 90% d'utilisation
  private readonly MODEL_SIZE_ESTIMATES = {
    small: 500 * 1024 * 1024, // 500 MB
    medium: 2 * 1024 * 1024 * 1024, // 2 GB
    large: 5 * 1024 * 1024 * 1024, // 5 GB
  };

  /**
   * Vérifie si l'API Storage Estimate est disponible
   */
  private isStorageEstimateAvailable(): boolean {
    return 'storage' in navigator && 'estimate' in navigator.storage;
  }

  /**
   * Obtient les informations de stockage du navigateur
   */
  async getStorageInfo(): Promise<StorageInfo> {
    try {
      if (!this.isStorageEstimateAvailable()) {
        logger.warn('StorageManager', 'Storage Estimate API non disponible');
        return {
          usage: 0,
          quota: Infinity,
          percentage: 0,
          available: Infinity,
          isLimited: false,
        };
      }

      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || Infinity;
      const percentage = quota !== Infinity ? (usage / quota) * 100 : 0;
      const available = quota !== Infinity ? quota - usage : Infinity;

      return {
        usage,
        quota,
        percentage,
        available,
        isLimited: quota !== Infinity,
      };
    } catch (error) {
      logger.error('StorageManager', 'Erreur lors de la vérification du stockage', error);
      return {
        usage: 0,
        quota: Infinity,
        percentage: 0,
        available: Infinity,
        isLimited: false,
      };
    }
  }

  /**
   * Obtient une répartition détaillée du stockage
   */
  async getStorageBreakdown(): Promise<StorageBreakdown> {
    const total = await this.getStorageInfo();
    const breakdown: StorageBreakdown = { total };

    try {
      // Estimation de l'utilisation du Cache API
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        let cacheSize = 0;
        
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          // Estimation approximative : chaque entrée ~1KB minimum
          cacheSize += requests.length * 1024;
        }
        
        breakdown.caches = cacheSize;
      }

      // Estimation de localStorage
      if ('localStorage' in window) {
        let localStorageSize = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            const value = localStorage.getItem(key);
            localStorageSize += key.length + (value?.length || 0);
          }
        }
        breakdown.localStorage = localStorageSize * 2; // UTF-16 = 2 bytes par caractère
      }

      // Note: IndexedDB est plus complexe à estimer sans parcourir toutes les bases
      // On utilise la différence entre le total et les autres sources
      const estimatedOther = (breakdown.caches || 0) + (breakdown.localStorage || 0);
      breakdown.indexedDB = Math.max(0, total.usage - estimatedOther);

    } catch (error) {
      logger.error('StorageManager', 'Erreur lors du calcul de la répartition', error);
    }

    return breakdown;
  }

  /**
   * Vérifie s'il y a assez d'espace pour charger un modèle
   */
  async canLoadModel(modelSize: number): Promise<StorageWarning> {
    const info = await this.getStorageInfo();

    // Si pas de limite de quota, toujours OK
    if (!info.isLimited) {
      return {
        level: 'info',
        message: 'Stockage illimité détecté',
        recommendation: 'Vous pouvez charger ce modèle sans problème.',
        canProceed: true,
      };
    }

    // Vérifier l'espace disponible
    const spaceAfterLoad = info.available - modelSize;
    const usageAfterLoad = info.usage + modelSize;
    const percentageAfterLoad = (usageAfterLoad / info.quota) * 100;

    // Espace insuffisant
    if (spaceAfterLoad < 0) {
      return {
        level: 'critical',
        message: `Espace insuffisant : ${this.formatBytes(modelSize)} requis, ${this.formatBytes(info.available)} disponible`,
        recommendation: `Veuillez libérer au moins ${this.formatBytes(Math.abs(spaceAfterLoad))} d'espace. Essayez de vider le cache du navigateur ou de supprimer des données inutilisées.`,
        canProceed: false,
      };
    }

    // Après chargement, dépassera le seuil critique
    if (percentageAfterLoad >= this.CRITICAL_THRESHOLD * 100) {
      return {
        level: 'critical',
        message: `Le chargement utilisera ${percentageAfterLoad.toFixed(1)}% du quota (${this.formatBytes(modelSize)})`,
        recommendation: `Attention : vous approchez de la limite de stockage. Pensez à vider le cache régulièrement.`,
        canProceed: true,
      };
    }

    // Après chargement, dépassera le seuil d'avertissement
    if (percentageAfterLoad >= this.WARNING_THRESHOLD * 100) {
      return {
        level: 'warning',
        message: `Le chargement utilisera ${percentageAfterLoad.toFixed(1)}% du quota (${this.formatBytes(modelSize)})`,
        recommendation: `Vous avez encore ${this.formatBytes(spaceAfterLoad)} disponible. Tout va bien !`,
        canProceed: true,
      };
    }

    // Tout va bien
    return {
      level: 'info',
      message: `Espace suffisant : ${this.formatBytes(info.available)} disponible`,
      recommendation: `Le modèle (${this.formatBytes(modelSize)}) peut être chargé sans problème.`,
      canProceed: true,
    };
  }

  /**
   * Obtient l'état actuel du stockage avec avertissements
   */
  async getStorageStatus(): Promise<StorageWarning> {
    const info = await this.getStorageInfo();

    if (!info.isLimited) {
      return {
        level: 'info',
        message: 'Stockage illimité',
        recommendation: 'Aucune limitation de stockage détectée.',
        canProceed: true,
      };
    }

    if (info.percentage >= this.CRITICAL_THRESHOLD * 100) {
      return {
        level: 'critical',
        message: `Stockage critique : ${info.percentage.toFixed(1)}% utilisé`,
        recommendation: `Il ne reste que ${this.formatBytes(info.available)}. Veuillez libérer de l'espace en vidant le cache ou en supprimant des données.`,
        canProceed: false,
      };
    }

    if (info.percentage >= this.WARNING_THRESHOLD * 100) {
      return {
        level: 'warning',
        message: `Stockage élevé : ${info.percentage.toFixed(1)}% utilisé`,
        recommendation: `Il reste ${this.formatBytes(info.available)}. Pensez à vider le cache bientôt.`,
        canProceed: true,
      };
    }

    return {
      level: 'info',
      message: `Stockage : ${info.percentage.toFixed(1)}% utilisé`,
      recommendation: `Tout va bien ! ${this.formatBytes(info.available)} disponible.`,
      canProceed: true,
    };
  }

  /**
   * Tente de libérer de l'espace en vidant les caches
   */
  async clearCaches(): Promise<number> {
    let freedSpace = 0;

    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        
        for (const cacheName of cacheNames) {
          // Ne pas supprimer les caches essentiels du service worker
          if (!cacheName.includes('orion-essential')) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            freedSpace += requests.length * 1024; // Estimation
            await caches.delete(cacheName);
          }
        }
        
        logger.info('StorageManager', 'Caches nettoyés', { freedSpace: this.formatBytes(freedSpace) });
      }
    } catch (error) {
      logger.error('StorageManager', 'Erreur lors du nettoyage des caches', error);
    }

    return freedSpace;
  }

  /**
   * Vérifie si le navigateur persiste les données
   */
  async isPersisted(): Promise<boolean> {
    if ('storage' in navigator && 'persisted' in navigator.storage) {
      return await navigator.storage.persisted();
    }
    return false;
  }

  /**
   * Demande la permission de persister les données
   */
  async requestPersistence(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const isPersisted = await navigator.storage.persist();
        if (isPersisted) {
          logger.info('StorageManager', 'Stockage persistant activé');
        }
        return isPersisted;
      } catch (error) {
        logger.error('StorageManager', 'Erreur lors de la demande de persistance', error);
      }
    }
    return false;
  }

  /**
   * Formate les octets en format lisible
   */
  formatBytes(bytes: number): string {
    if (bytes === Infinity) return '∞';
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
  }

  /**
   * Monitore le stockage et appelle un callback si les seuils sont dépassés
   */
  async monitorStorage(
    onWarning: (warning: StorageWarning) => void,
    intervalMs: number = 60000 // 1 minute par défaut
  ): Promise<() => void> {
    const checkStorage = async () => {
      const status = await this.getStorageStatus();
      if (status.level === 'warning' || status.level === 'critical') {
        onWarning(status);
      }
    };

    // Vérification initiale
    await checkStorage();

    // Vérifications périodiques
    const intervalId = setInterval(checkStorage, intervalMs);

    // Retourner une fonction pour arrêter le monitoring
    return () => clearInterval(intervalId);
  }

  /**
   * Obtient des recommandations pour optimiser le stockage
   */
  async getOptimizationRecommendations(): Promise<string[]> {
    const breakdown = await this.getStorageBreakdown();
    const recommendations: string[] = [];

    if (breakdown.caches && breakdown.caches > 100 * 1024 * 1024) {
      recommendations.push(
        `Les caches utilisent ${this.formatBytes(breakdown.caches)}. Videz le cache pour libérer de l'espace.`
      );
    }

    if (breakdown.localStorage && breakdown.localStorage > 5 * 1024 * 1024) {
      recommendations.push(
        `Le localStorage utilise ${this.formatBytes(breakdown.localStorage)}. Supprimez les données inutilisées.`
      );
    }

    if (breakdown.indexedDB && breakdown.indexedDB > 1 * 1024 * 1024 * 1024) {
      recommendations.push(
        `IndexedDB utilise ${this.formatBytes(breakdown.indexedDB)}. Les anciens modèles peuvent être supprimés.`
      );
    }

    const isPersisted = await this.isPersisted();
    if (!isPersisted) {
      recommendations.push(
        'Le stockage n\'est pas persistant. Activez la persistance pour éviter la perte de données.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Votre utilisation du stockage est optimale ! 🎉');
    }

    return recommendations;
  }
}

// Instance singleton
export const storageManager = new StorageManager();
