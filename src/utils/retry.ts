/**
 * Utilitaire de retry avec exponential backoff pour ORION
 * 
 * Permet de réessayer automatiquement les opérations critiques qui échouent
 * avec un délai croissant entre chaque tentative.
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  onRetry: () => {},
};

/**
 * Exécute une fonction avec retry automatique en cas d'échec
 * 
 * @param fn - La fonction à exécuter (peut être async)
 * @param options - Options de configuration du retry
 * @returns Le résultat de la fonction
 * @throws La dernière erreur si toutes les tentatives échouent
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === opts.maxAttempts) {
        console.error(`[Retry] All ${opts.maxAttempts} attempts failed:`, lastError);
        throw lastError;
      }

      opts.onRetry(lastError, attempt);
      console.warn(`[Retry] Attempt ${attempt} failed, retrying in ${delay}ms...`, lastError.message);
      
      await sleep(delay);
      delay = Math.min(delay * opts.backoffFactor, opts.maxDelay);
    }
  }

  throw lastError!;
}

/**
 * Helper pour attendre un certain temps
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Variante de withRetry pour des opérations spécifiques à ORION
 */
export const retryStrategies = {
  /**
   * Stratégie pour les opérations LLM (chargement de modèle, inférence)
   */
  llm: {
    maxAttempts: 2,
    initialDelay: 2000,
    maxDelay: 5000,
    backoffFactor: 1.5,
  },

  /**
   * Stratégie pour les opérations de mémoire (recherche, stockage)
   */
  memory: {
    maxAttempts: 3,
    initialDelay: 500,
    maxDelay: 2000,
    backoffFactor: 2,
  },

  /**
   * Stratégie pour les embeddings (peut être lent)
   */
  embedding: {
    maxAttempts: 2,
    initialDelay: 1000,
    maxDelay: 3000,
    backoffFactor: 2,
  },

  /**
   * Stratégie pour les opérations de storage (IndexedDB)
   */
  storage: {
    maxAttempts: 3,
    initialDelay: 300,
    maxDelay: 1000,
    backoffFactor: 2,
  },
};
