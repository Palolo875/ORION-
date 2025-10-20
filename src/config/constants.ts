// src/config/constants.ts

/**
 * Constantes globales pour ORION
 * Centralise tous les magic numbers et valeurs configurables
 */

// === MÉMOIRE ET EMBEDDINGS ===
export const MEMORY_CONFIG = {
  BUDGET: 5000, // Nombre maximum de souvenirs
  TOOL_RESULT_TTL: 24 * 60 * 60 * 1000, // 24 heures en ms
  EMBEDDING_MODEL: 'Xenova/all-MiniLM-L6-v2',
  EMBEDDING_MODEL_VERSION: 'Xenova/all-MiniLM-L6-v2@1.0',
  SIMILARITY_THRESHOLD: 0.6, // Seuil de similarité pour la recherche
  MAX_SEARCH_RESULTS: 2,
  RECENT_MEMORY_COUNT: 10,
} as const;

// === CONTEXT MANAGER ===
export const CONTEXT_CONFIG = {
  MAX_TOKENS: 3000, // Laisser de l'espace pour la réponse
  TOKENS_PER_MESSAGE_ESTIMATE: 100, // Estimation moyenne
  RECENT_MESSAGE_COUNT: 4, // 4 messages = 2 échanges
  IMPORTANT_MESSAGE_LIMIT: 3,
  MAX_SUMMARY_KEY_POINTS: 5,
  MAX_TEXT_LENGTH_FOR_SUMMARY: 100,
} as const;

// === GENIUS HOUR ===
export const GENIUS_HOUR_CONFIG = {
  ANALYSIS_INTERVAL: 30000, // 30 secondes
  INITIAL_DELAY: 5000, // 5 secondes
  MIN_SIMILARITY_FOR_PATTERN: 0.7, // Similarité minimale pour détecter un pattern
  MAX_ALTERNATIVE_PROMPTS: 3, // Nombre max de prompts alternatifs à générer
} as const;

// === TOOL USER ===
export const TOOL_CONFIG = {
  TIMEOUT: 5000, // Timeout pour l'exécution d'un outil (ms)
  MAX_RETRIES: 2,
} as const;

// === HNSW INDEX ===
export const HNSW_CONFIG = {
  M: 16, // Nombre de connexions par nœud
  EF_CONSTRUCTION: 200, // Taille de la liste dynamique pendant la construction
  EF_SEARCH: 100, // Taille de la liste dynamique pendant la recherche
} as const;

// === PERFORMANCE ===
export const PERFORMANCE_CONFIG = {
  MODEL_CACHE_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 jours
  WORKER_INIT_TIMEOUT: 30000, // 30 secondes
  EMBEDDING_BATCH_SIZE: 10, // Nombre d'embeddings à traiter en parallèle
} as const;

// === ACCESSIBILITÉ ===
export const A11Y_CONFIG = {
  MIN_CONTRAST_RATIO: 4.5, // WCAG AA standard
  KEYBOARD_NAV_ENABLED: true,
  SCREEN_READER_ENABLED: true,
} as const;

// === UI ===
export const UI_CONFIG = {
  TYPING_SPEED_MS: 20, // Vitesse de l'effet de frappe
  MESSAGE_FADE_DURATION: 300, // Durée de l'animation de fade
  TOAST_DURATION: 3000, // Durée d'affichage des toasts
} as const;

// === STOCKAGE ===
export const STORAGE_CONFIG = {
  WARNING_THRESHOLD: 0.75, // Alerte à 75% d'utilisation
  CRITICAL_THRESHOLD: 0.9, // Critique à 90% d'utilisation
  MODEL_SIZE_SMALL: 500 * 1024 * 1024, // 500 MB
  MODEL_SIZE_MEDIUM: 2 * 1024 * 1024 * 1024, // 2 GB
  MODEL_SIZE_LARGE: 5 * 1024 * 1024 * 1024, // 5 GB
  MONITOR_INTERVAL: 60000, // Vérifier le stockage toutes les minutes
  AUTO_CLEAR_CACHE_ON_CRITICAL: false, // Ne pas vider automatiquement
} as const;
