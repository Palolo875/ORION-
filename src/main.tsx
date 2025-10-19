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

createRoot(document.getElementById("root")!).render(<App />);
