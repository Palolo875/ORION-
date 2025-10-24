/**
 * Garde-fous pour la sécurité des prompts
 * Protection contre l'injection de prompt et les tentatives de manipulation
 */

import { logger } from '../logger';

export type ThreatLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type GuardAction = 'allow' | 'sanitize' | 'block';

export interface ThreatDetection {
  type: string;
  level: ThreatLevel;
  description: string;
  pattern?: string;
}

export interface GuardrailResult {
  action: GuardAction;
  threats: ThreatDetection[];
  sanitized: string;
  confidence: number;
  isSafe: boolean;
}

export interface GuardrailOptions {
  enabled?: boolean;
  strictMode?: boolean;
  maxLength?: number;
  logOnly?: boolean;
}

/**
 * Patterns de détection d'injection de prompt
 */
const INJECTION_PATTERNS = [
  // Tentatives de contournement direct
  {
    pattern: /(ignore|disregard)\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?|commands?)/gi,
    type: 'instruction_override',
    level: 'critical' as ThreatLevel,
    description: 'Tentative d\'ignorer les instructions précédentes'
  },
  {
    pattern: /forget\s+(everything|all|your)\s+(you\s+)?(know|learned|instructions?)/gi,
    type: 'memory_manipulation',
    level: 'critical' as ThreatLevel,
    description: 'Tentative de manipulation de la mémoire du modèle'
  },
  {
    pattern: /(disregard|override|bypass)\s+(any|all|your)\s+(rules?|instructions?|guidelines?|safety)/gi,
    type: 'safety_bypass',
    level: 'critical' as ThreatLevel,
    description: 'Tentative de contournement des mesures de sécurité'
  },
  
  // Extraction de données système
  {
    pattern: /(show|reveal|display|tell\s+me)\s+(your\s+)?(system\s+)?(prompt|instructions?|rules?|configuration)/gi,
    type: 'system_prompt_extraction',
    level: 'high' as ThreatLevel,
    description: 'Tentative d\'extraction du prompt système'
  },
  {
    pattern: /what\s+(are|is)\s+your\s+(hidden|secret|internal)\s+(instructions?|prompt|rules?)/gi,
    type: 'system_prompt_extraction',
    level: 'high' as ThreatLevel,
    description: 'Tentative d\'extraction d\'instructions cachées'
  },
  
  // Escalade de privilèges
  {
    pattern: /(you\s+are\s+now|act\s+as|pretend\s+to\s+be)\s+(an?\s+)?(admin|root|developer|engineer|god|jailbreak)/gi,
    type: 'privilege_escalation',
    level: 'high' as ThreatLevel,
    description: 'Tentative d\'escalade de privilèges'
  },
  {
    pattern: /(enable|activate|unlock)\s+(developer|admin|debug|god)\s+mode/gi,
    type: 'privilege_escalation',
    level: 'high' as ThreatLevel,
    description: 'Tentative d\'activation de mode privilégié'
  },
  
  // Injection de rôle
  {
    pattern: /from\s+now\s+on,?\s+you\s+(are|will\s+be|should\s+be)/gi,
    type: 'role_injection',
    level: 'medium' as ThreatLevel,
    description: 'Tentative de redéfinition du rôle'
  },
  {
    pattern: /you\s+(must|should|need\s+to)\s+(always\s+)?(respond|answer|say|tell)/gi,
    type: 'behavior_override',
    level: 'medium' as ThreatLevel,
    description: 'Tentative de forcer un comportement spécifique'
  },
  
  // Encodage et obfuscation
  {
    pattern: /(base64|hex|rot13|unicode)\s+(encode|decode)/gi,
    type: 'encoding_obfuscation',
    level: 'medium' as ThreatLevel,
    description: 'Utilisation d\'encodage potentiellement malveillant'
  },
  {
    pattern: /\\x[0-9a-f]{2}|\\u[0-9a-f]{4}/gi,
    type: 'unicode_injection',
    level: 'low' as ThreatLevel,
    description: 'Injection de caractères Unicode suspects'
  },
  
  // Délimiteurs de prompt
  {
    pattern: /(<\|.*?\|>|\[INST\]|\[\/INST\]|<\/s>|<s>)/g,
    type: 'prompt_delimiter_injection',
    level: 'high' as ThreatLevel,
    description: 'Injection de délimiteurs de prompt'
  },
  
  // Tentatives de boucle infinie / DoS
  {
    pattern: /repeat\s+(this|that|the\s+word)\s+\d+\s+times/gi,
    type: 'resource_exhaustion',
    level: 'medium' as ThreatLevel,
    description: 'Tentative d\'épuisement des ressources'
  },
  {
    pattern: /generate\s+\d+\s+(words?|characters?|tokens?)/gi,
    type: 'resource_exhaustion',
    level: 'low' as ThreatLevel,
    description: 'Demande de génération excessive'
  },
  
  // Tokens spéciaux de contrôle
  {
    pattern: /(\n\n###|\n\nHuman:|\n\nAssistant:)/g,
    type: 'conversation_hijack',
    level: 'high' as ThreatLevel,
    description: 'Tentative de détournement de conversation'
  },
  
  // Injection HTML/Script
  {
    pattern: /<script[^>]*>.*?<\/script>/gis,
    type: 'script_injection',
    level: 'critical' as ThreatLevel,
    description: 'Tentative d\'injection de script malveillant'
  },
  {
    pattern: /<iframe[^>]*>.*?<\/iframe>/gis,
    type: 'iframe_injection',
    level: 'high' as ThreatLevel,
    description: 'Tentative d\'injection d\'iframe'
  },
  {
    pattern: /on(load|error|click|mouseover|focus)\s*=/gi,
    type: 'event_handler_injection',
    level: 'high' as ThreatLevel,
    description: 'Tentative d\'injection de gestionnaire d\'événements'
  },
];

/**
 * Mots-clés suspects additionnels
 */
const SUSPICIOUS_KEYWORDS = [
  'jailbreak',
  'dan mode', // "Do Anything Now"
  'evil mode',
  'unrestricted',
  'no rules',
  'no limits',
  'no restrictions',
  'no ethics',
  'no morals',
  'unfiltered',
];

/**
 * Classe principale des garde-fous
 */
export class PromptGuardrails {
  private enabled: boolean;
  private strictMode: boolean;
  private maxLength: number;
  private logOnly: boolean;
  private customPatterns: Array<{
    pattern: RegExp;
    type: string;
    level: ThreatLevel;
    description: string;
  }> = [];
  
  private enabledChecks = {
    injectionPatterns: true,
    suspiciousKeywords: true,
    lengthLimit: true,
    repetitionDetection: true,
    specialTokens: true,
  };
  
  constructor(options: GuardrailOptions = {}) {
    this.enabled = options.enabled ?? true;
    this.strictMode = options.strictMode ?? false;
    this.maxLength = options.maxLength ?? 10000;
    this.logOnly = options.logOnly ?? false;
  }

  /**
   * Valide un prompt utilisateur
   */
  validate(prompt: string, options?: {
    strictMode?: boolean;
    maxLength?: number;
  }): GuardrailResult {
    // Si désactivé, retourner immédiatement safe
    if (!this.enabled) {
      return {
        action: 'allow',
        threats: [],
        sanitized: prompt,
        confidence: 1.0,
        isSafe: true,
      };
    }
    
    // Si en mode log-only, tout est autorisé mais on log quand même
    if (this.logOnly) {
      const result = this.performValidation(prompt, options);
      return {
        ...result,
        action: 'allow',
        isSafe: true,
      };
    }
    
    return this.performValidation(prompt, options);
  }
  
  private performValidation(prompt: string, options?: {
    strictMode?: boolean;
    maxLength?: number;
  }): GuardrailResult {
    const strictMode = options?.strictMode ?? this.strictMode;
    const maxLength = options?.maxLength ?? this.maxLength;
    const threats: ThreatDetection[] = [];
    let sanitized = prompt;
    
    // 0. Nettoyer les caractères invisibles et suspects
    sanitized = this.sanitizeInvisibleCharacters(sanitized);

    // 1. Vérifier la longueur
    if (this.enabledChecks.lengthLimit && prompt.length >= maxLength) {
      threats.push({
        type: 'excessive_length',
        level: 'low',
        description: `Prompt trop long (${prompt.length} caractères, max ${maxLength})`,
      });
      sanitized = prompt.substring(0, maxLength);
    }

    // 2. Détecter les patterns d'injection (builtin + custom)
    if (this.enabledChecks.injectionPatterns) {
      const allPatterns = [...INJECTION_PATTERNS, ...this.customPatterns];
      for (const pattern of allPatterns) {
        const matches = prompt.match(pattern.pattern);
        if (matches) {
          threats.push({
            type: pattern.type,
            level: pattern.level,
            description: pattern.description,
            pattern: matches[0],
          });

          // Sanitizer en mode permissif
          if (!strictMode && pattern.level !== 'critical') {
            sanitized = sanitized.replace(pattern.pattern, '[REDACTED]');
          }
        }
      }
    }

    // 3. Vérifier les mots-clés suspects
    if (this.enabledChecks.suspiciousKeywords) {
      const lowerPrompt = prompt.toLowerCase();
      for (const keyword of SUSPICIOUS_KEYWORDS) {
        if (lowerPrompt.includes(keyword)) {
          threats.push({
            type: 'suspicious_keyword',
            level: 'medium',
            description: `Mot-clé suspect détecté: "${keyword}"`,
          });

          if (strictMode) {
            sanitized = sanitized.replace(new RegExp(keyword, 'gi'), '[REDACTED]');
          }
        }
      }
    }

    // 4. Détecter les répétitions excessives
    if (this.enabledChecks.repetitionDetection) {
      const repetitionThreat = this.detectRepetition(prompt);
      if (repetitionThreat) {
        threats.push(repetitionThreat);
      }
    }

    // 5. Déterminer l'action à prendre
    const action = this.determineAction(threats, strictMode);

    // 6. Calculer le score de confiance
    const confidence = this.calculateConfidence(threats);

    // 7. Logger si nécessaire
    if (threats.length > 0) {
      logger.warn('PromptGuardrails', `${threats.length} menace(s) détectée(s)`, {
        action,
        threats: threats.map(t => ({ type: t.type, level: t.level })),
        confidence,
      });
    }

    const isSafe = threats.length === 0 || action === 'allow';
    
    return {
      action,
      threats,
      sanitized,
      confidence,
      isSafe,
    };
  }

  /**
   * Nettoie les caractères invisibles et suspects
   */
  private sanitizeInvisibleCharacters(text: string): string {
    return text
      // Zero-width characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      // Non-breaking spaces (conserver les espaces normaux)
      .replace(/\u00A0/g, ' ')
      // Direction marks
      .replace(/[\u202A-\u202E]/g, '')
      // Variation selectors
      .replace(/[\uFE00-\uFE0F]/g, '');
  }
  
  /**
   * Détecte les répétitions excessives (potentiel DoS)
   */
  private detectRepetition(prompt: string): ThreatDetection | null {
    // Détecter les mots répétés plus de 10 fois
    const words = prompt.split(/\s+/);
    const wordCount = new Map<string, number>();

    for (const word of words) {
      if (word.length > 2) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    }

    for (const [word, count] of wordCount.entries()) {
      if (count > 10) {
        return {
          type: 'excessive_repetition',
          level: 'medium',
          description: `Répétition excessive du mot "${word}" (${count} fois)`,
        };
      }
    }

    return null;
  }

  /**
   * Détermine l'action à prendre en fonction des menaces
   */
  private determineAction(threats: ThreatDetection[], strictMode: boolean): GuardAction {
    if (threats.length === 0) {
      return 'allow';
    }

    // En mode strict, bloquer dès qu'il y a une menace
    if (strictMode) {
      return 'block';
    }

    // Chercher le niveau de menace le plus élevé
    const maxLevel = Math.max(
      ...threats.map(t => this.threatLevelToNumber(t.level))
    );

    // Critical => block
    if (maxLevel >= this.threatLevelToNumber('critical')) {
      return 'block';
    }

    // High => block aussi (pour la sécurité)
    if (maxLevel >= this.threatLevelToNumber('high')) {
      return 'block';
    }

    // Medium ou Low => sanitize
    return 'sanitize';
  }

  /**
   * Convertit un niveau de menace en nombre pour comparaison
   */
  private threatLevelToNumber(level: ThreatLevel): number {
    const levels: Record<ThreatLevel, number> = {
      none: 0,
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };
    return levels[level] || 0;
  }

  /**
   * Calcule un score de confiance (0-1)
   */
  private calculateConfidence(threats: ThreatDetection[]): number {
    if (threats.length === 0) return 1.0;

    // Plus il y a de menaces, moins on est confiant
    const threatPenalty = Math.min(threats.length * 0.1, 0.5);

    // Les menaces critiques réduisent beaucoup la confiance
    const criticalCount = threats.filter(t => t.level === 'critical').length;
    const criticalPenalty = criticalCount * 0.3;

    return Math.max(0, 1.0 - threatPenalty - criticalPenalty);
  }

  /**
   * Active/désactive une vérification spécifique
   */
  setCheckEnabled(check: keyof typeof this.enabledChecks, enabled: boolean): void {
    this.enabledChecks[check] = enabled;
    logger.info('PromptGuardrails', `Check "${check}" ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Obtient l'état des vérifications
   */
  getEnabledChecks(): Record<string, boolean> {
    return { ...this.enabledChecks };
  }
  
  /**
   * Ajoute un pattern custom de détection
   */
  addCustomPattern(pattern: RegExp, description: string, level: ThreatLevel): void {
    this.customPatterns.push({
      pattern,
      type: 'custom_pattern',
      level,
      description,
    });
    logger.info('PromptGuardrails', `Custom pattern ajouté: ${description} (${level})`);
  }
  
  /**
   * Active ou désactive complètement les guardrails
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    logger.info('PromptGuardrails', `Guardrails ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Vérifie si les guardrails sont activés
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton
export const promptGuardrails = new PromptGuardrails();

/**
 * Fonction helper pour analyser un prompt (utilise le singleton)
 */
export function analyzePrompt(prompt: string): GuardrailResult {
  return promptGuardrails.validate(prompt);
}

/**
 * Fonction helper pour protéger un prompt avec options
 * Par défaut, utilise le mode strict
 */
export function guardPrompt(prompt: string, options?: GuardrailOptions): GuardrailResult {
  const defaultOptions: GuardrailOptions = {
    strictMode: true, // Mode strict par défaut pour guardPrompt
    ...options,
  };
  const guardrails = new PromptGuardrails(defaultOptions);
  return guardrails.validate(prompt);
}
