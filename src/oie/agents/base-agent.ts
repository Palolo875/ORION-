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
    
    try {
      await this.loadModel();
      this.state = 'ready';
      console.log(`[${this.metadata.name}] Prêt`);
    } catch (error) {
      this.state = 'error';
      console.error(`[${this.metadata.name}] Erreur:`, error);
      throw error;
    }
  }
  
  async unload(): Promise<void> {
    if (this.state === 'unloaded') return;
    
    console.log(`[${this.metadata.name}] Déchargement...`);
    await this.unloadModel();
    this.model = null;
    this.state = 'unloaded';
  }
  
  async process(input: AgentInput): Promise<AgentOutput> {
    if (this.state !== 'ready') {
      throw new Error(`Agent ${this.metadata.name} non prêt`);
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
    } catch (error) {
      this.state = 'ready';
      throw error;
    }
  }
  
  // Méthodes abstraites à implémenter
  protected abstract loadModel(): Promise<void>;
  protected abstract unloadModel(): Promise<void>;
  protected abstract processInternal(input: AgentInput): Promise<AgentOutput>;
}
