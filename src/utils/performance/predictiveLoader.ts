/**
 * Pré-chargement prédictif pour ORION
 * Anticipe les besoins de l'utilisateur et pré-charge les agents
 */

import { logger } from '../logger';

export interface PredictionContext {
  conversationHistory?: any[];
  currentAgent?: string;
  lastUserInput?: string;
  recentAgents: string[];
}

export interface AgentPrediction {
  agentId: string;
  confidence: number;
  reason: string;
}

export interface PredictiveLoaderConfig {
  enabled: boolean;
  minConfidence: number; // Confiance minimale pour pré-charger
  maxPredictions: number; // Nombre max d'agents à pré-charger
  cooldownMs: number; // Temps minimum entre deux pré-chargements
}

/**
 * Patterns de transition d'agents basés sur l'historique
 */
const AGENT_TRANSITIONS = new Map<string, Map<string, number>>([
  // Après conversation-agent
  ['conversation-agent', new Map([
    ['code-agent', 0.3],
    ['creative-agent', 0.2],
    ['logical-agent', 0.2],
    ['multilingual-agent', 0.1],
    ['conversation-agent', 0.2] // Rester sur conversation
  ])],
  
  // Après code-agent
  ['code-agent', new Map([
    ['conversation-agent', 0.4],
    ['logical-agent', 0.3],
    ['code-agent', 0.3]
  ])],
  
  // Après vision-agent
  ['vision-agent', new Map([
    ['conversation-agent', 0.5],
    ['creative-agent', 0.3],
    ['code-agent', 0.2]
  ])],
  
  // Après creative-agent
  ['creative-agent', new Map([
    ['conversation-agent', 0.4],
    ['creative-agent', 0.3],
    ['multilingual-agent', 0.2],
    ['vision-agent', 0.1]
  ])],
  
  // Après logical-agent
  ['logical-agent', new Map([
    ['conversation-agent', 0.4],
    ['code-agent', 0.3],
    ['logical-agent', 0.3]
  ])],
  
  // Après multilingual-agent
  ['multilingual-agent', new Map([
    ['conversation-agent', 0.5],
    ['creative-agent', 0.2],
    ['multilingual-agent', 0.3]
  ])],
  
  // Après speech-to-text-agent
  ['speech-to-text-agent', new Map([
    ['conversation-agent', 0.8],
    ['multilingual-agent', 0.2]
  ])]
]);

/**
 * Mots-clés qui suggèrent un agent spécifique
 */
const KEYWORD_HINTS = new Map<string, { keywords: string[], confidence: number }>([
  ['code-agent', {
    keywords: ['code', 'function', 'debug', 'error', 'bug', 'program', 'script', 'variable'],
    confidence: 0.4
  }],
  ['creative-agent', {
    keywords: ['write', 'story', 'poem', 'creative', 'imagine', 'brainstorm', 'idea'],
    confidence: 0.3
  }],
  ['logical-agent', {
    keywords: ['calculate', 'math', 'logic', 'problem', 'solve', 'analyze', 'reason'],
    confidence: 0.3
  }],
  ['multilingual-agent', {
    keywords: ['translate', 'language', 'français', 'español', 'deutsch', 'chinese'],
    confidence: 0.4
  }],
  ['vision-agent', {
    keywords: ['image', 'photo', 'picture', 'visual', 'see', 'look', 'show'],
    confidence: 0.4
  }]
]);

/**
 * Gestionnaire de pré-chargement prédictif
 */
export class PredictiveLoader {
  private config: PredictiveLoaderConfig;
  private lastPredictionTime = 0;
  private predictionHistory: AgentPrediction[] = [];
  private onPreloadCallback?: (agentId: string) => Promise<void>;

  constructor(config: Partial<PredictiveLoaderConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      minConfidence: config.minConfidence ?? 0.3,
      maxPredictions: config.maxPredictions ?? 2,
      cooldownMs: config.cooldownMs ?? 5000 // 5 secondes
    };

    logger.info('PredictiveLoader', 'Initialized', { config: this.config });
  }

  /**
   * Enregistre le callback de pré-chargement
   */
  onPreload(callback: (agentId: string) => Promise<void>): void {
    this.onPreloadCallback = callback;
  }

  /**
   * Prédit le prochain agent probable
   */
  async predictNext(context: PredictionContext): Promise<AgentPrediction[]> {
    if (!this.config.enabled) {
      return [];
    }

    // Vérifier le cooldown
    const now = Date.now();
    if (now - this.lastPredictionTime < this.config.cooldownMs) {
      return [];
    }

    const predictions: AgentPrediction[] = [];

    // 1. Prédiction basée sur l'agent actuel (transitions)
    if (context.currentAgent) {
      const transitionPredictions = this.predictFromTransitions(context.currentAgent);
      predictions.push(...transitionPredictions);
    }

    // 2. Prédiction basée sur les mots-clés de l'input
    if (context.lastUserInput) {
      const keywordPredictions = this.predictFromKeywords(context.lastUserInput);
      predictions.push(...keywordPredictions);
    }

    // 3. Prédiction basée sur l'historique récent
    if (context.recentAgents.length > 0) {
      const historyPredictions = this.predictFromHistory(context.recentAgents);
      predictions.push(...historyPredictions);
    }

    // Fusionner les prédictions (si plusieurs sources prédisent le même agent)
    const mergedPredictions = this.mergePredictions(predictions);

    // Filtrer par confiance minimale
    const filteredPredictions = mergedPredictions.filter(
      p => p.confidence >= this.config.minConfidence
    );

    // Trier par confiance et limiter
    const sortedPredictions = filteredPredictions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.maxPredictions);

    // Sauvegarder dans l'historique
    this.predictionHistory = sortedPredictions;
    this.lastPredictionTime = now;

    // Pré-charger les agents prédits
    if (sortedPredictions.length > 0) {
      await this.executePreload(sortedPredictions);
    }

    logger.info('PredictiveLoader', 'Predictions generated', {
      count: sortedPredictions.length,
      predictions: sortedPredictions.map(p => ({
        agent: p.agentId,
        confidence: p.confidence.toFixed(2)
      }))
    });

    return sortedPredictions;
  }

  /**
   * Prédit basé sur les transitions d'agents
   */
  private predictFromTransitions(currentAgent: string): AgentPrediction[] {
    const transitions = AGENT_TRANSITIONS.get(currentAgent);
    if (!transitions) {
      return [];
    }

    const predictions: AgentPrediction[] = [];

    for (const [agentId, confidence] of transitions.entries()) {
      // Ne pas prédire le même agent (sauf si très probable)
      if (agentId === currentAgent && confidence < 0.5) {
        continue;
      }

      predictions.push({
        agentId,
        confidence,
        reason: `Transition from ${currentAgent}`
      });
    }

    return predictions;
  }

  /**
   * Prédit basé sur les mots-clés
   */
  private predictFromKeywords(input: string): AgentPrediction[] {
    const predictions: AgentPrediction[] = [];
    const lowerInput = input.toLowerCase();

    for (const [agentId, { keywords, confidence }] of KEYWORD_HINTS.entries()) {
      const matchedKeywords = keywords.filter(keyword => 
        lowerInput.includes(keyword)
      );

      if (matchedKeywords.length > 0) {
        // Augmenter la confiance si plusieurs mots-clés correspondent
        const boostedConfidence = Math.min(
          confidence * (1 + matchedKeywords.length * 0.1),
          0.9
        );

        predictions.push({
          agentId,
          confidence: boostedConfidence,
          reason: `Keywords: ${matchedKeywords.join(', ')}`
        });
      }
    }

    return predictions;
  }

  /**
   * Prédit basé sur l'historique récent
   */
  private predictFromHistory(recentAgents: string[]): AgentPrediction[] {
    if (recentAgents.length === 0) {
      return [];
    }

    // Compter la fréquence des agents récents
    const frequency = new Map<string, number>();
    for (const agent of recentAgents) {
      frequency.set(agent, (frequency.get(agent) || 0) + 1);
    }

    // L'agent le plus récent a plus de poids
    const mostRecent = recentAgents[recentAgents.length - 1];
    frequency.set(mostRecent, (frequency.get(mostRecent) || 0) + 2);

    // Convertir en prédictions
    const predictions: AgentPrediction[] = [];
    const total = recentAgents.length + 2; // +2 pour le poids du plus récent

    for (const [agentId, count] of frequency.entries()) {
      const confidence = Math.min(count / total, 0.5); // Max 0.5 pour l'historique seul

      predictions.push({
        agentId,
        confidence,
        reason: 'Recent usage pattern'
      });
    }

    return predictions;
  }

  /**
   * Fusionne les prédictions multiples pour le même agent
   */
  private mergePredictions(predictions: AgentPrediction[]): AgentPrediction[] {
    const merged = new Map<string, AgentPrediction>();

    for (const prediction of predictions) {
      const existing = merged.get(prediction.agentId);

      if (existing) {
        // Combiner les confidences (moyenne pondérée)
        const combinedConfidence = Math.min(
          (existing.confidence + prediction.confidence) / 1.5,
          0.95
        );

        merged.set(prediction.agentId, {
          agentId: prediction.agentId,
          confidence: combinedConfidence,
          reason: `${existing.reason} + ${prediction.reason}`
        });
      } else {
        merged.set(prediction.agentId, prediction);
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Exécute le pré-chargement des agents prédits
   */
  private async executePreload(predictions: AgentPrediction[]): Promise<void> {
    if (!this.onPreloadCallback) {
      logger.warn('PredictiveLoader', 'No preload callback registered');
      return;
    }

    for (const prediction of predictions) {
      try {
        logger.info('PredictiveLoader', `Preloading agent: ${prediction.agentId}`, {
          confidence: prediction.confidence,
          reason: prediction.reason
        });

        await this.onPreloadCallback(prediction.agentId);

      } catch (error) {
        logger.warn('PredictiveLoader', `Failed to preload ${prediction.agentId}`, error);
      }
    }
  }

  /**
   * Active/désactive le pré-chargement
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    logger.info('PredictiveLoader', `Predictive loading ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Met à jour la configuration
   */
  updateConfig(config: Partial<PredictiveLoaderConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };

    logger.info('PredictiveLoader', 'Configuration updated', { config: this.config });
  }

  /**
   * Obtient les dernières prédictions
   */
  getLastPredictions(): AgentPrediction[] {
    return this.predictionHistory;
  }

  /**
   * Enregistre manuellement une transition pour améliorer les prédictions
   */
  recordTransition(fromAgent: string, toAgent: string): void {
    // Cette méthode pourrait être utilisée pour un apprentissage adaptatif
    logger.info('PredictiveLoader', 'Transition recorded', {
      from: fromAgent,
      to: toAgent
    });

    // Dans une version future, on pourrait ajuster dynamiquement
    // les probabilités de transition basées sur l'usage réel
  }

  /**
   * Reset l'état
   */
  reset(): void {
    this.lastPredictionTime = 0;
    this.predictionHistory = [];
    logger.info('PredictiveLoader', 'State reset');
  }
}

// Export singleton
export const predictiveLoader = new PredictiveLoader();
