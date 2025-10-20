// src/workers/orchestrator/MultiAgentCoordinator.ts

/**
 * Multi-Agent Coordinator
 * 
 * Gère la coordination du débat multi-agents avec parallélisation intelligente.
 * Responsable de l'orchestration des agents Logique, Créatif, Critique et Synthétiseur.
 */

import { LOGICAL_AGENT, CREATIVE_AGENT, CRITICAL_AGENT, SYNTHESIZER_AGENT, createSynthesisMessage } from '../../config/agents';
import { QueryPayload, WorkerMessage, StatusUpdatePayload } from '../../types';
import { logger } from '../../utils/logger';

export interface MultiAgentState {
  logicalResponse?: string;
  creativeResponse?: string;
  criticalResponse?: string;
  currentStep: 'idle' | 'parallel_generation' | 'critical' | 'synthesis';
  parallelResponses: { logical: boolean; creative: boolean };
}

export class MultiAgentCoordinator {
  private state: MultiAgentState;
  private currentQueryContext: QueryPayload | null = null;
  private currentQueryMeta: WorkerMessage['meta'] | null = null;
  private currentMemoryHits: string[] = [];
  private llmWorker: Worker;

  constructor(llmWorker: Worker) {
    this.llmWorker = llmWorker;
    this.state = {
      currentStep: 'idle',
      parallelResponses: { logical: false, creative: false }
    };
  }

  /**
   * Lance le débat multi-agents avec parallélisation intelligente
   */
  launchDebate(
    queryContext: QueryPayload,
    queryMeta: WorkerMessage['meta'] | null,
    memoryHits: string[]
  ): void {
    logger.info('MultiAgentCoordinator', 'Démarrage du débat multi-agents avec parallélisation', undefined, queryMeta?.traceId);
    
    this.currentQueryContext = queryContext;
    this.currentQueryMeta = queryMeta;
    this.currentMemoryHits = memoryHits;
    
    // Réinitialiser l'état
    this.state = {
      currentStep: 'parallel_generation',
      logicalResponse: undefined,
      creativeResponse: undefined,
      criticalResponse: undefined,
      parallelResponses: { logical: false, creative: false }
    };
    
    // Envoyer une mise à jour de statut
    self.postMessage({ 
      type: 'status_update', 
      payload: { 
        step: 'llm_reasoning', 
        details: 'Agents Logique et Créatif : Analyse parallèle...' 
      } as StatusUpdatePayload,
      meta: this.currentQueryMeta 
    });
    
    // Lancer les agents Logique et Créatif en PARALLÈLE
    this.llmWorker.postMessage({ 
      type: 'generate_response', 
      payload: {
        ...queryContext,
        context: memoryHits,
        systemPrompt: LOGICAL_AGENT.systemPrompt,
        temperature: LOGICAL_AGENT.temperature,
        maxTokens: LOGICAL_AGENT.maxTokens,
        agentType: 'logical',
      },
      meta: this.currentQueryMeta || undefined
    });
    
    this.llmWorker.postMessage({ 
      type: 'generate_response', 
      payload: {
        ...queryContext,
        context: memoryHits,
        systemPrompt: CREATIVE_AGENT.systemPrompt,
        temperature: CREATIVE_AGENT.temperature,
        maxTokens: CREATIVE_AGENT.maxTokens,
        agentType: 'creative',
      },
      meta: this.currentQueryMeta || undefined
    });
  }

  /**
   * Traite une réponse d'agent et avance dans le workflow
   * Retourne true si le débat est terminé
   */
  handleAgentResponse(response: string, agentType?: string): boolean {
    if (this.state.currentStep === 'parallel_generation') {
      // Gérer les réponses parallèles
      if (agentType === 'logical') {
        logger.debug('MultiAgentCoordinator', 'Agent Logique a répondu (parallèle)', undefined, this.currentQueryMeta?.traceId);
        this.state.logicalResponse = response;
        this.state.parallelResponses.logical = true;
      } else if (agentType === 'creative') {
        logger.debug('MultiAgentCoordinator', 'Agent Créatif a répondu (parallèle)', undefined, this.currentQueryMeta?.traceId);
        this.state.creativeResponse = response;
        this.state.parallelResponses.creative = true;
      }
      
      // Si les deux agents ont répondu, lancer l'agent critique
      if (this.state.parallelResponses.logical && this.state.parallelResponses.creative) {
        this.launchCriticalAgent();
      }
      
      return false;
      
    } else if (this.state.currentStep === 'critical') {
      logger.debug('MultiAgentCoordinator', 'Agent Critique a répondu', undefined, this.currentQueryMeta?.traceId);
      this.state.criticalResponse = response;
      this.launchSynthesisAgent();
      return false;
      
    } else if (this.state.currentStep === 'synthesis') {
      // Débat terminé
      return true;
    }
    
    return false;
  }

  /**
   * Lance l'agent critique
   */
  private launchCriticalAgent(): void {
    logger.debug('MultiAgentCoordinator', "Génération parallèle terminée, lancement de l'agent critique", undefined, this.currentQueryMeta?.traceId);
    this.state.currentStep = 'critical';
    
    self.postMessage({ 
      type: 'status_update', 
      payload: { 
        step: 'multi_agent_critical', 
        details: 'Agent Critique en cours...' 
      } as StatusUpdatePayload,
      meta: this.currentQueryMeta 
    });
    
    this.llmWorker.postMessage({ 
      type: 'generate_response', 
      payload: {
        ...this.currentQueryContext!,
        context: this.currentMemoryHits,
        systemPrompt: CRITICAL_AGENT.systemPrompt,
        temperature: CRITICAL_AGENT.temperature,
        maxTokens: CRITICAL_AGENT.maxTokens,
      },
      meta: this.currentQueryMeta || undefined
    });
  }

  /**
   * Lance l'agent synthétiseur
   */
  private launchSynthesisAgent(): void {
    this.state.currentStep = 'synthesis';
    
    self.postMessage({ 
      type: 'status_update', 
      payload: { 
        step: 'multi_agent_synthesis', 
        details: 'Synthèse finale en cours...' 
      } as StatusUpdatePayload,
      meta: this.currentQueryMeta 
    });
    
    const contextStr = this.currentMemoryHits.length > 0 ? this.currentMemoryHits.join('\n- ') : undefined;
    const synthesisPrompt = createSynthesisMessage(
      this.currentQueryContext!.query,
      this.state.logicalResponse!,
      this.state.creativeResponse!,
      this.state.criticalResponse!,
      contextStr
    );
    
    this.llmWorker.postMessage({ 
      type: 'generate_response', 
      payload: {
        query: synthesisPrompt,
        conversationHistory: this.currentQueryContext!.conversationHistory,
        deviceProfile: this.currentQueryContext!.deviceProfile,
        context: [],
        systemPrompt: '',
        temperature: SYNTHESIZER_AGENT.temperature,
        maxTokens: SYNTHESIZER_AGENT.maxTokens,
      },
      meta: this.currentQueryMeta || undefined
    });
  }

  /**
   * Obtient le débat complet pour l'évaluation de qualité
   */
  getDebateResponses(): { logical?: string; creative?: string; critical?: string } {
    return {
      logical: this.state.logicalResponse,
      creative: this.state.creativeResponse,
      critical: this.state.criticalResponse,
    };
  }

  /**
   * Obtient la liste des agents utilisés
   */
  getAgentList(): string[] {
    if (this.state.currentStep === 'synthesis') {
      return ['Logical', 'Creative', 'Critical', 'Synthesizer'];
    }
    return ['LLMAgent'];
  }

  /**
   * Réinitialise l'état du coordinateur
   */
  reset(): void {
    this.state = {
      currentStep: 'idle',
      parallelResponses: { logical: false, creative: false }
    };
    this.currentQueryContext = null;
    this.currentQueryMeta = null;
    this.currentMemoryHits = [];
  }

  /**
   * Vérifie si le débat multi-agents est en cours
   */
  isDebateActive(): boolean {
    return this.state.currentStep !== 'idle';
  }

  /**
   * Obtient l'étape actuelle
   */
  getCurrentStep(): string {
    return this.state.currentStep;
  }
}
