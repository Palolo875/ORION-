// src/utils/serviceWorkerManager.ts

/**
 * Service Worker Manager pour ORION
 * 
 * Gère l'enregistrement et les mises à jour du service worker
 * avec notifications utilisateur et stratégies de cache avancées
 */

type UpdateSWFunction = () => Promise<void>;

type RegisterSWFunction = (options: {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
  onRegisterError?: (error: unknown) => void;
}) => UpdateSWFunction;

let registerSW: RegisterSWFunction;
try {
  // Module virtuel vite-plugin-pwa (types définis dans global.d.ts)
  registerSW = (await import('virtual:pwa-register')).registerSW;
} catch {
  registerSW = () => (async () => {});
}

export interface ServiceWorkerStatus {
  registered: boolean;
  active: boolean;
  updateAvailable: boolean;
  offlineReady: boolean;
}

class ServiceWorkerManager {
  private status: ServiceWorkerStatus = {
    registered: false,
    active: false,
    updateAvailable: false,
    offlineReady: false,
  };

  private updateCallback?: (registration: ServiceWorkerRegistration) => void;
  private listeners: Array<(status: ServiceWorkerStatus) => void> = [];

  /**
   * Initialise le service worker
   */
  async initialize(onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void) {
    this.updateCallback = onUpdateAvailable;

    try {
      // Enregistrer le service worker avec vite-plugin-pwa
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh: () => {
          console.log('[SW] Mise à jour disponible');
          this.status.updateAvailable = true;
          this.notifyListeners();
          
          // Afficher une notification à l'utilisateur
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('ORION - Mise à jour disponible', {
              body: 'Une nouvelle version d\'ORION est disponible. Rechargez pour profiter des dernières améliorations.',
              icon: '/favicon.ico',
              tag: 'orion-update',
            });
          }
        },
        onOfflineReady: () => {
          console.log('[SW] Mode hors ligne prêt');
          this.status.offlineReady = true;
          this.status.active = true;
          this.notifyListeners();
        },
        onRegistered: (registration) => {
          console.log('[SW] Service worker enregistré', registration);
          this.status.registered = true;
          this.notifyListeners();
          
          if (registration) {
            // Vérifier les mises à jour toutes les heures
            setInterval(() => {
              registration.update();
            }, 60 * 60 * 1000);
          }
        },
        onRegisterError: (error) => {
          console.error('[SW] Erreur d\'enregistrement:', error);
        },
      });

      // Exposer la fonction de mise à jour
      (window as Window & { __ORION_UPDATE_SW__?: () => Promise<void> }).__ORION_UPDATE_SW__ = updateSW;

      return true;
    } catch (error) {
      console.error('[SW] Erreur lors de l\'initialisation:', error);
      return false;
    }
  }

  /**
   * Vérifie si le service worker est supporté
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator;
  }

  /**
   * Force la mise à jour du service worker
   */
  async update() {
    if (!this.isSupported()) {
      console.warn('[SW] Service Worker non supporté');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        console.log('[SW] Vérification de mise à jour effectuée');
        return true;
      }
    } catch (error) {
      console.error('[SW] Erreur lors de la mise à jour:', error);
    }

    return false;
  }

  /**
   * Réactive le service worker (utilisé après une mise à jour)
   */
  async activate() {
    const win = window as Window & { __ORION_UPDATE_SW__?: () => Promise<void> };
    if (win.__ORION_UPDATE_SW__) {
      await win.__ORION_UPDATE_SW__();
      window.location.reload();
    }
  }

  /**
   * Désenregistre le service worker
   */
  async unregister() {
    if (!this.isSupported()) return false;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.unregister();
        console.log('[SW] Service worker désenregistré');
        this.status.registered = false;
        this.status.active = false;
        this.notifyListeners();
        return true;
      }
    } catch (error) {
      console.error('[SW] Erreur lors du désenregistrement:', error);
    }

    return false;
  }

  /**
   * Obtient le statut actuel
   */
  getStatus(): ServiceWorkerStatus {
    return { ...this.status };
  }

  /**
   * Abonne à des changements de statut
   */
  subscribe(listener: (status: ServiceWorkerStatus) => void) {
    this.listeners.push(listener);
    // Envoyer le statut actuel immédiatement
    listener(this.getStatus());
    
    // Retourner une fonction de désabonnement
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach(listener => listener(status));
  }

  /**
   * Obtient les informations de cache
   */
  async getCacheInfo(): Promise<{
    caches: Array<{ name: string; size: number }>;
    totalSize: number;
  }> {
    if (!('caches' in window)) {
      return { caches: [], totalSize: 0 };
    }

    try {
      const cacheNames = await caches.keys();
      const cacheInfos: Array<{ name: string; size: number }> = [];
      let totalSize = 0;

      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        
        let cacheSize = 0;
        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            cacheSize += blob.size;
          }
        }

        cacheInfos.push({ name, size: cacheSize });
        totalSize += cacheSize;
      }

      return { caches: cacheInfos, totalSize };
    } catch (error) {
      console.error('[SW] Erreur lors de la récupération des infos de cache:', error);
      return { caches: [], totalSize: 0 };
    }
  }

  /**
   * Nettoie le cache
   */
  async clearCache(cacheName?: string) {
    if (!('caches' in window)) return false;

    try {
      if (cacheName) {
        await caches.delete(cacheName);
        console.log(`[SW] Cache ${cacheName} supprimé`);
      } else {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[SW] Tous les caches supprimés');
      }
      return true;
    } catch (error) {
      console.error('[SW] Erreur lors du nettoyage du cache:', error);
      return false;
    }
  }

  /**
   * Précharge des ressources importantes
   */
  async precache(urls: string[]) {
    if (!('caches' in window)) return false;

    try {
      const cache = await caches.open('orion-precache');
      await cache.addAll(urls);
      console.log('[SW] Ressources pré-cachées:', urls.length);
      return true;
    } catch (error) {
      console.error('[SW] Erreur lors du pré-cache:', error);
      return false;
    }
  }

  /**
   * Vérifie si l'application est en mode offline
   */
  isOffline(): boolean {
    return !navigator.onLine;
  }

  /**
   * Écoute les changements de connectivité
   */
  onConnectivityChange(callback: (online: boolean) => void) {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Retourner une fonction de nettoyage
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
}

// Instance singleton
export const serviceWorkerManager = new ServiceWorkerManager();

// Initialisation automatique en production
if (import.meta.env.PROD) {
  serviceWorkerManager.initialize();
}
