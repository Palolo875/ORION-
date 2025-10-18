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
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50MB pour les gros modèles
        runtimeCaching: [
          {
            // Cette règle met en cache les modèles de Web-LLM
            urlPattern: ({ url }) => url.href.startsWith('https://huggingface.co/mlc-ai'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'web-llm-cache',
              expiration: { 
                maxEntries: 5, 
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 jours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            },
          },
          {
            // Cette règle met en cache les modèles de Transformers.js
            urlPattern: ({ url }) => url.href.startsWith('https://huggingface.co/Xenova'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'transformers-cache',
              expiration: { 
                maxEntries: 5, 
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 jours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            },
          },
        ],
      },
      manifest: {
        name: 'ORION - IA Personnelle',
        short_name: 'ORION',
        description: 'Assistant IA personnel fonctionnant localement dans votre navigateur',
        theme_color: '#1e293b',
        icons: [
          {
            src: '/favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon'
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
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
        }
      }
    }
  }
}));
