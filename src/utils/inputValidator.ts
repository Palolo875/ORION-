/**
 * Validation des inputs utilisateur pour ORION
 * Protection contre les injections et attaques
 */

import { detectMaliciousContent, sanitizeContent } from './sanitizer';
import { logger } from './logger';

export interface ValidationResult {
  isValid: boolean;
  sanitized: string;
  warnings: string[];
  blocked: boolean;
}

/**
 * Limites de sécurité
 */
const SECURITY_LIMITS = {
  MAX_INPUT_LENGTH: 50000, // 50k caractères (suffisant pour conversations longues)
  MAX_MESSAGE_LENGTH: 10000, // 10k pour un message unique
  MAX_LINE_LENGTH: 1000, // Pour détecter les tentatives d'overflow
  MAX_URL_LENGTH: 2048,
  MIN_INPUT_LENGTH: 0,
};

/**
 * Valider et sanitizer l'input utilisateur
 */
export function validateUserInput(
  input: string,
  options?: {
    maxLength?: number;
    allowHtml?: boolean;
    context?: string;
  }
): ValidationResult {
  const warnings: string[] = [];
  let sanitized = input;
  let blocked = false;

  const maxLength = options?.maxLength || SECURITY_LIMITS.MAX_MESSAGE_LENGTH;
  const context = options?.context || 'UserInput';

  // 1. Vérification de base
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      sanitized: '',
      warnings: ['Input invalide ou vide'],
      blocked: false
    };
  }

  // 2. Limite de taille (évite les attaques par buffer overflow)
  if (input.length > maxLength) {
    sanitized = input.substring(0, maxLength);
    warnings.push(`Message tronqué à ${maxLength} caractères`);
    logger.warn(context, 'Input trop long détecté', { 
      originalLength: input.length,
      maxLength 
    });
  }

  // 3. Détection de lignes extrêmement longues (potentiellement malveillant)
  const lines = sanitized.split('\n');
  const hasLongLines = lines.some(line => line.length > SECURITY_LIMITS.MAX_LINE_LENGTH);
  if (hasLongLines) {
    warnings.push('Lignes excessivement longues détectées');
    logger.warn(context, 'Lignes longues suspectes', {
      maxLineLength: Math.max(...lines.map(l => l.length))
    });
  }

  // 4. Détection de patterns malveillants
  const malicious = detectMaliciousContent(sanitized);
  if (malicious.isSuspicious) {
    warnings.push(...malicious.reasons);
    logger.warn(context, 'Contenu malveillant détecté', { 
      reasons: malicious.reasons 
    });

    // Si HTML n'est pas autorisé, bloquer complètement
    if (!options?.allowHtml) {
      // Strip tout le HTML si suspect
      sanitized = sanitizeContent(sanitized, { stripAll: true });
      blocked = true;
    }
  }

  // 5. Normalisation Unicode (évite les homoglyphes et caractères invisibles)
  try {
    sanitized = sanitized.normalize('NFKC');
  } catch (error) {
    logger.error(context, 'Erreur normalisation Unicode', error);
    warnings.push('Caractères non valides détectés');
  }

  // 6. Suppression des caractères de contrôle invisibles (sauf \n, \r, \t)
  // eslint-disable-next-line no-control-regex
  const controlCharsRemoved = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '');
  if (controlCharsRemoved.length !== sanitized.length) {
    warnings.push('Caractères de contrôle invisibles supprimés');
    sanitized = controlCharsRemoved;
  }

  // 7. Détection de tentatives d'encodage multiple (double encoding)
  if (/%25[0-9A-F]{2}/i.test(sanitized)) {
    warnings.push('Double encodage détecté');
    logger.warn(context, 'Tentative de double encodage');
  }

  // 8. Sanitization finale si HTML autorisé
  if (options?.allowHtml && !blocked) {
    sanitized = sanitizeContent(sanitized);
  }

  return {
    isValid: warnings.length === 0 && !blocked,
    sanitized,
    warnings,
    blocked
  };
}

/**
 * Valider une URL
 */
export function validateUrl(url: string): ValidationResult {
  const warnings: string[] = [];
  let sanitized = url.trim();
  let blocked = false;

  // Vérifier la longueur
  if (sanitized.length > SECURITY_LIMITS.MAX_URL_LENGTH) {
    warnings.push('URL trop longue');
    blocked = true;
  }

  // Vérifier le protocole
  const protocolMatch = sanitized.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (protocolMatch) {
    const protocol = protocolMatch[1].toLowerCase();
    const allowedProtocols = ['http', 'https', 'mailto'];
    
    if (!allowedProtocols.includes(protocol)) {
      warnings.push(`Protocole non autorisé: ${protocol}`);
      blocked = true;
    }
  } else if (!sanitized.startsWith('#') && !sanitized.startsWith('/')) {
    warnings.push('URL invalide (protocole manquant)');
    blocked = true;
  }

  // Détecter les caractères dangereux dans l'URL
  if (/[<>"'`]/.test(sanitized)) {
    warnings.push('Caractères dangereux dans l\'URL');
    sanitized = sanitized.replace(/[<>"'`]/g, '');
  }

  return {
    isValid: warnings.length === 0 && !blocked,
    sanitized: blocked ? '#' : sanitized,
    warnings,
    blocked
  };
}

/**
 * Valider un nom de fichier uploadé
 */
export function validateFileName(filename: string): ValidationResult {
  const warnings: string[] = [];
  let sanitized = filename.trim();
  let blocked = false;

  // Vérifier l'extension
  const dangerousExtensions = [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', 
    '.jar', '.app', '.deb', '.rpm', '.dmg', '.pkg'
  ];

  const ext = sanitized.substring(sanitized.lastIndexOf('.')).toLowerCase();
  if (dangerousExtensions.includes(ext)) {
    warnings.push(`Extension de fichier dangereuse: ${ext}`);
    blocked = true;
  }

  // Supprimer les chemins relatifs
  if (sanitized.includes('..') || sanitized.includes('./')) {
    warnings.push('Tentative de traversée de répertoire détectée');
    sanitized = sanitized.replace(/\.\.\//g, '').replace(/\.\//g, '');
  }

  // Nettoyer les caractères spéciaux
  sanitized = sanitized
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"|?*\x00-\x1F]/g, '_')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .substring(0, 255);

  return {
    isValid: warnings.length === 0 && !blocked,
    sanitized,
    warnings,
    blocked
  };
}

/**
 * Valider du JSON input
 */
export function validateJsonInput(input: string): ValidationResult & { parsed?: unknown } {
  const warnings: string[] = [];
  let parsed: unknown;

  try {
    // Limiter la taille
    if (input.length > SECURITY_LIMITS.MAX_INPUT_LENGTH) {
      return {
        isValid: false,
        sanitized: '',
        warnings: ['JSON trop volumineux'],
        blocked: true
      };
    }

    parsed = JSON.parse(input);

    // Vérifier la profondeur (évite les attaques par stack overflow)
    const depth = getJsonDepth(parsed);
    if (depth > 20) {
      warnings.push('JSON trop profond');
      return {
        isValid: false,
        sanitized: input,
        warnings,
        blocked: true
      };
    }

  } catch (error) {
    return {
      isValid: false,
      sanitized: input,
      warnings: ['JSON invalide'],
      blocked: true
    };
  }

  return {
    isValid: true,
    sanitized: input,
    warnings,
    blocked: false,
    parsed
  };
}

/**
 * Calculer la profondeur d'un objet JSON
 */
function getJsonDepth(obj: unknown, currentDepth = 0): number {
  if (obj === null || typeof obj !== 'object') {
    return currentDepth;
  }

  const values = Array.isArray(obj) ? obj : Object.values(obj);
  if (values.length === 0) {
    return currentDepth;
  }

  return Math.max(...values.map(value => getJsonDepth(value, currentDepth + 1)));
}

/**
 * Valider un code/script (pour future fonctionnalité de code execution)
 */
export function validateCode(code: string, language: string): ValidationResult {
  const warnings: string[] = [];
  let blocked = false;

  // Pour l'instant, bloquer toute exécution de code
  // À implémenter avec un sandbox sécurisé si nécessaire
  warnings.push('Exécution de code désactivée pour des raisons de sécurité');
  blocked = true;

  return {
    isValid: false,
    sanitized: code,
    warnings,
    blocked
  };
}

/**
 * Rate limiting simple (côté client)
 */
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  check(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Nettoyer les anciennes tentatives
    const recentAttempts = attempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      logger.warn('RateLimiter', 'Limite de requêtes dépassée', { key, attempts: recentAttempts.length });
      return false;
    }

    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

export const rateLimiter = new RateLimiter();
