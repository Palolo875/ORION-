/**
 * Système de Métriques de Qualité du Débat Multi-Agents
 * 
 * Évalue la qualité d'un débat entre les agents sur plusieurs dimensions :
 * - Cohérence : Similarité sémantique entre agents
 * - Couverture : Nombre de concepts uniques abordés
 * - Nouveauté : Originalité des idées (surtout Agent Créatif)
 * - Rigueur : Structure logique (surtout Agent Logique)
 * - Équilibre : Aucun agent ne domine (>70%)
 */

export interface DebateQuality {
  coherence: number;      // 0-1 : Cohérence entre agents
  coverage: number;       // 0-1 : Couverture du sujet
  novelty: number;        // 0-1 : Originalité (Créatif)
  rigor: number;          // 0-1 : Rigueur (Logique)
  balance: number;        // 0-1 : Équilibre final
  overallScore: number;   // Moyenne pondérée
  details?: {
    coherenceDetails?: string;
    coverageCount?: number;
    noveltyIndicators?: string[];
    rigorIndicators?: string[];
    balanceRatios?: Record<string, number>;
  };
}

export interface Debate {
  logical: string;
  creative: string;
  critical: string;
  synthesis?: string;
}

export interface SingleResponse {
  response: string;
  query: string;
}

/**
 * Calcule la cohérence entre les réponses des agents
 * Basé sur les mots-clés communs et la similarité de contenu
 */
function calculateCoherence(debate: Debate): number {
  const responses = [debate.logical, debate.creative, debate.critical].filter(r => r && r.length > 0);
  
  if (responses.length < 2) return 0;
  
  // Extraire les mots-clés de chaque réponse (simple : mots de plus de 4 lettres)
  const extractKeywords = (text: string): Set<string> => {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 4);
    return new Set(words);
  };
  
  const keywordSets = responses.map(extractKeywords);
  
  // Calculer l'intersection entre tous les sets
  const intersection = keywordSets.reduce((acc, set) => {
    return new Set([...acc].filter(x => set.has(x)));
  });
  
  // Calculer l'union
  const union = keywordSets.reduce((acc, set) => {
    return new Set([...acc, ...set]);
  });
  
  // Coefficient de Jaccard : intersection / union
  const coherence = union.size > 0 ? intersection.size / union.size : 0;
  
  // Normaliser : on considère qu'une cohérence de 0.2+ est bonne
  return Math.min(coherence / 0.2, 1);
}

/**
 * Calcule la couverture du sujet
 * Basé sur le nombre de concepts uniques abordés
 */
function calculateCoverage(debate: Debate): number {
  const allText = [debate.logical, debate.creative, debate.critical]
    .filter(r => r && r.length > 0)
    .join(' ');
  
  // Extraire les concepts (mots significatifs)
  const concepts = new Set(
    allText.toLowerCase()
      .replace(/[^\w\sàâäéèêëïîôùûüÿæœç]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 5) // Mots de 6+ lettres = concepts
  );
  
  // Normaliser : on considère que 20+ concepts = bonne couverture
  const coverage = Math.min(concepts.size / 20, 1);
  
  return coverage;
}

/**
 * Détecte la nouveauté dans la réponse créative
 * Recherche d'indicateurs d'originalité : métaphores, questions "Et si...", analogies
 */
function detectNovelty(creativeResponse: string): number {
  if (!creativeResponse || creativeResponse.length === 0) return 0;
  
  const text = creativeResponse.toLowerCase();
  
  let noveltyScore = 0;
  const indicators: string[] = [];
  
  // Indicateur 1 : Métaphores/Analogies (mots comme "comme", "tel que", "ressemble à")
  const metaphorPatterns = [
    /comme un[e]?/g,
    /tel[le]? qu[e']?/g,
    /ressemble à/g,
    /à l'image de/g,
    /pareil à/g,
  ];
  
  metaphorPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      noveltyScore += 0.2;
      indicators.push(`Métaphore/Analogie détectée (${matches.length}x)`);
    }
  });
  
  // Indicateur 2 : Questions contre-intuitives ("Et si...", "Pourquoi pas...", "Imagine...")
  const counterIntuitivePatterns = [
    /et si/g,
    /pourquoi pas/g,
    /imagine[rz]?/g,
    /supposons que/g,
  ];
  
  counterIntuitivePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      noveltyScore += 0.3;
      indicators.push(`Question contre-intuitive (${matches.length}x)`);
    }
  });
  
  // Indicateur 3 : Connexions surprenantes (mots de liaison : "connexion", "lien", "paradoxe")
  if (text.includes('connexion') || text.includes('lien') || text.includes('paradoxe')) {
    noveltyScore += 0.2;
    indicators.push('Connexion conceptuelle détectée');
  }
  
  // Indicateur 4 : Remise en question d'hypothèses ("hypothèse cachée", "présupposé", "assumption")
  if (text.includes('hypothèse') || text.includes('présupposé') || text.includes('assumption')) {
    noveltyScore += 0.2;
    indicators.push('Challenge d\'hypothèse détecté');
  }
  
  // Indicateur 5 : Vocabulaire créatif (longueur moyenne des mots > 7 lettres)
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
  if (avgWordLength > 7) {
    noveltyScore += 0.1;
    indicators.push(`Vocabulaire riche (moyenne: ${avgWordLength.toFixed(1)} lettres)`);
  }
  
  return Math.min(noveltyScore, 1);
}

/**
 * Valide la rigueur de la réponse logique
 * Recherche d'indicateurs de structure : numérotation, étapes, faits
 */
function validateRigor(logicalResponse: string): number {
  if (!logicalResponse || logicalResponse.length === 0) return 0;
  
  const text = logicalResponse;
  
  let rigorScore = 0;
  
  // Indicateur 1 : Numérotation (1., 2., 3., etc.)
  const numberingPattern = /\d+\./g;
  const numberings = text.match(numberingPattern);
  if (numberings && numberings.length >= 3) {
    rigorScore += 0.3;
  }
  
  // Indicateur 2 : Mots de structure ("premièrement", "ensuite", "enfin", "donc", "ainsi")
  const structureWords = ['premièrement', 'deuxièmement', 'ensuite', 'puis', 'enfin', 'donc', 'ainsi', 'par conséquent'];
  const structureCount = structureWords.filter(word => text.toLowerCase().includes(word)).length;
  if (structureCount >= 2) {
    rigorScore += 0.2;
  }
  
  // Indicateur 3 : Identification d'hypothèses ("hypothèse", "prémisse", "suppose que")
  if (text.toLowerCase().includes('hypothèse') || text.toLowerCase().includes('prémisse') || text.toLowerCase().includes('suppose')) {
    rigorScore += 0.2;
  }
  
  // Indicateur 4 : Causalité ("car", "parce que", "en raison de", "cause", "effet")
  const causalityWords = ['car', 'parce que', 'en raison de', 'cause', 'effet', 'conséquence'];
  const causalityCount = causalityWords.filter(word => text.toLowerCase().includes(word)).length;
  if (causalityCount >= 1) {
    rigorScore += 0.2;
  }
  
  // Indicateur 5 : Concision (longueur appropriée : 50-200 mots)
  const wordCount = text.split(/\s+/).length;
  if (wordCount >= 50 && wordCount <= 200) {
    rigorScore += 0.1;
  }
  
  return Math.min(rigorScore, 1);
}

/**
 * Calcule l'équilibre entre les agents
 * Aucun agent ne devrait dominer à plus de 70%
 */
function calculateBalance(debate: Debate): number {
  const responses = [
    { name: 'logical', text: debate.logical },
    { name: 'creative', text: debate.creative },
    { name: 'critical', text: debate.critical },
  ].filter(r => r.text && r.text.length > 0);
  
  if (responses.length === 0) return 0;
  
  const totalLength = responses.reduce((sum, r) => sum + r.text.length, 0);
  
  // Calculer les ratios de longueur
  const ratios = responses.reduce((acc, r) => {
    acc[r.name] = r.text.length / totalLength;
    return acc;
  }, {} as Record<string, number>);
  
  // Trouver le ratio maximum
  const maxRatio = Math.max(...Object.values(ratios));
  
  // Si un agent domine à plus de 70%, le score diminue
  if (maxRatio > 0.7) {
    return 1 - ((maxRatio - 0.7) / 0.3); // Score décroît linéairement de 1 à 0 entre 70% et 100%
  }
  
  // Idéalement, chaque agent devrait représenter ~33% (1/3)
  const idealRatio = 1 / responses.length;
  const variance = Object.values(ratios).reduce((sum, ratio) => {
    return sum + Math.pow(ratio - idealRatio, 2);
  }, 0) / responses.length;
  
  // Plus la variance est faible, meilleur est l'équilibre
  // Variance idéale = 0, variance maximale = ~0.11 (un agent à 100%, les autres à 0)
  const balance = 1 - Math.min(variance / 0.11, 1);
  
  return balance;
}

import { logger } from './logger';

/**
 * Évalue la qualité globale d'un débat multi-agents
 */
export function evaluateDebate(debate: Debate): DebateQuality {
  logger.debug('DebateQuality', 'Évaluation du débat');
  
  // Calculer chaque métrique
  const coherence = calculateCoherence(debate);
  const coverage = calculateCoverage(debate);
  const novelty = detectNovelty(debate.creative);
  const rigor = validateRigor(debate.logical);
  const balance = calculateBalance(debate);
  
  // Calculer le score global (moyenne pondérée)
  // Poids : cohérence (20%), couverture (20%), nouveauté (20%), rigueur (20%), équilibre (20%)
  const overallScore = (coherence * 0.2 + coverage * 0.2 + novelty * 0.2 + rigor * 0.2 + balance * 0.2);
  
  const quality: DebateQuality = {
    coherence: Math.round(coherence * 100) / 100,
    coverage: Math.round(coverage * 100) / 100,
    novelty: Math.round(novelty * 100) / 100,
    rigor: Math.round(rigor * 100) / 100,
    balance: Math.round(balance * 100) / 100,
    overallScore: Math.round(overallScore * 100) / 100,
    details: {
      coverageCount: new Set(
        [debate.logical, debate.creative, debate.critical]
          .join(' ')
          .toLowerCase()
          .split(/\s+/)
          .filter(w => w.length > 5)
      ).size,
    }
  };
  
  logger.debug('DebateQuality', 'Résultats', { quality });
  
  return quality;
}

/**
 * Génère un rapport textuel de la qualité du débat
 */
export function generateQualityReport(quality: DebateQuality): string {
  const scoreToLabel = (score: number): string => {
    if (score >= 0.8) return 'Excellent ✨';
    if (score >= 0.6) return 'Bon ✓';
    if (score >= 0.4) return 'Moyen ~';
    if (score >= 0.2) return 'Faible ⚠';
    return 'Très faible ✗';
  };
  
  const report = `
📊 **Qualité du Débat Multi-Agents**

Score Global : ${(quality.overallScore * 100).toFixed(0)}% - ${scoreToLabel(quality.overallScore)}

Détails :
- Cohérence : ${(quality.coherence * 100).toFixed(0)}% ${scoreToLabel(quality.coherence)}
- Couverture : ${(quality.coverage * 100).toFixed(0)}% ${scoreToLabel(quality.coverage)} (${quality.details?.coverageCount || 0} concepts)
- Nouveauté : ${(quality.novelty * 100).toFixed(0)}% ${scoreToLabel(quality.novelty)}
- Rigueur : ${(quality.rigor * 100).toFixed(0)}% ${scoreToLabel(quality.rigor)}
- Équilibre : ${(quality.balance * 100).toFixed(0)}% ${scoreToLabel(quality.balance)}
  `.trim();
  
  return report;
}

/**
 * Détermine si le débat est de qualité suffisante
 * Retourne true si overallScore >= 0.6
 */
export function isDebateQualityAcceptable(quality: DebateQuality): boolean {
  return quality.overallScore >= 0.6;
}

/**
 * Évalue la qualité d'une réponse simple (mode non-débat)
 * Adapte les métriques pour une seule réponse au lieu d'un débat
 */
export function evaluateSingleResponse(single: SingleResponse): DebateQuality {
  logger.debug('DebateQuality', 'Évaluation d\'une réponse simple');
  
  const response = single.response;
  const query = single.query;
  
  // Cohérence : mesure la cohérence avec la question
  const coherence = calculateQueryResponseCoherence(query, response);
  
  // Couverture : nombre de concepts dans la réponse
  const coverage = calculateSingleCoverage(response);
  
  // Nouveauté : détecte l'originalité dans la réponse
  const novelty = detectNovelty(response);
  
  // Rigueur : valide la structure de la réponse
  const rigor = validateRigor(response);
  
  // Équilibre : pour une réponse simple, on vérifie la longueur appropriée
  const balance = calculateResponseBalance(response, query);
  
  // Score global avec poids légèrement différents pour mode simple
  // Cohérence (25%), Couverture (20%), Nouveauté (15%), Rigueur (25%), Équilibre (15%)
  const overallScore = (coherence * 0.25 + coverage * 0.20 + novelty * 0.15 + rigor * 0.25 + balance * 0.15);
  
  const quality: DebateQuality = {
    coherence: Math.round(coherence * 100) / 100,
    coverage: Math.round(coverage * 100) / 100,
    novelty: Math.round(novelty * 100) / 100,
    rigor: Math.round(rigor * 100) / 100,
    balance: Math.round(balance * 100) / 100,
    overallScore: Math.round(overallScore * 100) / 100,
    details: {
      coverageCount: new Set(
        response
          .toLowerCase()
          .split(/\s+/)
          .filter(w => w.length > 5)
      ).size,
    }
  };
  
  logger.debug('DebateQuality', 'Résultats (réponse simple)', { quality });
  
  return quality;
}

/**
 * Calcule la cohérence entre la question et la réponse
 */
function calculateQueryResponseCoherence(query: string, response: string): number {
  // Extraire les mots-clés de la question
  const extractKeywords = (text: string): Set<string> => {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);
    return new Set(words);
  };
  
  const queryKeywords = extractKeywords(query);
  const responseKeywords = extractKeywords(response);
  
  // Intersection : mots-clés communs
  const intersection = new Set([...queryKeywords].filter(x => responseKeywords.has(x)));
  
  // La réponse devrait reprendre au moins 30% des mots-clés de la question
  const coherence = queryKeywords.size > 0 ? intersection.size / queryKeywords.size : 0;
  
  // Normaliser : 0.3+ = excellent
  return Math.min(coherence / 0.3, 1);
}

/**
 * Calcule la couverture pour une réponse simple
 */
function calculateSingleCoverage(response: string): number {
  const concepts = new Set(
    response.toLowerCase()
      .replace(/[^\w\sàâäéèêëïîôùûüÿæœç]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 5)
  );
  
  // Pour une réponse simple, 15+ concepts = bonne couverture
  const coverage = Math.min(concepts.size / 15, 1);
  
  return coverage;
}

/**
 * Calcule l'équilibre d'une réponse simple
 * Vérifie que la réponse n'est ni trop courte ni trop longue
 */
function calculateResponseBalance(response: string, query: string): number {
  const responseWordCount = response.split(/\s+/).length;
  const queryWordCount = query.split(/\s+/).length;
  
  // Longueur idéale : entre 30 et 300 mots
  if (responseWordCount < 10) return 0.3; // Trop court
  if (responseWordCount > 500) return 0.6; // Trop long
  
  // Ratio réponse/question idéal : entre 3 et 20
  const ratio = responseWordCount / queryWordCount;
  if (ratio < 2) return 0.5; // Réponse trop courte par rapport à la question
  if (ratio > 30) return 0.7; // Réponse trop longue par rapport à la question
  
  // Longueur optimale
  if (responseWordCount >= 30 && responseWordCount <= 300) {
    return 1.0;
  }
  
  // Longueur acceptable
  return 0.8;
}
