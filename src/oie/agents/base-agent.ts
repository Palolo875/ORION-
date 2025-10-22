/**
 * Classe de base pour tous les agents OIE
 * Gère le cycle de vie et l'interface commune des agents
 */

import { IAgent, AgentMetadata, AgentState, AgentInput, AgentOutput } from '../types/agent.types';

export abstract class BaseAgent implements IAgent {
  public metadata: AgentMetadata;
  public state: AgentState = 'unloaded';
  protected model: any = null;
  
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
    } catch (error: any) {
      this.state = 'error';
      const errorMessage = `Échec du chargement de ${this.metadata.name}: ${error.message || 'Erreur inconnue'}`;
      console.error(`[${this.metadata.name}] ${errorMessage}`, error);
      
      // Créer une erreur structurée
      const structuredError = new Error(errorMessage);
      (structuredError as any).agentId = this.metadata.id;
      (structuredError as any).phase = 'loading';
      (structuredError as any).modelId = this.metadata.modelId;
      (structuredError as any).originalError = error;
      
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
    } catch (error: any) {
      console.error(`[${this.metadata.name}] Erreur lors du déchargement:`, error);
      // Ne pas bloquer sur une erreur de déchargement
      this.model = null;
      this.state = 'unloaded';
    }
  }
  
  async process(input: AgentInput): Promise<AgentOutput> {
    if (this.state !== 'ready') {
      const error = new Error(`Agent ${this.metadata.name} non prêt (statut actuel: ${this.state})`);
      (error as any).agentId = this.metadata.id;
      (error as any).agentState = this.state;
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
    } catch (error: any) {
      this.state = 'ready';
      
      // Enrichir l'erreur avec du contexte
      const processError = new Error(
        `Erreur lors du traitement par ${this.metadata.name}: ${error.message || 'Erreur inconnue'}`
      );
      (processError as any).agentId = this.metadata.id;
      (processError as any).phase = 'processing';
      (processError as any).input = {
        contentLength: input.content?.length || 0,
        hasImages: !!(input.images && input.images.length > 0),
        hasContext: !!input.context
      };
      (processError as any).originalError = error;
      
      throw processError;
    }
  }
  
  // Méthodes abstraites à implémenter
  protected abstract loadModel(): Promise<void>;
  protected abstract unloadModel(): Promise<void>;
  protected abstract processInternal(input: AgentInput): Promise<AgentOutput>;
}
