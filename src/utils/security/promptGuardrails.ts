/**
 * Guardrails pour la défense contre l'injection de prompt
 * Protection contre les manipulations malveillantes des agents IA
 */

import { logger } from '../logger';

export interface GuardrailResult {
  isSafe: boolean;
  sanitized: string;
  threats: string[];
  confidence: number;
  action: 'allow' | 'sanitize' | 'block';
}

/**
 * Patterns d'injection de prompt connus
 */
const INJECTION_PATTERNS = [
  // Tentatives de réinitialisation des instructions
  {
    pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|directives?)/i,
    threat: 'Tentative de réinitialisation des instructions',
    severity: 'high'
  },
  {
    pattern: /forget\s+(everything|all|what)\s+(you|we)\s+(said|discussed|talked)/i,
    threat: 'Tentative d\'effacement du contexte',
    severity: 'high'
  },
  {
    pattern: /disregard\s+(all\s+)?(previous|prior)\s+(instructions?|commands?)/i,
    threat: 'Tentative de désactivation des instructions',
    severity: 'high'
  },
  
  // Tentatives d'extraction d'informations système
  {
    pattern: /(tell|show|display|reveal)\s+me\s+(your|the)\s+(system|original|initial)\s+(prompt|instructions?)/i,
    threat: 'Tentative d\'extraction du prompt système',
    severity: 'critical'
  },
  {
    pattern: /what\s+(are|were)\s+(your|the)\s+(original|initial|system)\s+(instructions?|prompts?)/i,
    threat: 'Tentative d\'extraction des instructions',
    severity: 'critical'
  },
  
  // Tentatives de changement de rôle
  {
    pattern: /(you\s+are\s+now|now\s+you\s+are|from\s+now\s+on|pretend\s+to\s+be)\s+(a|an)\s+\w+/i,
    threat: 'Tentative de changement de rôle',
    severity: 'high'
  },
  {
    pattern: /act\s+as\s+(if|a|an)\s+\w+/i,
    threat: 'Tentative de simulation de rôle',
    severity: 'high' // Élevé à high pour bloquer ces tentatives
  },
  
  // Tentatives de bypass de sécurité
  {
    pattern: /bypass\s+(security|safety|filter|protection)/i,
    threat: 'Tentative de contournement de sécurité',
    severity: 'critical'
  },
  {
    pattern: /disable\s+(safety|security|protection|filter)/i,
    threat: 'Tentative de désactivation de protection',
    severity: 'critical'
  },
  
  // Encodage suspect
  {
    pattern: /\\x[0-9a-f]{2}/i,
    threat: 'Encodage hexadécimal suspect',
    severity: 'medium'
  },
  {
    pattern: /&#\d+;/,
    threat: 'Entités HTML suspectes',
    severity: 'low'
  },
  
  // Commandes système
  {
    pattern: /(sudo|rm\s+-rf|exec|eval|system|shell|bash|cmd)/i,
    threat: 'Commandes système détectées',
    severity: 'high'
  },
  
  // Injection de code
  {
    pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/i,
    threat: 'Balise script détectée',
    severity: 'high'
  },
  {
    pattern: /javascript:/i,
    threat: 'Protocole JavaScript détecté',
    severity: 'high'
  },
  
  // Tentatives de manipulation émotionnelle de l'IA
  {
    pattern: /(grandma|grandmother)\s+(trick|exploit|vulnerability)/i,
    threat: 'Tentative d\'exploitation émotionnelle',
    severity: 'medium'
  },
  {
    pattern: /this\s+is\s+(urgent|critical|emergency|life-threatening)/i,
    threat: 'Tentative de manipulation par urgence',
    severity: 'low'
  },
  
  // Meta-instructions suspectes
  {
    pattern: /\[SYSTEM\]|\[ADMIN\]|\[ROOT\]|\[SUDO\]/i,
    threat: 'Marqueurs système suspects',
    severity: 'high'
  },
  {
    pattern: /<<<|>>>|{{{|}}}|\[\[\[|\]\]\]/,
    threat: 'Délimiteurs de prompt suspects',
    severity: 'medium'
  }
];

/**
 * Contextes suspects qui augmentent le score de risque
 * Ces patterns sont traités avec une sévérité élevée car ils indiquent souvent une tentative de jailbreak
 */
const SUSPICIOUS_CONTEXTS = [
  { keyword: 'override', severity: 'high' },
  { keyword: 'jailbreak', severity: 'critical' },
  { keyword: 'DAN', severity: 'critical' }, // "Do Anything Now"
  { keyword: 'unrestricted', severity: 'high' },
  { keyword: 'no limits', severity: 'high' },
  { keyword: 'no restrictions', severity: 'high' },
  { keyword: 'without filters', severity: 'high' },
  { keyword: 'bypass mode', severity: 'critical' }
];

/**
 * Analyse un prompt pour détecter les tentatives d'injection
 */
export function analyzePrompt(prompt: string): GuardrailResult {
  const threats: string[] = [];
  let severityScore = 0;
  let sanitized = prompt;

  // 1. Détection de patterns malveillants
  for (const { pattern, threat, severity } of INJECTION_PATTERNS) {
    if (pattern.test(prompt)) {
      threats.push(threat);
      
      // Calculer le score de sévérité
      switch (severity) {
        case 'critical':
          severityScore += 100;
          break;
        case 'high':
          severityScore += 50;
          break;
        case 'medium':
          severityScore += 25;
          break;
        case 'low':
          severityScore += 10;
          break;
      }
      
      logger.warn('PromptGuardrails', `Threat detected: ${threat}`, { 
        severity, 
        pattern: pattern.toString() 
      });
    }
  }

  // 2. Détection de contextes suspects
  const lowerPrompt = prompt.toLowerCase();
  for (const { keyword, severity } of SUSPICIOUS_CONTEXTS) {
    if (lowerPrompt.includes(keyword.toLowerCase())) {
      threats.push(`Contexte suspect: "${keyword}"`);
      
      // Appliquer le score selon la sévérité
      switch (severity) {
        case 'critical':
          severityScore += 100;
          break;
        case 'high':
          severityScore += 50;
          break;
        case 'medium':
          severityScore += 25;
          break;
        case 'low':
          severityScore += 10;
          break;
      }
    }
  }

  // 3. Détection de répétitions excessives (technique de bourrage)
  const words = prompt.split(/\s+/);
  const wordFrequency = new Map<string, number>();
  for (const word of words) {
    const count = wordFrequency.get(word) || 0;
    wordFrequency.set(word, count + 1);
  }
  
  const maxRepetition = Math.max(...Array.from(wordFrequency.values()));
  if (maxRepetition > 10 && words.length > 20) {
    threats.push('Répétitions excessives détectées (possible bourrage)');
    severityScore += 20;
  }

  // 4. Détection de longueurs anormales
  if (prompt.length > 5000) {
    threats.push('Prompt exceptionnellement long');
    severityScore += 10;
  }

  // 5. Détection de caractères non-standard (Unicode suspect)
  const suspiciousUnicode = /[\u200B-\u200D\uFEFF\u202A-\u202E]/g;
  if (suspiciousUnicode.test(prompt)) {
    threats.push('Caractères Unicode invisibles/bidirectionnels détectés');
    severityScore += 30;
    sanitized = sanitized.replace(suspiciousUnicode, '');
  }

  // 6. Calcul de la confiance et de l'action
  const confidence = Math.min(severityScore / 100, 1);
  let action: 'allow' | 'sanitize' | 'block' = 'allow';
  
  if (severityScore >= 100) {
    action = 'block';
  } else if (severityScore >= 50) {
    action = 'sanitize';
    // Sanitize agressif: supprimer les parties suspectes
    for (const { pattern } of INJECTION_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[CONTENU FILTRÉ]');
    }
  }

  const isSafe = severityScore < 50;

  // Logger les résultats
  if (!isSafe) {
    logger.warn('PromptGuardrails', 'Unsafe prompt detected', {
      severityScore,
      threatsCount: threats.length,
      action,
      confidence
    });
  }

  return {
    isSafe,
    sanitized,
    threats,
    confidence,
    action
  };
}

/**
 * Valide et nettoie un prompt avant de l'envoyer à l'IA
 */
export function guardPrompt(prompt: string, options?: {
  strictMode?: boolean;
  logOnly?: boolean;
}): GuardrailResult {
  const strictMode = options?.strictMode ?? true;
  const logOnly = options?.logOnly ?? false;

  const result = analyzePrompt(prompt);

  // En mode strict, bloquer même les menaces moyennes
  if (strictMode && result.confidence >= 0.25) {
    result.action = 'block';
    result.isSafe = false;
  }

  // En mode log-only, toujours autoriser mais logger
  if (logOnly) {
    result.action = 'allow';
    result.isSafe = true;
    
    if (result.threats.length > 0) {
      logger.info('PromptGuardrails', '[LOG-ONLY] Threats detected but allowed', {
        threats: result.threats,
        confidence: result.confidence
      });
    }
  }

  return result;
}

/**
 * Vérifie si une réponse de l'IA contient des signes d'injection réussie
 */
export function validateAIResponse(response: string): {
  isSafe: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Détection de réponses qui suggèrent une injection réussie
  const compromisedPatterns = [
    /i('m|\s+am)\s+(now|going\s+to)\s+(ignore|bypass|disable)/i,
    /my\s+(previous|original)\s+instructions\s+(were|are)/i,
    /i\s+will\s+no\s+longer\s+follow/i,
    /i('m|\s+am)\s+in\s+(DAN|unrestricted|jailbreak)\s+mode/i,
    /\[SYSTEM\]\s*:\s*/i
  ];

  for (const pattern of compromisedPatterns) {
    if (pattern.test(response)) {
      issues.push(`Réponse compromise détectée: ${pattern.toString()}`);
    }
  }

  return {
    isSafe: issues.length === 0,
    issues
  };
}

/**
 * Configuration des guardrails
 */
export interface GuardrailsConfig {
  enabled: boolean;
  strictMode: boolean;
  logOnly: boolean;
  customPatterns?: Array<{
    pattern: RegExp;
    threat: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

/**
 * Classe de gestion des guardrails
 */
export class PromptGuardrails {
  private config: GuardrailsConfig;
  private customPatterns: Array<{
    pattern: RegExp;
    threat: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> = [];

  constructor(config: Partial<GuardrailsConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      strictMode: config.strictMode ?? true,
      logOnly: config.logOnly ?? false,
      customPatterns: config.customPatterns ?? []
    };

    if (this.config.customPatterns) {
      this.customPatterns = this.config.customPatterns;
    }
  }

  /**
   * Valide un prompt avec les patterns personnalisés
   */
  validate(prompt: string): GuardrailResult {
    if (!this.config.enabled) {
      return {
        isSafe: true,
        sanitized: prompt,
        threats: [],
        confidence: 0,
        action: 'allow'
      };
    }

    // Si on a des patterns personnalisés, on les applique en plus
    const result = guardPrompt(prompt, {
      strictMode: this.config.strictMode,
      logOnly: this.config.logOnly
    });
    
    // Appliquer les patterns personnalisés
    if (this.customPatterns.length > 0) {
      let customSeverityScore = 0;
      const customThreats: string[] = [];
      
      for (const { pattern, threat, severity } of this.customPatterns) {
        if (pattern.test(prompt)) {
          customThreats.push(threat);
          
          switch (severity) {
            case 'critical':
              customSeverityScore += 100;
              break;
            case 'high':
              customSeverityScore += 50;
              break;
            case 'medium':
              customSeverityScore += 25;
              break;
            case 'low':
              customSeverityScore += 10;
              break;
          }
        }
      }
      
      // Fusionner les résultats
      if (customThreats.length > 0) {
        result.threats = [...result.threats, ...customThreats];
        const totalScore = (result.confidence * 100) + customSeverityScore;
        result.confidence = Math.min(totalScore / 100, 1);
        
        // Recalculer l'action et isSafe
        if (totalScore >= 100) {
          result.action = 'block';
          result.isSafe = false;
        } else if (totalScore >= 50) {
          result.action = 'sanitize';
          result.isSafe = false;
        }
      }
    }

    return result;
  }

  /**
   * Ajoute un pattern personnalisé
   */
  addCustomPattern(
    pattern: RegExp,
    threat: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): void {
    this.customPatterns.push({ pattern, threat, severity });
  }

  /**
   * Active/désactive les guardrails
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    logger.info('PromptGuardrails', `Guardrails ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Active/désactive le mode strict
   */
  setStrictMode(strict: boolean): void {
    this.config.strictMode = strict;
    logger.info('PromptGuardrails', `Strict mode ${strict ? 'enabled' : 'disabled'}`);
  }
}

// Export singleton par défaut
export const promptGuardrails = new PromptGuardrails();
