/**
 * Utilitaires de sanitization pour ORION
 * Protection contre XSS et injection
 */

import DOMPurify from 'dompurify';

/**
 * Configuration de DOMPurify avec whitelist stricte
 */
const PURIFY_CONFIG = {
  // Balises autorisées (très restrictif)
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'code', 'pre', 
    'ul', 'ol', 'li', 'blockquote', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div'
  ],
  
  // Attributs autorisés
  ALLOWED_ATTR: ['href', 'title', 'class', 'id'],
  
  // Protocoles autorisés pour les liens
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):)/i,
  
  // Interdire les data URIs
  ALLOW_DATA_ATTR: false,
  
  // Supprimer les balises non autorisées (pas juste leur contenu)
  KEEP_CONTENT: false,
  
  // Retourner une string (pas un DOM Node)
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  
  // Sécurité maximale
  SAFE_FOR_TEMPLATES: true,
  WHOLE_DOCUMENT: false,
  
  // Hooks de sécurité additionnels
  FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur']
};

/**
 * Configuration ultra-stricte (strip tout le HTML)
 */
const STRIP_ALL_CONFIG = {
  ALLOWED_TAGS: [],
  KEEP_CONTENT: true
};

/**
 * Sanitize du contenu HTML/texte
 */
export function sanitizeContent(content: string, options?: {
  allowMarkdown?: boolean;
  stripAll?: boolean;
}): string {
  if (!content) return '';
  
  // Mode ultra-sécurisé : strip tout le HTML
  if (options?.stripAll) {
    return DOMPurify.sanitize(content, STRIP_ALL_CONFIG);
  }
  
  // Mode Markdown (pour les réponses de l'IA)
  // ReactMarkdown gère déjà la conversion, on sanitize juste le HTML final
  if (options?.allowMarkdown) {
    return DOMPurify.sanitize(content, PURIFY_CONFIG);
  }
  
  // Mode par défaut : sanitize avec config stricte
  return DOMPurify.sanitize(content, PURIFY_CONFIG);
}

/**
 * Sanitize spécifique pour les URLs
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '#';
  
  // Liste noire de protocoles dangereux
  const dangerousProtocols = [
    'javascript:', 'data:', 'vbscript:', 'file:', 'about:'
  ];
  
  const normalized = url.trim().toLowerCase();
  
  // Bloquer les protocoles dangereux
  if (dangerousProtocols.some(proto => normalized.startsWith(proto))) {
    return '#'; // URL sûre par défaut
  }
  
  // Accepter seulement HTTP(S) et mailto
  if (!/^(https?:|mailto:|#)/i.test(normalized)) {
    return '#';
  }
  
  return url;
}

/**
 * Détection de contenu potentiellement malveillant
 */
export function detectMaliciousContent(content: string): {
  isSuspicious: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  
  if (!content) {
    return { isSuspicious: false, reasons };
  }
  
  // Patterns suspects
  const suspiciousPatterns = [
    { pattern: /<script/i, reason: 'Balise script détectée' },
    { pattern: /javascript:/i, reason: 'Protocole javascript: détecté' },
    { pattern: /on\w+\s*=/i, reason: 'Event handler inline détecté' },
    { pattern: /<iframe/i, reason: 'Iframe détecté' },
    { pattern: /data:text\/html/i, reason: 'Data URI HTML détecté' },
    { pattern: /eval\(/i, reason: 'Fonction eval() détectée' },
    { pattern: /document\.cookie/i, reason: 'Accès aux cookies détecté' },
    { pattern: /<object/i, reason: 'Balise object détectée' },
    { pattern: /<embed/i, reason: 'Balise embed détectée' },
    { pattern: /vbscript:/i, reason: 'Protocole vbscript détecté' },
  ];
  
  for (const { pattern, reason } of suspiciousPatterns) {
    if (pattern.test(content)) {
      reasons.push(reason);
    }
  }
  
  return {
    isSuspicious: reasons.length > 0,
    reasons
  };
}

/**
 * Sanitize pour attributs HTML
 */
export function sanitizeAttribute(value: string): string {
  if (!value) return '';
  
  // Supprimer les caractères dangereux
  return value
    .replace(/[<>'"]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
}

/**
 * Nettoyer le texte pour recherche/comparaison
 */
export function sanitizeForSearch(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .normalize('NFKC') // Normalisation Unicode
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Supprimer caractères de contrôle
    .trim();
}

/**
 * Valider et sanitize un nom de fichier
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'untitled';
  
  return filename
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') // Remplacer caractères invalides
    .replace(/^\.+/, '') // Supprimer points au début
    .replace(/\.+$/, '') // Supprimer points à la fin
    .substring(0, 255); // Limiter la longueur
}

/**
 * Configuration sécurisée de DOMPurify
 * Appelé au démarrage de l'application
 */
export function configureDOMPurify(): void {
  // Hook pour bloquer les tentatives d'évasion
  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    // Bloquer les tentatives d'évasion via attributs
    if (data.tagName === 'form' || data.tagName === 'input') {
      if (node && 'remove' in node && typeof node.remove === 'function') {
        node.remove();
      }
    }
  });

  // Hook pour vérifier les attributs
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    // Vérifier les URLs dans href et src
    if (data.attrName === 'href' || data.attrName === 'src') {
      const value = data.attrValue;
      if (value && !sanitizeUrl(value).startsWith('http')) {
        data.attrValue = '#'; // URL par défaut sûre
      }
    }
  });
}
