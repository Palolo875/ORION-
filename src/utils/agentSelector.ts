/**
 * Système de Sélection Dynamique d'Agents
 * 
 * Sélectionne intelligemment les agents selon le contexte de la question.
 * Alternative au mode "8 agents fixes" qui cause des rendements décroissants.
 * 
 * Principe :
 * - 2 agents de base : logical + synthesizer (toujours présents)
 * - Jusqu'à 3 agents additionnels selon le contenu de la requête
 * - Maximum 5 agents pour éviter surcharge cognitive
 */

export interface AgentSelectionResult {
  agents: string[];
  reasoning: string;
  estimatedTime: string;
  complexity: 'simple' | 'moderate' | 'complex';
}

/**
 * Analyse la complexité d'une requête
 */
function assessComplexity(query: string): 'simple' | 'moderate' | 'complex' {
  const wordCount = query.split(/\s+/).length;
  const hasMultipleQuestions = (query.match(/\?/g) || []).length > 1;
  const hasComplexKeywords = /analyse|compare|explique en détail|évalue|critique|approfondi/i.test(query);
  
  if (wordCount < 15 && !hasMultipleQuestions && !hasComplexKeywords) {
    return 'simple';
  }
  
  if (wordCount > 50 || hasMultipleQuestions || hasComplexKeywords) {
    return 'complex';
  }
  
  return 'moderate';
}

/**
 * Détecte les thèmes dans une requête
 */
function detectThemes(query: string): {
  needsCreativity: boolean;
  needsCritical: boolean;
  needsEthical: boolean;
  needsPractical: boolean;
  needsHistorical: boolean;
} {
  const text = query.toLowerCase();
  
  return {
    needsCreativity: /créatif|innov|imagin|original|alternatif|et si|brain\s*storm|idée nouvelle/i.test(text),
    needsCritical: /critiqu|analys|évalue|faiblesse|risque|problème|limite|contre-argument/i.test(text),
    needsEthical: /éthique|moral|juste|équitable|responsabilité|valeur|principe/i.test(text),
    needsPractical: /pratique|comment faire|étape|mise en œuvre|implément|concrète|actionnable/i.test(text),
    needsHistorical: /histoire|historique|évolution|origine|passé|développement|chronologie/i.test(text),
  };
}

/**
 * Sélectionne dynamiquement les agents appropriés
 */
export function selectAgentsForQuery(query: string): AgentSelectionResult {
  const complexity = assessComplexity(query);
  const themes = detectThemes(query);
  
  // Agents de base (toujours présents)
  const baseAgents = ['logical', 'synthesizer'];
  const additionalAgents: string[] = [];
  const reasons: string[] = [];
  
  // Mode simple : seulement les agents de base
  if (complexity === 'simple' && Object.values(themes).every(v => !v)) {
    return {
      agents: baseAgents,
      reasoning: 'Question simple : analyse logique directe + synthèse',
      estimatedTime: '5-7s',
      complexity: 'simple'
    };
  }
  
  // Mode modéré ou complexe : ajouter des agents selon les thèmes
  
  // 1. Agent Créatif (si besoin d'innovation ou d'alternatives)
  if (themes.needsCreativity) {
    additionalAgents.push('creative');
    reasons.push('créativité requise');
  }
  
  // 2. Agent Critique (toujours utile pour validation si > 2 agents)
  if (complexity !== 'simple' || themes.needsCritical) {
    additionalAgents.push('critical');
    reasons.push('validation critique nécessaire');
  }
  
  // 3. Agent Éthique (si dimension morale)
  if (themes.needsEthical) {
    additionalAgents.push('ethical');
    reasons.push('dimension éthique détectée');
  }
  
  // 4. Agent Pratique (si besoin de steps actionnables)
  if (themes.needsPractical && !additionalAgents.includes('logical')) {
    // Pas besoin si logical est déjà là (il fait aussi du pratique)
    additionalAgents.push('practical');
    reasons.push('besoin de guidance pratique');
  }
  
  // 5. Agent Historique (si contexte temporel)
  if (themes.needsHistorical) {
    additionalAgents.push('historical');
    reasons.push('contexte historique pertinent');
  }
  
  // Limiter à 5 agents max (2 base + 3 additionnels)
  const selectedAdditional = additionalAgents.slice(0, 3);
  const allAgents = [...baseAgents.filter(a => a !== 'synthesizer'), ...selectedAdditional, 'synthesizer'];
  
  // Dédupliquer au cas où
  const finalAgents = Array.from(new Set(allAgents));
  
  // Calcul du temps estimé
  const agentCount = finalAgents.length;
  let estimatedTime = '8-10s';
  if (agentCount <= 2) estimatedTime = '5-7s';
  else if (agentCount === 3) estimatedTime = '10-12s';
  else if (agentCount === 4) estimatedTime = '14-16s';
  else estimatedTime = '18-20s';
  
  const reasoning = reasons.length > 0 
    ? `Agents sélectionnés : ${reasons.join(', ')}`
    : 'Débat équilibré avec agents essentiels';
  
  return {
    agents: finalAgents,
    reasoning,
    estimatedTime,
    complexity
  };
}

/**
 * Mode de débat suggéré selon la requête
 */
export function suggestDebateMode(query: string): 'fast' | 'balanced' | 'thorough' | 'custom' {
  const complexity = assessComplexity(query);
  const themes = detectThemes(query);
  
  // Simple → Fast
  if (complexity === 'simple' && Object.values(themes).every(v => !v)) {
    return 'fast';
  }
  
  // Complex ou multiples thèmes → Thorough
  const themeCount = Object.values(themes).filter(v => v).length;
  if (complexity === 'complex' || themeCount >= 2) {
    return 'thorough';
  }
  
  // Défaut → Balanced
  return 'balanced';
}

/**
 * Vérifie si des agents sont appropriés pour la requête
 */
export function validateAgentSelection(query: string, selectedAgents: string[]): {
  valid: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const themes = detectThemes(query);
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Vérifier si synthesizer est présent
  if (!selectedAgents.includes('synthesizer')) {
    warnings.push('Le Synthétiseur est obligatoire pour générer la réponse finale');
  }
  
  // Suggérer des agents manquants
  if (themes.needsCreativity && !selectedAgents.includes('creative')) {
    suggestions.push('Agent Créatif recommandé pour cette question');
  }
  
  if (themes.needsCritical && !selectedAgents.includes('critical')) {
    suggestions.push('Agent Critique recommandé pour valider les réponses');
  }
  
  if (themes.needsEthical && !selectedAgents.includes('ethical')) {
    suggestions.push('Agent Éthique recommandé pour cette dimension morale');
  }
  
  // Avertir si trop d'agents
  if (selectedAgents.length > 5) {
    warnings.push('Plus de 5 agents peuvent causer des rendements décroissants');
  }
  
  // Avertir si pas d'agent logique
  if (!selectedAgents.includes('logical') && selectedAgents.length > 1) {
    suggestions.push('Agent Logique recommandé pour structurer le débat');
  }
  
  return {
    valid: warnings.length === 0,
    warnings,
    suggestions
  };
}

/**
 * Explique pourquoi certains agents ont été sélectionnés
 */
export function explainAgentSelection(agents: string[], query: string): string {
  const explanations: Record<string, string> = {
    logical: '🧩 Analyse logique et décomposition structurée',
    creative: '💡 Exploration créative et pensée divergente',
    critical: '🔍 Analyse critique et identification des faiblesses',
    synthesizer: '⚡ Synthèse finale équilibrée et actionnable',
    ethical: '⚖️ Perspective éthique et morale',
    practical: '🛠️ Guidance pratique et actionnable',
    historical: '📚 Contexte historique et évolution'
  };
  
  const lines = agents
    .filter(agent => explanations[agent])
    .map(agent => explanations[agent]);
  
  const complexity = assessComplexity(query);
  const complexityText = complexity === 'simple' 
    ? 'Question simple' 
    : complexity === 'moderate' 
      ? 'Question modérée' 
      : 'Question complexe';
  
  return `${complexityText} – ${agents.length} agent(s) mobilisé(s) :\n${lines.join('\n')}`;
}
