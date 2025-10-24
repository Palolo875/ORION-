/**
 * Hook React pour intégrer le comportement humain amélioré
 * 
 * Ce hook fournit des utilitaires pour :
 * - Enrichir les réponses avec comportements humains
 * - Valider et détecter les hallucinations
 * - Calculer les scores de confiance
 * - Gérer la validation croisée entre agents
 */

import { useState, useCallback, useMemo } from 'react';
import {
  enrichWithHumanBehavior,
  calculateConfidence,
  detectPotentialHallucination,
  validateAgentConsensus,
  needsClarification,
  generateHumanAwarePrompt,
  DEFAULT_HUMAN_BEHAVIOR,
  type HumanBehaviorConfig,
  type HumanResponse,
  type ConfidenceScore,
} from '@/utils/humanBehavior';

export interface UseHumanBehaviorOptions {
  config?: Partial<HumanBehaviorConfig>;
  enableAutoEnrichment?: boolean;
}

export interface UseHumanBehaviorReturn {
  // Configuration
  config: HumanBehaviorConfig;
  updateConfig: (newConfig: Partial<HumanBehaviorConfig>) => void;
  
  // Fonctions d'enrichissement
  enrichResponse: (response: string, query: string, context?: { hasMemory: boolean; agentConsensus?: number }) => HumanResponse;
  
  // Validation et détection
  checkHallucination: (response: string) => ReturnType<typeof detectPotentialHallucination>;
  checkClarification: (query: string) => ReturnType<typeof needsClarification>;
  calculateResponseConfidence: (response: string, query: string, context?: { hasMemory: boolean; agentConsensus?: number }) => ConfidenceScore;
  
  // Validation multi-agents
  validateMultipleAgents: (responses: Array<{ agent: string; response: string }>) => ReturnType<typeof validateAgentConsensus>;
  
  // Génération de prompts
  generatePrompt: (basePrompt: string) => string;
  
  // État
  lastConfidence: ConfidenceScore | null;
  lastHallucinationCheck: ReturnType<typeof detectPotentialHallucination> | null;
}

/**
 * Hook principal pour le comportement humain amélioré
 */
export function useHumanBehavior(options: UseHumanBehaviorOptions = {}): UseHumanBehaviorReturn {
  const [config, setConfig] = useState<HumanBehaviorConfig>({
    ...DEFAULT_HUMAN_BEHAVIOR,
    ...options.config,
  });
  
  const [lastConfidence, setLastConfidence] = useState<ConfidenceScore | null>(null);
  const [lastHallucinationCheck, setLastHallucinationCheck] = useState<ReturnType<typeof detectPotentialHallucination> | null>(null);
  
  // Mise à jour de la configuration
  const updateConfig = useCallback((newConfig: Partial<HumanBehaviorConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);
  
  // Enrichissement de réponse
  const enrichResponse = useCallback((
    response: string,
    query: string,
    context?: { hasMemory: boolean; agentConsensus?: number }
  ): HumanResponse => {
    const enriched = enrichWithHumanBehavior(response, query, config, context);
    setLastConfidence(enriched.confidence);
    return enriched;
  }, [config]);
  
  // Vérification d'hallucination
  const checkHallucination = useCallback((response: string) => {
    const result = detectPotentialHallucination(response);
    setLastHallucinationCheck(result);
    return result;
  }, []);
  
  // Vérification de clarification
  const checkClarification = useCallback((query: string) => {
    return needsClarification(query);
  }, []);
  
  // Calcul de confiance
  const calculateResponseConfidence = useCallback((
    response: string,
    query: string,
    context?: { hasMemory: boolean; agentConsensus?: number }
  ) => {
    const confidence = calculateConfidence(response, query, context);
    setLastConfidence(confidence);
    return confidence;
  }, []);
  
  // Validation multi-agents
  const validateMultipleAgents = useCallback((
    responses: Array<{ agent: string; response: string }>
  ) => {
    return validateAgentConsensus(responses);
  }, []);
  
  // Génération de prompt
  const generatePrompt = useCallback((basePrompt: string) => {
    return generateHumanAwarePrompt(basePrompt, config);
  }, [config]);
  
  return {
    config,
    updateConfig,
    enrichResponse,
    checkHallucination,
    checkClarification,
    calculateResponseConfidence,
    validateMultipleAgents,
    generatePrompt,
    lastConfidence,
    lastHallucinationCheck,
  };
}

/**
 * Hook simplifié pour l'enrichissement automatique des réponses
 */
export function useAutoEnrichment(config?: Partial<HumanBehaviorConfig>) {
  const { enrichResponse, lastConfidence } = useHumanBehavior({ config });
  
  return useMemo(() => ({
    enrichResponse,
    lastConfidence,
  }), [enrichResponse, lastConfidence]);
}

/**
 * Hook pour la détection d'hallucinations en temps réel
 */
export function useHallucinationDetector() {
  const { checkHallucination, lastHallucinationCheck } = useHumanBehavior();
  
  const isResponseSafe = useCallback((response: string, threshold: number = 0.4) => {
    const check = checkHallucination(response);
    return !check.likely || check.confidence > threshold;
  }, [checkHallucination]);
  
  return {
    checkHallucination,
    lastHallucinationCheck,
    isResponseSafe,
  };
}

/**
 * Hook pour la gestion de la confiance
 */
export function useConfidenceTracking() {
  const [confidenceHistory, setConfidenceHistory] = useState<Array<{
    timestamp: number;
    query: string;
    confidence: ConfidenceScore;
  }>>([]);
  
  const { calculateResponseConfidence, lastConfidence } = useHumanBehavior();
  
  const trackConfidence = useCallback((response: string, query: string, context?: { hasMemory: boolean; agentConsensus?: number }) => {
    const confidence = calculateResponseConfidence(response, query, context);
    
    setConfidenceHistory(prev => [
      ...prev,
      {
        timestamp: Date.now(),
        query,
        confidence,
      }
    ].slice(-50)); // Garder les 50 dernières
    
    return confidence;
  }, [calculateResponseConfidence]);
  
  const averageConfidence = useMemo(() => {
    if (confidenceHistory.length === 0) return null;
    
    const sum = confidenceHistory.reduce((acc, item) => acc + item.confidence.score, 0);
    return sum / confidenceHistory.length;
  }, [confidenceHistory]);
  
  const lowConfidenceCount = useMemo(() => {
    return confidenceHistory.filter(item => item.confidence.score < 0.6).length;
  }, [confidenceHistory]);
  
  return {
    trackConfidence,
    confidenceHistory,
    averageConfidence,
    lowConfidenceCount,
    lastConfidence,
  };
}
