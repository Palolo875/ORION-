import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    // Visualizer du bundle - génère un rapport HTML dans dist/
    visualizer({
      open: mode === 'development', // Ouvrir automatiquement en dev
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/bundle-stats.html',
      template: 'treemap', // 'treemap', 'sunburst', 'network'
      sourcemap: true
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'placeholder.svg'],
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,wasm}'],
        globIgnores: ['**/node_modules/**/*'],
        maximumFileSizeToCacheInBytes: 100 * 1024 * 1024, // 100MB pour les gros modèles
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // Stratégie pour les modèles Web-LLM (Cache First avec fallback)
            urlPattern: ({ url }) => url.href.includes('huggingface.co/mlc-ai'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'orion-web-llm-models',
              expiration: { 
                maxEntries: 10, 
                maxAgeSeconds: 60 * 24 * 60 * 60, // 60 jours
                purgeOnQuotaError: true
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              matchOptions: {
                ignoreSearch: false,
                ignoreVary: true
              }
            },
          },
          {
            // Stratégie pour les modèles Transformers.js
            urlPattern: ({ url }) => url.href.includes('huggingface.co/Xenova'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'orion-transformers-models',
              expiration: { 
                maxEntries: 10, 
                maxAgeSeconds: 60 * 24 * 60 * 60, // 60 jours
                purgeOnQuotaError: true
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            },
          },
          {
            // Stratégie pour les fichiers WASM
            urlPattern: /\.wasm$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'orion-wasm-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 90 * 24 * 60 * 60, // 90 jours
              }
            },
          },
          {
            // Stratégie pour les API externes (Network First avec fallback)
            urlPattern: ({ url }: { url: URL }) => {
              // Cette fonction s'exécute dans le contexte du service worker
              return false; // Désactivé temporairement pour éviter les erreurs de build
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'orion-external-api',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 jours
              }
            },
          },
          {
            // Stratégie pour les images
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'orion-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 jours
              }
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // Désactiver en dev pour éviter les problèmes
        type: 'module',
      },
      manifest: {
        name: 'ORION - IA Personnelle Locale',
        short_name: 'ORION',
        description: 'Assistant IA personnel fonctionnant localement dans votre navigateur avec support offline complet',
        theme_color: '#1e293b',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon'
          },
          {
            src: '/placeholder.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        categories: ['productivity', 'utilities', 'education'],
        screenshots: [],
        shortcuts: [
          {
            name: 'Nouvelle Conversation',
            short_name: 'Nouveau Chat',
            description: 'Démarrer une nouvelle conversation avec ORION',
            url: '/',
            icons: []
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimisations
    minify: 'esbuild',
    target: 'esnext',
    // Augmenter la limite de taille pour les grands fichiers (workers)
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        format: 'es',
        // Code splitting agressif pour un meilleur lazy loading
        manualChunks: (id) => {
          // React et dépendances de base
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/react-router-dom')) {
            return 'router';
          }
          
          // Radix UI (séparer les gros composants)
          if (id.includes('@radix-ui')) {
            if (id.includes('dialog') || id.includes('dropdown') || id.includes('popover')) {
              return 'radix-overlay';
            }
            return 'radix-ui';
          }
          
          // UI libraries
          if (id.includes('framer-motion')) {
            return 'framer';
          }
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          
          // ML libraries (gros chunks séparés)
          if (id.includes('@mlc-ai/web-llm')) {
            return 'web-llm';
          }
          if (id.includes('@xenova/transformers')) {
            return 'transformers';
          }
          
          // Workers (séparés pour lazy loading)
          if (id.includes('/workers/')) {
            const workerName = id.split('/workers/')[1]?.split('.')[0];
            return `worker-${workerName}`;
          }
          
          // Utilitaires
          if (id.includes('/utils/')) {
            return 'utils';
          }
          
          // Composants UI
          if (id.includes('/components/ui/')) {
            return 'ui-components';
          }
          
          // Autres vendor
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // Noms de fichiers avec hash pour le cache
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      }
    },
    // Optimisation des sources maps pour le production
    sourcemap: false,
    // Réduire les warnings console en production
    reportCompressedSize: false,
  },
  worker: {
    format: 'es',
    plugins: () => [],
  }
}));
