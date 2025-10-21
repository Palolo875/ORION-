/**
 * Types pour le système de Contexte Ambiant d'ORION
 * 
 * Le contexte ambiant permet de définir des informations persistantes
 * qui enrichissent automatiquement toutes les requêtes de l'utilisateur.
 */

export interface AmbientContext {
  id: string;
  content: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  title?: string; // Titre optionnel pour faciliter l'identification
}

export const AMBIENT_CONTEXT_CONSTRAINTS = {
  MIN_LENGTH: 10,
  MAX_LENGTH: 500,
  MAX_CONTEXTS: 3,
  MAX_ACTIVE_CONTEXTS: 3,
} as const;

export interface AmbientContextValidationError {
  field: 'content' | 'general';
  message: string;
}

export interface AmbientContextServiceResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
