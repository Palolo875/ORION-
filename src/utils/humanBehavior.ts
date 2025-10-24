/**
 * Module de Comportement Humain Amélioré pour ORION
 * 
 * Ce module permet à l'IA de se comporter de manière plus naturelle et humaine
 * tout en conservant uniquement les avantages humains et en réduisant les erreurs.
 * 
 * Fonctionnalités :
 * - Pensée visible avec hésitations naturelles
 * - Reconnaissance d'incertitude et d'ignorance
 * - Auto-correction et reformulation
 * - Demandes de clarification
 * - Score de confiance pour chaque réponse
 * - Validation anti-hallucination
 */

export interface HumanBehaviorConfig {
  enableThinking: boolean;          // Afficher la pensée/réflexion
  enableUncertainty: boolean;       // Reconnaître l'incertitude
  enableSelfCorrection: boolean;    // Auto-correction visible
  enableClarification: boolean;     // Demander des clarifications
  confidenceThreshold: number;      // Seuil de confiance (0-1)
  enableEmotionalTone: boolean;     // Ajouter un ton émotionnel approprié
}

export interface ConfidenceScore {
  score: number;                    // 0-1
  reasoning: string;                // Pourquoi ce score
  factors: {
    factualBasis: number;           // Basé sur des faits (0-1)
    logicalConsistency: number;     // Cohérence logique (0-1)
    domainExpertise: number;        // Expertise dans le domaine (0-1)
    uncertaintyLevel: number;       // Niveau d'incertitude (0-1, bas = mieux)
  };
}

export interface HumanResponse {
  thinking?: string;                // Pensée visible (optionnel)
  response: string;                 // Réponse finale
  confidence: ConfidenceScore;      // Score de confiance
  clarificationNeeded?: string;     // Question de clarification si nécessaire
  corrections?: string[];           // Auto-corrections effectuées
  sources?: string[];               // Sources/références si disponibles
}

/**
 * Configuration par défaut
 */
export const DEFAULT_HUMAN_BEHAVIOR: HumanBehaviorConfig = {
  enableThinking: true,
  enableUncertainty: true,
  enableSelfCorrection: true,
  enableClarification: true,
  confidenceThreshold: 0.7,
  enableEmotionalTone: false, // Désactivé par défaut pour rester professionnel
};

/**
 * Phrases de pensée naturelle
 */
const THINKING_PHRASES = [
  "Laissez-moi réfléchir à cela...",
  "Hmm, c'est une question intéressante...",
  "Voyons voir...",
  "Permettez-moi d'analyser cela...",
  "D'un côté... mais d'un autre côté...",
  "Si je réfléchis bien...",
  "Attendez, je dois considérer...",
];

/**
 * Phrases d'incertitude
 */
const UNCERTAINTY_PHRASES = [
  "Je ne suis pas entièrement certain, mais",
  "D'après ce que je comprends",
  "Il me semble que",
  "Je pense que",
  "Si ma compréhension est correcte",
  "Autant que je sache",
  "Je crois que",
];

/**
 * Phrases de clarification
 */
const CLARIFICATION_PHRASES = [
  "Pouvez-vous préciser ce que vous entendez par",
  "J'aimerais clarifier :",
  "Pour mieux vous aider, pourriez-vous me dire",
  "Je veux m'assurer de bien comprendre :",
  "Avant de répondre, confirmez-moi si",
];

/**
 * Phrases d'auto-correction
 */
const CORRECTION_PHRASES = [
  "Attendez, laissez-moi reformuler cela...",
  "En y repensant, ce serait plus précis de dire que",
  "Correction : en fait,",
  "Pour être plus exact,",
  "Je me rends compte que je devrais nuancer :",
];

/**
 * Phrases d'admission d'ignorance (avantage humain !)
 */
const ADMISSION_PHRASES = [
  "Je ne suis pas sûr de connaître tous les détails sur ce sujet.",
  "C'est en dehors de mon domaine d'expertise immédiat.",
  "Je préfère admettre que je ne suis pas certain plutôt que de risquer une erreur.",
  "Je n'ai pas assez d'informations pour répondre avec confiance.",
  "Plutôt que de spéculer, je préfère dire que je ne sais pas.",
];

/**
 * Détecte si une question nécessite une clarification
 */
export function needsClarification(query: string): { needed: boolean; reason?: string } {
  const ambiguousPronouns = /\b(ça|cela|celui-ci|celui-là|il|elle|ceci)\b/gi;
  const vagueTerm = /\b(chose|truc|machin|quelque chose|quelqu'un)\b/gi;
  const multipleQuestions = (query.match(/\?/g) || []).length > 2;
  const tooShort = query.split(/\s+/).length < 3;
  const tooVague = /comment faire|c'est quoi|explique$/i.test(query);
  
  if (ambiguousPronouns.test(query)) {
    return { 
      needed: true, 
      reason: "Votre question contient des pronoms ambigus. À quoi faites-vous référence exactement ?" 
    };
  }
  
  if (vagueTerm.test(query)) {
    return { 
      needed: true, 
      reason: "Pouvez-vous être plus spécifique sur ce dont vous parlez ?" 
    };
  }
  
  if (multipleQuestions) {
    return { 
      needed: true, 
      reason: "Vous posez plusieurs questions. Par laquelle souhaitez-vous que je commence ?" 
    };
  }
  
  if (tooShort && tooVague) {
    return { 
      needed: true, 
      reason: "Votre question est assez courte. Pourriez-vous donner un peu plus de contexte ?" 
    };
  }
  
  return { needed: false };
}

/**
 * Calcule un score de confiance pour une réponse
 */
export function calculateConfidence(
  response: string,
  query: string,
  context?: { hasMemory: boolean; agentConsensus?: number }
): ConfidenceScore {
  let factualBasis = 0.5; // Par défaut, neutre
  let logicalConsistency = 0.8; // Par défaut, assez cohérent
  let domainExpertise = 0.7; // Par défaut, compétent
  let uncertaintyLevel = 0.3; // Par défaut, assez certain
  
  // Analyse du contenu de la réponse
  const responseText = response.toLowerCase();
  
  // Factual basis : a-t-on des références, chiffres, faits ?
  const hasNumbers = /\d+/.test(response);
  const hasReferences = /selon|d'après|source|étude|recherche/i.test(response);
  const hasMemory = context?.hasMemory || false;
  
  if (hasNumbers) factualBasis += 0.1;
  if (hasReferences) factualBasis += 0.2;
  if (hasMemory) factualBasis += 0.2;
  factualBasis = Math.min(factualBasis, 1);
  
  // Logical consistency : la réponse est-elle cohérente ?
  const hasContradiction = /(mais|cependant|toutefois).*\b(mais|cependant|toutefois)\b/i.test(response);
  const hasStructure = /(premièrement|deuxièmement|enfin|donc|ainsi|par conséquent)/i.test(response);
  
  if (hasContradiction) logicalConsistency -= 0.2;
  if (hasStructure) logicalConsistency += 0.1;
  logicalConsistency = Math.max(0, Math.min(logicalConsistency, 1));
  
  // Uncertainty level : détecte-t-on de l'incertitude dans la réponse ?
  const uncertaintyMarkers = [
    /je pense que/i,
    /il me semble/i,
    /probablement/i,
    /peut-être/i,
    /je ne suis pas sûr/i,
    /je crois/i,
  ];
  
  const uncertaintyCount = uncertaintyMarkers.filter(marker => marker.test(responseText)).length;
  uncertaintyLevel = Math.min(0.3 + (uncertaintyCount * 0.15), 1);
  
  // Domain expertise : basé sur le consensus entre agents si disponible
  if (context?.agentConsensus !== undefined) {
    domainExpertise = context.agentConsensus;
  }
  
  // Score final (moyenne pondérée)
  const score = (
    factualBasis * 0.3 +
    logicalConsistency * 0.3 +
    domainExpertise * 0.2 +
    (1 - uncertaintyLevel) * 0.2
  );
  
  // Reasoning
  let reasoning = "Score basé sur : ";
  const factors: string[] = [];
  
  if (factualBasis > 0.7) factors.push("bonnes bases factuelles");
  else if (factualBasis < 0.5) factors.push("bases factuelles limitées");
  
  if (logicalConsistency > 0.8) factors.push("cohérence logique forte");
  else if (logicalConsistency < 0.6) factors.push("cohérence à améliorer");
  
  if (uncertaintyLevel > 0.5) factors.push("niveau d'incertitude élevé");
  else if (uncertaintyLevel < 0.3) factors.push("réponse assez certaine");
  
  reasoning += factors.join(", ");
  
  return {
    score: Math.round(score * 100) / 100,
    reasoning,
    factors: {
      factualBasis,
      logicalConsistency,
      domainExpertise,
      uncertaintyLevel,
    }
  };
}

/**
 * Détecte les hallucinations potentielles dans une réponse
 */
export function detectPotentialHallucination(response: string): {
  likely: boolean;
  warnings: string[];
  confidence: number;
} {
  const warnings: string[] = [];
  let hallucinationScore = 0;
  
  // 1. Dates ou faits historiques suspects
  const futureDates = /\b(202[6-9]|20[3-9]\d)\b/g;
  if (futureDates.test(response)) {
    warnings.push("Mention de dates futures (possible hallucination)");
    hallucinationScore += 0.3;
  }
  
  // 2. Affirmations très spécifiques sans source
  const specificClaims = /exactement \d+%|précisément \d+ personnes|prouvé à 100%/i;
  if (specificClaims.test(response)) {
    warnings.push("Affirmations très spécifiques sans source");
    hallucinationScore += 0.2;
  }
  
  // 3. Contradictions internes
  const hasYesAndNo = /\b(oui|vrai|correct)\b.*\b(non|faux|incorrect)\b/is.test(response);
  if (hasYesAndNo) {
    warnings.push("Contradiction potentielle détectée");
    hallucinationScore += 0.3;
  }
  
  // 4. Noms propres inventés (heuristique simple)
  const suspiciousNames = /Dr\.\s+[A-Z][a-z]+\s+[A-Z][a-z]+(?![\s\S]{0,50}(université|institute|laboratoire))/g;
  const nameMatches = response.match(suspiciousNames);
  if (nameMatches && nameMatches.length > 2) {
    warnings.push("Plusieurs noms propres sans contexte (possible invention)");
    hallucinationScore += 0.2;
  }
  
  // 5. Langage trop confiant sans justification
  const overconfidentLanguage = /(absolument certain|sans aucun doute|c'est un fait établi|la science prouve)/i;
  const hasConfidentWithoutSource = overconfidentLanguage.test(response) && 
                                     !/source|selon|d'après|étude/i.test(response);
  if (hasConfidentWithoutSource) {
    warnings.push("Langage très confiant sans source ou justification");
    hallucinationScore += 0.15;
  }
  
  hallucinationScore = Math.min(hallucinationScore, 1);
  
  return {
    likely: hallucinationScore > 0.4,
    warnings,
    confidence: 1 - hallucinationScore,
  };
}

/**
 * Enrichit une réponse avec un comportement humain naturel
 */
export function enrichWithHumanBehavior(
  response: string,
  query: string,
  config: HumanBehaviorConfig = DEFAULT_HUMAN_BEHAVIOR,
  context?: { hasMemory: boolean; agentConsensus?: number }
): HumanResponse {
  const result: HumanResponse = {
    response: response,
    confidence: calculateConfidence(response, query, context),
  };
  
  // 1. Vérifier les hallucinations
  const hallucinationCheck = detectPotentialHallucination(response);
  if (hallucinationCheck.likely && hallucinationCheck.warnings.length > 0) {
    // Ajouter un disclaimer
    result.response = `⚠️ Note : ${hallucinationCheck.warnings[0]}\n\n${response}`;
    result.confidence.score = Math.min(result.confidence.score, 0.5);
  }
  
  // 2. Ajouter de la pensée visible si activé et score de confiance < 0.8
  if (config.enableThinking && result.confidence.score < 0.8) {
    const thinkingPhrase = THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)];
    result.thinking = thinkingPhrase;
  }
  
  // 3. Ajouter de l'incertitude si approprié
  if (config.enableUncertainty && result.confidence.score < config.confidenceThreshold) {
    const uncertaintyPhrase = UNCERTAINTY_PHRASES[Math.floor(Math.random() * UNCERTAINTY_PHRASES.length)];
    result.response = `${uncertaintyPhrase}, ${response}`;
  }
  
  // 4. Vérifier si clarification nécessaire
  if (config.enableClarification) {
    const clarification = needsClarification(query);
    if (clarification.needed) {
      result.clarificationNeeded = clarification.reason;
    }
  }
  
  // 5. Si confiance très basse, admettre l'ignorance (comportement humain positif)
  if (result.confidence.score < 0.4) {
    const admissionPhrase = ADMISSION_PHRASES[Math.floor(Math.random() * ADMISSION_PHRASES.length)];
    result.response = `${admissionPhrase}\n\n${response}\n\n⚠️ Prenez cette réponse avec précaution et vérifiez les informations importantes.`;
  }
  
  return result;
}

/**
 * Valide la cohérence entre plusieurs réponses d'agents
 */
export function validateAgentConsensus(
  responses: Array<{ agent: string; response: string }>
): {
  consensus: number;  // 0-1
  contradictions: string[];
  recommendations: string[];
} {
  const contradictions: string[] = [];
  const recommendations: string[] = [];
  
  if (responses.length < 2) {
    return { consensus: 1, contradictions, recommendations };
  }
  
  // Analyse simple : compter les mots-clés communs
  const allWords = responses.flatMap(r => 
    r.response.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 4) // Mots significatifs
  );
  
  const wordFrequency = new Map<string, number>();
  allWords.forEach(word => {
    wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
  });
  
  // Mots qui apparaissent dans au moins 2 réponses = consensus
  const commonWords = Array.from(wordFrequency.entries())
    .filter(([, count]) => count >= 2)
    .map(([word]) => word);
  
  const consensusRatio = commonWords.length / Math.max(wordFrequency.size, 1);
  
  // Détecter contradictions (oui vs non)
  const hasYes = responses.some(r => /\b(oui|vrai|correct|exact)\b/i.test(r.response));
  const hasNo = responses.some(r => /\b(non|faux|incorrect|inexact)\b/i.test(r.response));
  
  if (hasYes && hasNo) {
    contradictions.push("Désaccord détecté entre les agents sur la validité de certaines affirmations");
  }
  
  // Recommandations
  if (consensusRatio < 0.3) {
    recommendations.push("Faible consensus entre agents - considérez demander plus de détails à l'utilisateur");
  }
  
  if (contradictions.length > 0) {
    recommendations.push("Résolution de contradictions nécessaire dans la synthèse finale");
  }
  
  return {
    consensus: consensusRatio,
    contradictions,
    recommendations,
  };
}

/**
 * Génère un prompt enrichi avec comportements humains
 */
export function generateHumanAwarePrompt(
  basePrompt: string,
  config: HumanBehaviorConfig = DEFAULT_HUMAN_BEHAVIOR
): string {
  let enrichedPrompt = basePrompt;
  
  // Ajouter les instructions de comportement humain
  enrichedPrompt += `\n\n--- COMPORTEMENT ATTENDU ---
Tu dois te comporter de manière naturelle et humaine, avec les avantages suivants :

1. HONNÊTETÉ : Si tu n'es pas sûr, admets-le. C'est une force, pas une faiblesse.
   - Utilise des phrases comme "Je ne suis pas entièrement certain" ou "D'après ma compréhension"
   - N'invente JAMAIS de faits, dates, ou noms

2. PENSÉE VISIBLE : ${config.enableThinking ? "Montre ta réflexion brièvement avant de répondre" : "Réponds directement"}

3. AUTO-CORRECTION : ${config.enableSelfCorrection ? "Si tu réalises une imprécision, corrige-toi" : "Sois précis dès le début"}

4. CLARIFICATION : ${config.enableClarification ? "Si la question est ambiguë, demande des précisions" : "Interprète au mieux"}

5. CONFIANCE CALIBRÉE : Ajuste ton niveau de certitude à la solidité de tes arguments
   - Faits vérifiables → haute confiance
   - Raisonnements logiques → confiance moyenne
   - Spéculations → basse confiance (à éviter sauf demandé)

6. ANTI-HALLUCINATION :
   - Ne cite PAS de sources que tu ne connais pas réellement
   - N'invente PAS de statistiques précises
   - Évite les affirmations catégoriques sur des sujets incertains
   - Si tu dois deviner, dis-le explicitement

Ton objectif : Être aussi utile qu'un humain expert, mais SANS les biais et erreurs humaines.`;

  return enrichedPrompt;
}
