import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { configureDOMPurify } from "./utils/security";
import { logger } from "./utils/logger";

// Configuration de sécurité au démarrage
try {
  configureDOMPurify();
  logger.info('App', 'Sécurité initialisée : DOMPurify configuré');
} catch (error) {
  logger.error('App', 'Erreur initialisation sécurité', error);
}

// Enregistrement du Service Worker (Cache Level 2)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        logger.info('App', '✅ Service Worker enregistré (Cache Level 2 actif)', {
          scope: registration.scope,
        });

        // Vérifier les mises à jour toutes les heures
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

        // Écouter les mises à jour
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                logger.info('App', '🔄 Nouvelle version disponible du Service Worker');
                // Optionnel: Notifier l'utilisateur qu'une mise à jour est disponible
              }
            });
          }
        });
      })
      .catch((error) => {
        logger.warn('App', 'Service Worker non disponible (mode dev ou erreur)', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
