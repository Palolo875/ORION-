/**
 * Système de logging centralisé pour ORION
 * 
 * Gère les erreurs de manière centralisée et fournit des messages
 * utilisateur conviviaux tout en conservant les détails techniques
 * pour le débogage.
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ErrorLog {
  id: string;
  timestamp: number;
  severity: ErrorSeverity;
  component: string;
  technicalMessage: string;
  userMessage: string;
  stack?: string;
  context?: Record<string, unknown>;
}

class ErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 100;
  private listeners: Array<(log: ErrorLog) => void> = [];

  /**
   * Log une erreur avec un message technique et un message utilisateur
   */
  log(
    severity: ErrorSeverity,
    component: string,
    technicalMessage: string,
    userMessage: string,
    error?: Error,
    context?: Record<string, unknown>
  ): ErrorLog {
    const log: ErrorLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      severity,
      component,
      technicalMessage,
      userMessage,
      stack: error?.stack,
      context,
    };

    this.logs.push(log);
    
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const consoleMethod = this.getConsoleMethod(severity);
    consoleMethod(`[${component}] ${technicalMessage}`, context || '');
    
    this.notifyListeners(log);
    
    return log;
  }

  /**
   * Log une erreur critique (système ne peut pas continuer)
   */
  critical(component: string, technicalMessage: string, userMessage: string, error?: Error, context?: Record<string, unknown>): ErrorLog {
    return this.log('critical', component, technicalMessage, userMessage, error, context);
  }

  /**
   * Log une erreur (opération a échoué mais système continue)
   */
  error(component: string, technicalMessage: string, userMessage: string, error?: Error, context?: Record<string, unknown>): ErrorLog {
    return this.log('error', component, technicalMessage, userMessage, error, context);
  }

  /**
   * Log un avertissement (potentiel problème)
   */
  warning(component: string, technicalMessage: string, userMessage: string, context?: Record<string, unknown>): ErrorLog {
    return this.log('warning', component, technicalMessage, userMessage, undefined, context);
  }

  /**
   * Log une information
   */
  info(component: string, technicalMessage: string, userMessage: string, context?: Record<string, unknown>): ErrorLog {
    return this.log('info', component, technicalMessage, userMessage, undefined, context);
  }

  /**
   * Récupère tous les logs
   */
  getLogs(severity?: ErrorSeverity): ErrorLog[] {
    if (severity) {
      return this.logs.filter(log => log.severity === severity);
    }
    return [...this.logs];
  }

  /**
   * Récupère les derniers logs
   */
  getRecentLogs(count: number = 10): ErrorLog[] {
    return this.logs.slice(-count);
  }

  /**
   * Récupère les logs par composant
   */
  getLogsByComponent(component: string): ErrorLog[] {
    return this.logs.filter(log => log.component === component);
  }

  /**
   * Efface tous les logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * S'abonne aux nouveaux logs
   */
  subscribe(listener: (log: ErrorLog) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(log: ErrorLog): void {
    this.listeners.forEach(listener => {
      try {
        listener(log);
      } catch (error) {
        console.error('[ErrorLogger] Listener error:', error);
      }
    });
  }

  private getConsoleMethod(severity: ErrorSeverity): Console['log'] | Console['warn'] | Console['error'] {
    switch (severity) {
      case 'critical':
      case 'error':
        return console.error.bind(console);
      case 'warning':
        return console.warn.bind(console);
      default:
        return console.log.bind(console);
    }
  }

  /**
   * Exporte les logs pour analyse
   */
  export(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const errorLogger = new ErrorLogger();

/**
 * Messages d'erreur conviviaux pour l'utilisateur
 */
export const UserMessages = {
  LLM_LOAD_FAILED: "Le modèle IA n'a pas pu être chargé. Vérifiez votre connexion internet et réessayez.",
  LLM_INFERENCE_FAILED: "Une erreur est survenue lors de la génération de la réponse. Veuillez réessayer.",
  MEMORY_SEARCH_FAILED: "La recherche dans la mémoire a échoué. L'IA va répondre sans contexte historique.",
  MEMORY_STORE_FAILED: "Impossible de sauvegarder cette conversation dans la mémoire.",
  EMBEDDING_FAILED: "Erreur lors de la création des embeddings. La recherche sémantique ne sera pas disponible.",
  STORAGE_FAILED: "Impossible d'accéder au stockage local. Vos données pourraient ne pas être sauvegardées.",
  WEBGPU_NOT_AVAILABLE: "WebGPU n'est pas disponible sur cet appareil. Les performances pourraient être réduites.",
  WORKER_FAILED: "Un composant système a rencontré une erreur. ORION va tenter de continuer.",
  WORKER_ERROR: "Une erreur est survenue dans un composant système. L'application va continuer de fonctionner.",
  WORKER_INIT_FAILED: "Impossible d'initialiser un composant système. Veuillez rafraîchir la page.",
  WORKER_NOT_READY: "Le système n'est pas encore prêt. Veuillez attendre quelques instants.",
  NETWORK_ERROR: "Erreur de connexion. Certaines fonctionnalités pourraient ne pas être disponibles.",
  GENERIC_ERROR: "Une erreur est survenue. Veuillez réessayer.",
  UNKNOWN_ERROR: "Une erreur inattendue est survenue. Veuillez réessayer.",
};
