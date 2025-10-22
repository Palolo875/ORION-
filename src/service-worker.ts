/**
 * Orion Service Worker - Cache Level 2
 * Gère le cache persistant des modèles ML et des assets pour une PWA complète
 * 
 * Cache Strategy:
 * - Modèles ML: CacheFirst (permanent)
 * - Assets statiques: StaleWhileRevalidate
 * - API calls: NetworkFirst
 */

/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

// Activer le claim immédiat pour contrôler tous les clients
clientsClaim();

// Précacher tous les assets générés par Vite
precacheAndRoute(self.__WB_MANIFEST);

console.log('[ServiceWorker] 🚀 Orion Service Worker chargé');

// ============================================================
// CACHE LEVEL 2A: Modèles ML (Permanent Cache)
// ============================================================

// Cache pour les modèles MLC-LLM
registerRoute(
  ({ url }) => {
    return url.hostname.includes('huggingface.co') || 
           url.pathname.includes('mlc-ai') ||
           url.pathname.includes('/models/') ||
           url.pathname.match(/\.(onnx|bin|safetensors|wasm)$/i) !== null;
  },
  new CacheFirst({
    cacheName: 'orion-ml-models-v1',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50, // Limite de 50 modèles en cache
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 an (quasi-permanent)
        purgeOnQuotaError: false, // Ne pas purger automatiquement
      }),
    ],
  })
);

console.log('[ServiceWorker] ✅ Cache ML Models configuré (CacheFirst)');

// ============================================================
// CACHE LEVEL 2B: Transformers.js Embeddings
// ============================================================

registerRoute(
  ({ url }) => {
    return url.hostname === 'cdn.jsdelivr.net' && 
           url.pathname.includes('transformers');
  },
  new CacheFirst({
    cacheName: 'orion-transformers-models-v1',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 an
      }),
    ],
  })
);

console.log('[ServiceWorker] ✅ Cache Transformers.js configuré');

// ============================================================
// CACHE LEVEL 2C: Assets Statiques (Images, Fonts, etc.)
// ============================================================

registerRoute(
  ({ request }) => 
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'orion-static-assets-v1',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 jours
      }),
    ],
  })
);

console.log('[ServiceWorker] ✅ Cache Assets configuré (StaleWhileRevalidate)');

// ============================================================
// CACHE LEVEL 2D: Scripts et Modules JS
// ============================================================

registerRoute(
  ({ request }) => request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: 'orion-scripts-v1',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 jours
      }),
    ],
  })
);

console.log('[ServiceWorker] ✅ Cache Scripts configuré');

// ============================================================
// Navigation Requests (SPA)
// ============================================================

const handler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(handler, {
  denylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
});
registerRoute(navigationRoute);

console.log('[ServiceWorker] ✅ Navigation SPA configurée');

// ============================================================
// Gestion des messages depuis l'application
// ============================================================

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    console.log('[ServiceWorker] ⏭️ Skip waiting activé');
  }
  
  if (event.data && event.data.type === 'CACHE_STATS') {
    getCacheStats().then((stats) => {
      event.ports[0].postMessage(stats);
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    const cacheName = event.data.cacheName;
    caches.delete(cacheName).then(() => {
      console.log(`[ServiceWorker] 🗑️ Cache ${cacheName} vidé`);
      event.ports[0].postMessage({ success: true });
    });
  }
});

// ============================================================
// Statistiques du cache
// ============================================================

async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats: Record<string, { size: number; entries: number }> = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    let totalSize = 0;
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
    
    stats[cacheName] = {
      entries: keys.length,
      size: totalSize,
    };
  }
  
  return stats;
}

// ============================================================
// Gestion des erreurs
// ============================================================

self.addEventListener('error', (event) => {
  console.error('[ServiceWorker] ❌ Erreur:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[ServiceWorker] ❌ Promise rejetée:', event.reason);
});

// ============================================================
// Logs d'installation et activation
// ============================================================

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] 📦 Installation en cours...');
  // Force l'attente si nécessaire
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] ✅ Activation réussie');
  // Prendre le contrôle immédiatement
  event.waitUntil(self.clients.claim());
  
  // Nettoyer les anciens caches si nécessaire
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // Supprimer les anciennes versions de cache
            return cacheName.startsWith('orion-') && !cacheName.endsWith('-v1');
          })
          .map((cacheName) => {
            console.log(`[ServiceWorker] 🗑️ Suppression ancien cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
      );
    })
  );
});

console.log('[ServiceWorker] 🎯 Service Worker Orion prêt (Cache Level 2 actif)');

export {};
