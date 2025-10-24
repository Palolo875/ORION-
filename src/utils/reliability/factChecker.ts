/**
 * Fact Checker - Système de vérification des faits
 * 
 * Ce module aide à réduire les hallucinations en :
 * 1. Détectant les affirmations factuelles
 * 2. Évaluant leur crédibilité
 * 3. Demandant des sources quand nécessaire
 */

import { logger } from '../logger';

export type ClaimType = 
  | 'factual'      // Affirmation factuelle vérifiable
  | 'opinion'      // Opinion subjective
  | 'speculation'  // Spéculation ou hypothèse
  | 'mathematical' // Calcul ou fait mathématique
  | 'code'         // Code ou logique technique
  | 'common_knowledge' // Connaissance commune
  | 'uncertain';   // Incertain

export interface Claim {
  text: string;
  type: ClaimType;
  confidence: number; // 0-1
  needsVerification: boolean;
  sources?: string[];
  reasoning?: string;
}

export interface FactCheckResult {
  claims: Claim[];
  overallConfidence: number;
  hasUncertainClaims: boolean;
  recommendedActions: string[];
}

/**
 * Détecte les affirmations factuelles dans un texte
 */
export function detectClaims(text: string): Claim[] {
  const claims: Claim[] = [];
  
  // Phrases qui indiquent des affirmations factuelles
  const factualIndicators = [
    /selon .+, /gi,
    /\d{4}/, // Années
    /\d+%/, // Pourcentages
    /\d+ (millions?|milliards?|millions?)/gi,
    /(toujours|jamais|tous|aucun|chaque)/gi,
    /(prouvé|démontré|établi|confirmé)/gi,
    /la (recherche|science|étude) (montre|prouve|démontre)/gi,
  ];
  
  // Phrases qui indiquent des opinions
  const opinionIndicators = [
    /(je pense|je crois|à mon avis|selon moi)/gi,
    /(probablement|peut-être|possiblement)/gi,
    /(meilleur|pire|préférable)/gi,
  ];
  
  // Diviser en phrases
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    
    // Ignorer les phrases trop courtes
    if (trimmed.length < 10) continue;
    
    let claimType: ClaimType = 'uncertain';
    let confidence = 0.5;
    let needsVerification = false;
    
    // Détecter le type
    if (opinionIndicators.some(pattern => pattern.test(trimmed))) {
      claimType = 'opinion';
      confidence = 0.9;
      needsVerification = false;
    } else if (/^\d+[\s]*[+\-*/=]/.test(trimmed) || /=[\s]*\d+/.test(trimmed)) {
      claimType = 'mathematical';
      confidence = 0.95;
      needsVerification = true; // Vérifier les calculs
    } else if (/```|function|const|let|var|class/.test(trimmed)) {
      claimType = 'code';
      confidence = 0.9;
      needsVerification = true;
    } else if (factualIndicators.some(pattern => pattern.test(trimmed))) {
      claimType = 'factual';
      confidence = 0.7;
      needsVerification = true;
    } else if (/(évidemment|bien sûr|clairement|naturellement)/gi.test(trimmed)) {
      claimType = 'common_knowledge';
      confidence = 0.8;
      needsVerification = false;
    }
    
    // Réduire la confiance si contient des mots d'incertitude
    if (/(peut-être|possiblement|probablement|environ)/gi.test(trimmed)) {
      confidence *= 0.7;
      claimType = 'speculation';
    }
    
    claims.push({
      text: trimmed,
      type: claimType,
      confidence,
      needsVerification,
    });
  }
  
  return claims;
}

/**
 * Vérifie les affirmations et retourne un rapport
 */
export function checkFacts(response: string): FactCheckResult {
  const claims = detectClaims(response);
  
  const uncertainClaims = claims.filter(c => 
    c.confidence < 0.7 || c.type === 'uncertain'
  );
  
  const needsVerificationClaims = claims.filter(c => c.needsVerification);
  
  // Calculer la confiance globale
  const overallConfidence = claims.length > 0
    ? claims.reduce((sum, c) => sum + c.confidence, 0) / claims.length
    : 0.5;
  
  const recommendedActions: string[] = [];
  
  if (uncertainClaims.length > 0) {
    recommendedActions.push(
      `${uncertainClaims.length} affirmation(s) incertaine(s) détectée(s). Considérer la reformulation avec plus de nuance.`
    );
  }
  
  if (needsVerificationClaims.length > 2) {
    recommendedActions.push(
      `${needsVerificationClaims.length} affirmations factuelles détectées. Recommandé: ajouter des sources ou des précisions.`
    );
  }
  
  if (overallConfidence < 0.6) {
    recommendedActions.push(
      'Confiance globale faible. Recommandé: reformuler avec plus de précautions ou demander clarification à l\'utilisateur.'
    );
  }
  
  logger.debug('FactChecker', 'Vérification terminée', {
    totalClaims: claims.length,
    uncertainClaims: uncertainClaims.length,
    overallConfidence: overallConfidence.toFixed(2),
  });
  
  return {
    claims,
    overallConfidence,
    hasUncertainClaims: uncertainClaims.length > 0,
    recommendedActions,
  };
}

/**
 * Ajoute des marqueurs d'incertitude au texte si nécessaire
 */
export function addUncertaintyMarkers(text: string, confidence: number): string {
  if (confidence >= 0.9) {
    return text;
  }
  
  if (confidence >= 0.7) {
    // Ajouter une note de prudence
    return `${text}\n\n*Note: Cette réponse est basée sur mes connaissances actuelles. Je vous encourage à vérifier les informations importantes.*`;
  }
  
  if (confidence >= 0.5) {
    return `${text}\n\n⚠️ *Attention: Ma confiance dans cette réponse est modérée (${Math.round(confidence * 100)}%). Je recommande de vérifier ces informations auprès de sources fiables.*`;
  }
  
  return `⚠️ *Je ne suis pas très confiant dans cette réponse (${Math.round(confidence * 100)}%). Voici ce que je peux dire, mais je vous recommande fortement de consulter des sources expertes.*\n\n${text}`;
}

/**
 * Reformule une réponse pour réduire les affirmations trop absolues
 */
export function softenclaims(text: string): string {
  return text
    // Adoucir les affirmations absolues
    .replace(/\b(toujours|jamais|tous|aucun|chaque)\b/gi, (match) => {
      const softer: Record<string, string> = {
        'toujours': 'généralement',
        'jamais': 'rarement',
        'tous': 'la plupart',
        'aucun': 'peu de',
        'chaque': 'de nombreux',
      };
      return softer[match.toLowerCase()] || match;
    })
    // Adoucir les certitudes
    .replace(/\b(certainement|absolument|définitivement)\b/gi, 'probablement')
    // Ajouter des nuances
    .replace(/\b(est|sont)\b/gi, (match, offset, string) => {
      // Ne pas remplacer dans les questions ou en début de phrase
      if (offset === 0 || string[offset - 1] === '?') return match;
      // 50% du temps, ajouter une nuance
      return Math.random() > 0.5 ? `${match} généralement` : match;
    });
}

/**
 * Évalue si une affirmation nécessite une source
 */
export function needsSource(claim: Claim): boolean {
  if (claim.type === 'opinion' || claim.type === 'common_knowledge') {
    return false;
  }
  
  if (claim.confidence < 0.8) {
    return true;
  }
  
  // Si contient des chiffres précis
  if (/\d{4}|\d+%|\d+\s+(millions?|milliards?)/.test(claim.text)) {
    return true;
  }
  
  return claim.needsVerification;
}

/**
 * Suggère des sources potentielles pour une affirmation
 */
export function suggestSources(claim: Claim): string[] {
  const suggestions: string[] = [];
  
  if (claim.type === 'factual') {
    suggestions.push(
      'Wikipedia pour une vue d\'ensemble',
      'Articles académiques sur Google Scholar',
      'Sites gouvernementaux ou institutionnels officiels'
    );
  }
  
  if (claim.type === 'mathematical') {
    suggestions.push(
      'Calculatrice pour vérification',
      'Wolfram Alpha pour calculs complexes'
    );
  }
  
  if (claim.type === 'code') {
    suggestions.push(
      'Documentation officielle',
      'Stack Overflow pour exemples',
      'Tests unitaires pour validation'
    );
  }
  
  return suggestions;
}

/**
 * Classe principale pour la vérification de faits
 */
export class FactChecker {
  private strictMode: boolean;
  
  constructor(options: { strictMode?: boolean } = {}) {
    this.strictMode = options.strictMode ?? false;
  }
  
  /**
   * Vérifie une réponse complète
   */
  check(response: string): FactCheckResult {
    return checkFacts(response);
  }
  
  /**
   * Améliore une réponse en ajoutant des marqueurs d'incertitude
   */
  enhance(response: string): string {
    const result = this.check(response);
    
    let enhanced = response;
    
    // En mode strict, adoucir les affirmations
    if (this.strictMode) {
      enhanced = softenclaims(enhanced);
    }
    
    // Ajouter des marqueurs d'incertitude si nécessaire
    if (result.overallConfidence < 0.9) {
      enhanced = addUncertaintyMarkers(enhanced, result.overallConfidence);
    }
    
    // Si beaucoup d'affirmations nécessitent des sources
    const claimsNeedingSources = result.claims.filter(needsSource);
    if (claimsNeedingSources.length > 2) {
      enhanced += '\n\n💡 *Conseil: Plusieurs affirmations dans cette réponse bénéficieraient de sources. N\'hésitez pas à me demander des précisions.*';
    }
    
    return enhanced;
  }
  
  /**
   * Analyse la qualité d'une réponse
   */
  analyzeQuality(response: string): {
    score: number;
    issues: string[];
    suggestions: string[];
  } {
    const result = this.check(response);
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    let score = 100;
    
    // Pénalités
    if (result.overallConfidence < 0.7) {
      score -= 20;
      issues.push('Confiance globale faible');
      suggestions.push('Reformuler avec plus de précautions');
    }
    
    if (result.hasUncertainClaims) {
      score -= 10;
      issues.push('Contient des affirmations incertaines');
      suggestions.push('Ajouter des nuances ou sources');
    }
    
    const absoluteClaims = result.claims.filter(c => 
      /\b(toujours|jamais|tous|aucun)\b/i.test(c.text)
    );
    if (absoluteClaims.length > 0) {
      score -= 15;
      issues.push('Contient des affirmations absolues');
      suggestions.push('Adoucir le langage (généralement, souvent, etc.)');
    }
    
    const claimsNeedingSources = result.claims.filter(needsSource);
    if (claimsNeedingSources.length > 3) {
      score -= 10;
      issues.push('Beaucoup d\'affirmations sans sources');
      suggestions.push('Ajouter des références ou préciser les limites');
    }
    
    return {
      score: Math.max(0, score),
      issues,
      suggestions,
    };
  }
}

// Export singleton
export const factChecker = new FactChecker({ strictMode: false });
