/**
 * Response Quality - Système d'auto-évaluation de la qualité des réponses
 * 
 * Ce module évalue et améliore la qualité des réponses avant de les envoyer à l'utilisateur
 */

import { logger } from '../logger';
import { factChecker, FactCheckResult } from '../reliability/factChecker';
import { cotEngine, ChainOfThought } from './chainOfThought';

export interface QualityMetrics {
  clarity: number; // 0-1 - Clarté de la réponse
  completeness: number; // 0-1 - Complétude
  accuracy: number; // 0-1 - Précision (basée sur fact-checking)
  relevance: number; // 0-1 - Pertinence par rapport à la question
  actionability: number; // 0-1 - Caractère actionnable
  overall: number; // Score global
}

export interface QualityReport {
  metrics: QualityMetrics;
  issues: string[];
  suggestions: string[];
  improved: string; // Version améliorée de la réponse
}

/**
 * Évalue la clarté d'une réponse
 */
function evaluateClarity(response: string): number {
  let score = 100;
  
  // Pénalités
  
  // Phrases trop longues
  const sentences = response.split(/[.!?]+/);
  const longSentences = sentences.filter(s => s.split(/\s+/).length > 30);
  if (longSentences.length > 0) {
    score -= longSentences.length * 5;
  }
  
  // Manque de structure
  const hasStructure = /^\d+\.|^[-*•]|^#{1,3}\s/m.test(response);
  if (!hasStructure && response.length > 200) {
    score -= 15;
  }
  
  // Jargon excessif
  const jargonWords = ['paradigme', 'synergie', 'holistique', 'disruptif', 'proactif'];
  const jargonCount = jargonWords.filter(word => 
    response.toLowerCase().includes(word)
  ).length;
  score -= jargonCount * 10;
  
  // Pas d'exemples dans une réponse longue
  const hasExamples = /(?:exemple|par exemple|comme|tel que)/i.test(response);
  if (!hasExamples && response.length > 300) {
    score -= 10;
  }
  
  return Math.max(0, score) / 100;
}

/**
 * Évalue la complétude d'une réponse
 */
function evaluateCompleteness(response: string, query: string): number {
  let score = 100;
  
  // Réponse trop courte
  if (response.length < 50) {
    score -= 40;
  } else if (response.length < 100) {
    score -= 20;
  }
  
  // Questions multiples non traitées
  const questionMarks = (query.match(/\?/g) || []).length;
  if (questionMarks > 1 && response.length < 200) {
    score -= 20;
  }
  
  // Manque de conclusion
  const hasConclusion = /conclusion|en résumé|pour résumer|en bref|finalement/i.test(response);
  if (!hasConclusion && response.length > 300) {
    score -= 10;
  }
  
  // Manque de nuances
  const hasNuances = /cependant|toutefois|néanmoins|par contre|en revanche|d'un autre côté/i.test(response);
  if (!hasNuances && response.length > 200) {
    score -= 10;
  }
  
  return Math.max(0, score) / 100;
}

/**
 * Évalue la pertinence par rapport à la question
 */
function evaluateRelevance(response: string, query: string): number {
  let score = 100;
  
  // Extraire les mots-clés de la question
  const queryWords = query
    .toLowerCase()
    .replace(/[?!.,;]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['comment', 'pourquoi', 'quoi', 'quelle', 'quel'].includes(word));
  
  // Vérifier si les mots-clés sont présents dans la réponse
  const responseLower = response.toLowerCase();
  const matchedWords = queryWords.filter(word => responseLower.includes(word));
  
  const matchRatio = queryWords.length > 0 
    ? matchedWords.length / queryWords.length 
    : 1;
  
  if (matchRatio < 0.3) {
    score -= 40; // Réponse potentiellement hors-sujet
  } else if (matchRatio < 0.5) {
    score -= 20;
  }
  
  // Réponse commence par une digression
  const startsWithDigression = /^(?:avant de|d'abord|tout d'abord|premièrement).{100,}(?:\?|mais|cependant)/i.test(response);
  if (startsWithDigression) {
    score -= 15;
  }
  
  return Math.max(0, score) / 100;
}

/**
 * Évalue le caractère actionnable d'une réponse
 */
function evaluateActionability(response: string): number {
  let score = 50; // Score de base moyen
  
  // Bonus pour les éléments actionnables
  const actionablePatterns = [
    /(?:tu peux|vous pouvez|il faut|il suffit de|étape \d+|procédure)/gi,
    /^\d+\.\s/gm, // Listes numérotées
    /^[-*•]\s/gm, // Listes à puces
    /(?:voici comment|pour cela|suivez|effectuez)/gi,
  ];
  
  let actionableCount = 0;
  for (const pattern of actionablePatterns) {
    const matches = response.match(pattern);
    if (matches) {
      actionableCount += matches.length;
    }
  }
  
  score += Math.min(actionableCount * 10, 50);
  
  // Pénalité pour le vague
  const vaguePatterns = [
    /\b(peut-être|éventuellement|il se pourrait|on pourrait imaginer)\b/gi,
  ];
  
  for (const pattern of vaguePatterns) {
    const matches = response.match(pattern);
    if (matches) {
      score -= matches.length * 5;
    }
  }
  
  return Math.max(0, Math.min(100, score)) / 100;
}

/**
 * Évalue la qualité globale d'une réponse
 */
export function evaluateQuality(response: string, query: string): QualityMetrics {
  const clarity = evaluateClarity(response);
  const completeness = evaluateCompleteness(response, query);
  const relevance = evaluateRelevance(response, query);
  const actionability = evaluateActionability(response);
  
  // Fact-checking pour la précision
  const factCheck = factChecker.check(response);
  const accuracy = factCheck.overallConfidence;
  
  // Score global pondéré
  const overall = (
    clarity * 0.25 +
    completeness * 0.2 +
    accuracy * 0.25 +
    relevance * 0.2 +
    actionability * 0.1
  );
  
  logger.debug('ResponseQuality', 'Quality evaluation', {
    clarity: clarity.toFixed(2),
    completeness: completeness.toFixed(2),
    accuracy: accuracy.toFixed(2),
    relevance: relevance.toFixed(2),
    actionability: actionability.toFixed(2),
    overall: overall.toFixed(2),
  });
  
  return {
    clarity,
    completeness,
    accuracy,
    relevance,
    actionability,
    overall,
  };
}

/**
 * Génère des suggestions d'amélioration
 */
function generateSuggestions(metrics: QualityMetrics, response: string, query: string): string[] {
  const suggestions: string[] = [];
  
  if (metrics.clarity < 0.7) {
    suggestions.push('Simplifier le langage et raccourcir les phrases');
    if (response.length > 200 && !/^\d+\.|^[-*•]/m.test(response)) {
      suggestions.push('Ajouter une structure avec des puces ou des numéros');
    }
  }
  
  if (metrics.completeness < 0.7) {
    suggestions.push('Développer davantage la réponse');
    if (response.length > 300 && !/conclusion|en résumé/i.test(response)) {
      suggestions.push('Ajouter une conclusion claire');
    }
  }
  
  if (metrics.accuracy < 0.7) {
    suggestions.push('Ajouter des nuances et des qualificateurs d\'incertitude');
    suggestions.push('Vérifier les affirmations factuelles ou ajouter des sources');
  }
  
  if (metrics.relevance < 0.7) {
    suggestions.push('S\'assurer de bien répondre à la question posée');
    suggestions.push('Réduire les digressions et aller droit au but');
  }
  
  if (metrics.actionability < 0.5 && /(comment|étapes|procédure)/i.test(query)) {
    suggestions.push('Fournir des étapes concrètes et actionnables');
    suggestions.push('Utiliser des listes numérotées pour les procédures');
  }
  
  return suggestions;
}

/**
 * Améliore automatiquement une réponse
 */
function improveResponse(response: string, metrics: QualityMetrics, query: string): string {
  let improved = response;
  
  // Amélioration 1: Ajouter une structure si manquante
  if (metrics.clarity < 0.7 && improved.length > 200 && !/^\d+\.|^[-*•]/m.test(improved)) {
    // Tenter de diviser en points
    const sentences = improved.split(/[.!]\s+/);
    if (sentences.length >= 3) {
      improved = sentences.map((s, i) => `${i + 1}. ${s.trim()}`).join('\n');
    }
  }
  
  // Amélioration 2: Ajouter des marqueurs d'incertitude si nécessaire
  if (metrics.accuracy < 0.7) {
    const factCheck = factChecker.check(improved);
    improved = factChecker.enhance(improved);
  }
  
  // Amélioration 3: Ajouter une introduction si manquante
  if (!improved.match(/^(?:Pour|Voici|Laisse|Voilà)/)) {
    improved = `Voici ma réponse :\n\n${improved}`;
  }
  
  // Amélioration 4: Ajouter une conclusion si longue réponse sans conclusion
  if (improved.length > 300 && !/conclusion|en résumé|pour résumer|en bref/i.test(improved)) {
    // Extraire la dernière phrase comme potentielle conclusion
    const lastSentence = improved.split(/[.!]/).slice(-2)[0]?.trim();
    if (lastSentence && lastSentence.length > 20) {
      improved += `\n\n**En résumé** : ${lastSentence}.`;
    }
  }
  
  return improved;
}

/**
 * Génère un rapport de qualité complet
 */
export function generateQualityReport(response: string, query: string): QualityReport {
  const metrics = evaluateQuality(response, query);
  
  const issues: string[] = [];
  if (metrics.clarity < 0.7) issues.push('Clarté insuffisante');
  if (metrics.completeness < 0.7) issues.push('Réponse incomplète');
  if (metrics.accuracy < 0.7) issues.push('Précision à améliorer');
  if (metrics.relevance < 0.7) issues.push('Pertinence questionnable');
  if (metrics.actionability < 0.5) issues.push('Manque d\'éléments actionnables');
  
  const suggestions = generateSuggestions(metrics, response, query);
  const improved = metrics.overall < 0.75 
    ? improveResponse(response, metrics, query) 
    : response;
  
  return {
    metrics,
    issues,
    suggestions,
    improved,
  };
}

/**
 * Classe principale pour l'évaluation de qualité
 */
export class ResponseQualityChecker {
  private minQualityThreshold: number;
  private autoImprove: boolean;
  
  constructor(options: { minQualityThreshold?: number; autoImprove?: boolean } = {}) {
    this.minQualityThreshold = options.minQualityThreshold ?? 0.7;
    this.autoImprove = options.autoImprove ?? true;
  }
  
  /**
   * Évalue une réponse
   */
  evaluate(response: string, query: string): QualityMetrics {
    return evaluateQuality(response, query);
  }
  
  /**
   * Génère un rapport complet
   */
  report(response: string, query: string): QualityReport {
    return generateQualityReport(response, query);
  }
  
  /**
   * Vérifie si une réponse atteint le seuil de qualité
   */
  meetsThreshold(response: string, query: string): boolean {
    const metrics = this.evaluate(response, query);
    return metrics.overall >= this.minQualityThreshold;
  }
  
  /**
   * Améliore automatiquement une réponse si nécessaire
   */
  ensureQuality(response: string, query: string): string {
    if (!this.autoImprove) {
      return response;
    }
    
    const report = this.report(response, query);
    
    if (report.metrics.overall < this.minQualityThreshold) {
      logger.info('ResponseQuality', 'Auto-improving response', {
        originalQuality: report.metrics.overall.toFixed(2),
        issues: report.issues,
      });
      return report.improved;
    }
    
    return response;
  }
}

// Export singleton
export const qualityChecker = new ResponseQualityChecker({
  minQualityThreshold: 0.7,
  autoImprove: true,
});
