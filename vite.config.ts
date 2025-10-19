import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Headers de sécurité pour le développement
    headers: {
      // Content Security Policy stricte
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'wasm-unsafe-eval'", // Nécessaire pour WebAssembly
        "style-src 'self' 'unsafe-inline'", // Tailwind nécessite inline styles
        "img-src 'self' data: blob:", // Data URIs pour images uploadées
        "font-src 'self' data:",
        "connect-src 'self' https://huggingface.co https://*.huggingface.co", // API modèles
        "worker-src 'self' blob:", // Web Workers
        "frame-src 'none'", // Pas d'iframes
        "object-src 'none'", // Pas d'objets Flash/Java
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests"
      ].join('; '),
      // Autres headers de sécurité
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    }
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
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
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
          ],
          'ml-libs': ['@mlc-ai/web-llm', '@xenova/transformers'],
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
