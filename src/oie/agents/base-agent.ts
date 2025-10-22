/**
 * Classe de base pour tous les agents OIE
 * Gère le cycle de vie et l'interface commune des agents
 */

import { IAgent, AgentMetadata, AgentState, AgentInput, AgentOutput } from '../types/agent.types';

// Types pour les erreurs enrichies
interface AgentError extends Error {
  agentId?: string;
  phase?: 'loading' | 'processing' | 'unloading';
  modelId?: string;
  agentState?: AgentState;
  originalError?: unknown;
  input?: {
    contentLength: number;
    hasImages: boolean;
    hasContext: boolean;
  };
}

export abstract class BaseAgent implements IAgent {
  public metadata: AgentMetadata;
  public state: AgentState = 'unloaded';
  protected model: unknown = null;
  
  constructor(metadata: AgentMetadata) {
    this.metadata = metadata;
  }
  
  async load(): Promise<void> {
    if (this.state === 'ready') return;
    
    this.state = 'loading';
    console.log(`[${this.metadata.name}] Chargement...`);
    
    const loadStartTime = performance.now();
    
    try {
      await this.loadModel();
      this.state = 'ready';
      const loadTime = performance.now() - loadStartTime;
      console.log(`[${this.metadata.name}] Prêt en ${(loadTime / 1000).toFixed(1)}s`);
    } catch (error: unknown) {
      this.state = 'error';
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      const errorMessage = `Échec du chargement de ${this.metadata.name}: ${errorMsg}`;
      console.error(`[${this.metadata.name}] ${errorMessage}`, error);
      
      // Créer une erreur structurée
      const structuredError: AgentError = new Error(errorMessage);
      structuredError.agentId = this.metadata.id;
      structuredError.phase = 'loading';
      structuredError.modelId = this.metadata.modelId;
      structuredError.originalError = error;
      
      throw structuredError;
    }
  }
  
  async unload(): Promise<void> {
    if (this.state === 'unloaded') return;
    
    console.log(`[${this.metadata.name}] Déchargement...`);
    
    try {
      await this.unloadModel();
      this.model = null;
      this.state = 'unloaded';
      console.log(`[${this.metadata.name}] Déchargé`);
    } catch (error: unknown) {
      console.error(`[${this.metadata.name}] Erreur lors du déchargement:`, error);
      // Ne pas bloquer sur une erreur de déchargement
      this.model = null;
      this.state = 'unloaded';
    }
  }
  
  async process(input: AgentInput): Promise<AgentOutput> {
    if (this.state !== 'ready') {
      const error: AgentError = new Error(`Agent ${this.metadata.name} non prêt (statut actuel: ${this.state})`);
      error.agentId = this.metadata.id;
      error.agentState = this.state;
      throw error;
    }
    
    this.state = 'busy';
    const startTime = performance.now();
    
    try {
      const output = await this.processInternal(input);
      this.state = 'ready';
      
      return {
        ...output,
        processingTime: performance.now() - startTime
      };
    } catch (error: unknown) {
      this.state = 'ready';
      
      // Enrichir l'erreur avec du contexte
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      const processError: AgentError = new Error(
        `Erreur lors du traitement par ${this.metadata.name}: ${errorMsg}`
      );
      processError.agentId = this.metadata.id;
      processError.phase = 'processing';
      processError.input = {
        contentLength: input.content?.length || 0,
        hasImages: !!(input.images && input.images.length > 0),
        hasContext: !!input.context
      };
      processError.originalError = error;
      
      throw processError;
    }
  }
  
  // Méthodes abstraites à implémenter
  protected abstract loadModel(): Promise<void>;
  protected abstract unloadModel(): Promise<void>;
  protected abstract processInternal(input: AgentInput): Promise<AgentOutput>;
}
