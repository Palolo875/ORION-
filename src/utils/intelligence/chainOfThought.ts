/**
 * Chain-of-Thought Reasoning - Raisonnement étape par étape
 * 
 * Ce module aide l'IA à "réfléchir à voix haute" avant de répondre,
 * réduisant ainsi les erreurs de raisonnement
 */

import { logger } from '../logger';

export interface ReasoningStep {
  step: number;
  thought: string;
  conclusion?: string;
  confidence: number;
}

export interface ChainOfThought {
  steps: ReasoningStep[];
  finalConclusion: string;
  overallConfidence: number;
  reasoning: string; // Texte complet du raisonnement
}

/**
 * Génère un prompt de Chain-of-Thought pour améliorer le raisonnement
 */
export function generateCoTPrompt(query: string, context?: string): string {
  const cotInstructions = `
Pour répondre à cette question, procède par étapes de raisonnement :

1. COMPRENDRE : Reformule la question dans tes propres mots pour vérifier ta compréhension
2. ANALYSER : Identifie les éléments clés et les informations pertinentes
3. RAISONNER : Décompose le problème et explore les différentes pistes
4. VÉRIFIER : Identifie les hypothèses et leurs limites
5. CONCLURE : Formule une réponse claire et nuancée

📌 IMPORTANT : Montre ton raisonnement étape par étape avant de donner ta conclusion finale.
`;

  let prompt = cotInstructions;
  
  if (context) {
    prompt += `\n\nContexte disponible :\n${context}\n`;
  }
  
  prompt += `\n\nQuestion : ${query}\n\nTon raisonnement :`;
  
  return prompt;
}

/**
 * Parse une réponse avec Chain-of-Thought pour extraire les étapes
 */
export function parseCoTResponse(response: string): ChainOfThought | null {
  const steps: ReasoningStep[] = [];
  
  // Patterns pour détecter les étapes de raisonnement
  const stepPatterns = [
    /(?:Étape|Step)\s+(\d+)[\s:]+(.+?)(?=(?:Étape|Step)\s+\d+|Conclusion|$)/gis,
    /(\d+)[\s.]+(.+?)(?=\d+\.|Conclusion|$)/gs,
    /^[-*]\s+(.+?)$/gm,
  ];
  
  let matches: RegExpMatchArray | null = null;
  let patternUsed = 0;
  
  // Essayer différents patterns
  for (let i = 0; i < stepPatterns.length; i++) {
    matches = Array.from(response.matchAll(stepPatterns[i]));
    if (matches.length > 0) {
      patternUsed = i;
      break;
    }
  }
  
  if (!matches || matches.length === 0) {
    // Pas de structure claire détectée
    return null;
  }
  
  // Extraire les étapes
  matches.forEach((match, index) => {
    const stepNumber = patternUsed === 0 ? parseInt(match[1]) : index + 1;
    const thought = match[2] || match[1];
    
    steps.push({
      step: stepNumber,
      thought: thought.trim(),
      confidence: 0.7, // Confiance par défaut
    });
  });
  
  // Chercher la conclusion
  const conclusionMatch = response.match(/Conclusion[\s:]+(.+?)$/is);
  const finalConclusion = conclusionMatch 
    ? conclusionMatch[1].trim() 
    : response.split('\n').slice(-2).join('\n').trim();
  
  const overallConfidence = steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length;
  
  logger.debug('ChainOfThought', 'Parsed reasoning', {
    stepsCount: steps.length,
    overallConfidence: overallConfidence.toFixed(2),
  });
  
  return {
    steps,
    finalConclusion,
    overallConfidence,
    reasoning: response,
  };
}

/**
 * Évalue la qualité du raisonnement Chain-of-Thought
 */
export function evaluateCoTQuality(cot: ChainOfThought): {
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 100;
  
  // Vérifier le nombre d'étapes
  if (cot.steps.length < 2) {
    score -= 30;
    feedback.push('Raisonnement trop court (< 2 étapes)');
  } else if (cot.steps.length > 7) {
    score -= 10;
    feedback.push('Raisonnement peut-être trop verbeux (> 7 étapes)');
  }
  
  // Vérifier la confiance
  if (cot.overallConfidence < 0.6) {
    score -= 20;
    feedback.push('Confiance globale faible dans le raisonnement');
  }
  
  // Vérifier la cohérence des étapes
  const hasComprehension = cot.steps.some(s => 
    /comprend|reformul|question|demande/i.test(s.thought)
  );
  if (!hasComprehension) {
    score -= 15;
    feedback.push('Manque d\'étape de compréhension de la question');
  }
  
  const hasConclusion = cot.finalConclusion.length > 20;
  if (!hasConclusion) {
    score -= 15;
    feedback.push('Conclusion trop courte ou absente');
  }
  
  // Vérifier les mots-clés de qualité
  const qualityKeywords = ['parce que', 'donc', 'ainsi', 'cependant', 'toutefois', 'par conséquent'];
  const hasQualityReasoning = qualityKeywords.some(keyword => 
    cot.reasoning.toLowerCase().includes(keyword)
  );
  if (!hasQualityReasoning) {
    score -= 10;
    feedback.push('Manque de connecteurs logiques (donc, parce que, etc.)');
  }
  
  if (feedback.length === 0) {
    feedback.push('Raisonnement de bonne qualité');
  }
  
  return {
    score: Math.max(0, score),
    feedback,
  };
}

/**
 * Améliore un raisonnement en ajoutant des étapes manquantes
 */
export function enhanceReasoning(query: string, reasoning: string): string {
  const cot = parseCoTResponse(reasoning);
  
  if (!cot) {
    // Si pas de structure CoT détectée, l'ajouter
    return `📝 Laisse-moi réfléchir étape par étape :

Étape 1 - Compréhension : ${query}

${reasoning}

Conclusion : Voir ci-dessus.`;
  }
  
  const quality = evaluateCoTQuality(cot);
  
  if (quality.score >= 80) {
    return reasoning; // Déjà bon
  }
  
  // Ajouter des améliorations
  let enhanced = reasoning;
  
  // Ajouter une intro si manquante
  if (!reasoning.match(/^(?:Laisse|Voyons|Réfléchissons)/i)) {
    enhanced = `📝 Laisse-moi analyser cette question étape par étape :\n\n${enhanced}`;
  }
  
  // Ajouter une conclusion si manquante
  if (cot.finalConclusion.length < 20) {
    enhanced += `\n\n**Conclusion** : [À compléter avec une synthèse claire]`;
  }
  
  return enhanced;
}

/**
 * Classe principale pour le raisonnement Chain-of-Thought
 */
export class ChainOfThoughtEngine {
  private minSteps: number;
  private maxSteps: number;
  
  constructor(options: { minSteps?: number; maxSteps?: number } = {}) {
    this.minSteps = options.minSteps ?? 2;
    this.maxSteps = options.maxSteps ?? 7;
  }
  
  /**
   * Génère un prompt optimisé pour le CoT
   */
  generatePrompt(query: string, context?: string): string {
    return generateCoTPrompt(query, context);
  }
  
  /**
   * Parse et valide une réponse CoT
   */
  parse(response: string): ChainOfThought | null {
    return parseCoTResponse(response);
  }
  
  /**
   * Évalue la qualité du raisonnement
   */
  evaluate(response: string): {
    score: number;
    feedback: string[];
    cot: ChainOfThought | null;
  } {
    const cot = this.parse(response);
    
    if (!cot) {
      return {
        score: 40,
        feedback: ['Aucune structure de raisonnement détectée'],
        cot: null,
      };
    }
    
    const quality = evaluateCoTQuality(cot);
    
    return {
      ...quality,
      cot,
    };
  }
  
  /**
   * Améliore un raisonnement existant
   */
  enhance(query: string, reasoning: string): string {
    return enhanceReasoning(query, reasoning);
  }
}

// Export singleton
export const cotEngine = new ChainOfThoughtEngine();
