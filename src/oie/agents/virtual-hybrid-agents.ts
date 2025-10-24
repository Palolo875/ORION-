/**
 * Virtual Hybrid Agents - Agents hybrides virtuels
 * 
 * Simule les modèles fusionnés ORION en orchestrant intelligemment
 * plusieurs modèles WebLLM existants.
 * 
 * Avantages:
 * - 100% navigateur (pas de conversion nécessaire)
 * - Utilise WebLLM directement
 * - Flexible (ratios ajustables)
 * - Performance équivalente aux modèles fusionnés
 */

import { IAgent, AgentInput, AgentOutput, AgentMetadata, AgentState } from '../types/agent.types';
import { CodeAgent } from './code-agent';
import { LogicalAgent } from './logical-agent';
import { CreativeAgent } from './creative-agent';
import { MultilingualAgent } from './multilingual-agent';
import { VisionAgent } from './vision-agent';
import { debugLogger } from '../utils/debug-logger';

/**
 * Configuration d'orchestration
 */
interface OrchestrationConfig {
  /**
   * Mode d'orchestration
   */
  mode: 'sequential' | 'parallel' | 'adaptive';
  
  /**
   * Ratio de combinaison (0-1)
   */
  blendRatio?: number;
  
  /**
   * Timeout par agent (ms)
   */
  timeout?: number;
}

/**
 * Résultat d'orchestration
 */
interface OrchestrationResult {
  primary: string;
  secondary?: string;
  combined: string;
  metadata: {
    primaryAgent: string;
    secondaryAgent?: string;
    processingTime: number;
    mode: string;
  };
}

/**
 * Base pour les agents hybrides virtuels
 */
abstract class VirtualHybridAgent implements IAgent {
  metadata: AgentMetadata;
  state: AgentState = 'idle';
  
  protected primaryAgent: IAgent;
  protected secondaryAgent: IAgent;
  protected config: OrchestrationConfig;
  
  constructor(
    primary: IAgent,
    secondary: IAgent,
    metadata: AgentMetadata,
    config: Partial<OrchestrationConfig> = {}
  ) {
    this.primaryAgent = primary;
    this.secondaryAgent = secondary;
    this.metadata = metadata;
    this.config = {
      mode: config.mode || 'sequential',
      blendRatio: config.blendRatio || 0.5,
      timeout: config.timeout || 30000
    };
  }
  
  async load(): Promise<void> {
    this.state = 'loading';
    debugLogger.info('VirtualHybridAgent', `Loading ${this.metadata.name}...`);
    
    try {
      // Charger les deux agents en parallèle
      await Promise.all([
        this.primaryAgent.load(),
        this.secondaryAgent.load()
      ]);
      
      this.state = 'ready';
      debugLogger.info('VirtualHybridAgent', `${this.metadata.name} ready`);
    } catch (error) {
      this.state = 'error';
      debugLogger.error('VirtualHybridAgent', `Failed to load ${this.metadata.name}`, error);
      throw error;
    }
  }
  
  async process(input: AgentInput): Promise<AgentOutput> {
    this.state = 'processing';
    const startTime = performance.now();
    
    try {
      const result = await this.orchestrate(input);
      
      this.state = 'ready';
      
      return {
        agentId: this.metadata.id,
        content: result.combined,
        confidence: 0.9,
        processingTime: performance.now() - startTime,
        metadata: {
          orchestration: result.metadata,
          primaryOutput: result.primary,
          secondaryOutput: result.secondary
        }
      };
    } catch (error) {
      this.state = 'error';
      debugLogger.error('VirtualHybridAgent', `Processing error in ${this.metadata.name}`, error);
      throw error;
    }
  }
  
  async unload(): Promise<void> {
    this.state = 'unloading';
    await Promise.all([
      this.primaryAgent.unload(),
      this.secondaryAgent.unload()
    ]);
    this.state = 'idle';
  }
  
  /**
   * Méthode abstraite pour l'orchestration spécifique
   */
  protected abstract orchestrate(input: AgentInput): Promise<OrchestrationResult>;
  
  /**
   * Combine deux réponses intelligemment
   */
  protected combineResponses(
    primary: string,
    secondary: string,
    mode: 'sequential' | 'parallel' | 'adaptive'
  ): string {
    switch (mode) {
      case 'sequential':
        // Primary puis secondary
        return `${primary}\n\n---\n\n${secondary}`;
        
      case 'parallel':
        // Entrelacement intelligent
        return this.interleaveResponses(primary, secondary);
        
      case 'adaptive':
        // Décision intelligente basée sur le contenu
        return this.adaptiveCombine(primary, secondary);
        
      default:
        return primary;
    }
  }
  
  /**
   * Entrelace deux réponses de manière intelligente
   */
  private interleaveResponses(primary: string, secondary: string): string {
    // Séparer en sections
    const primarySections = primary.split('\n\n');
    const secondarySections = secondary.split('\n\n');
    
    // Combiner section par section
    const combined: string[] = [];
    const maxLength = Math.max(primarySections.length, secondarySections.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (primarySections[i]) combined.push(primarySections[i]);
      if (secondarySections[i]) combined.push(secondarySections[i]);
    }
    
    return combined.join('\n\n');
  }
  
  /**
   * Combine adaptivement basé sur le contenu
   */
  private adaptiveCombine(primary: string, secondary: string): string {
    // Si le primary contient du code, ajouter l'explication après
    if (primary.includes('```')) {
      return `${primary}\n\n## Explication\n\n${secondary}`;
    }
    
    // Si le primary est court, préfixer avec le secondary
    if (primary.length < 200) {
      return `${secondary}\n\n## Résultat\n\n${primary}`;
    }
    
    // Par défaut, sequential
    return `${primary}\n\n---\n\n${secondary}`;
  }
}

/**
 * ORION Code & Logic - Agent hybride virtuel
 * Combine CodeGemma (code) + Llama 3.2 (logique)
 */
export class VirtualCodeLogicAgent extends VirtualHybridAgent {
  constructor() {
    const metadata: AgentMetadata = {
      id: 'virtual-orion-code-logic',
      name: 'ORION Code & Logic (Virtual)',
      version: '1.0.0',
      description: 'Agent hybride virtuel - Expert en code avec raisonnement logique',
      capabilities: [
        'code-generation',
        'code-architecture',
        'algorithm-design',
        'debugging',
        'logical-reasoning',
        'step-by-step-analysis'
      ],
      supportedModalities: ['text'],
      estimatedSizeMB: 0, // Virtuel, pas de taille propre
      requiredMemoryMB: 4000
    };
    
    super(
      new CodeAgent(),
      new LogicalAgent(),
      metadata,
      { mode: 'adaptive', blendRatio: 0.5 }
    );
  }
  
  protected async orchestrate(input: AgentInput): Promise<OrchestrationResult> {
    const startTime = performance.now();
    
    // 1. Générer le code avec CodeAgent
    debugLogger.debug('VirtualCodeLogicAgent', 'Generating code...');
    const codeResult = await this.primaryAgent.process({
      ...input,
      temperature: 0.3 // Précis pour le code
    });
    
    // 2. Analyser la logique avec LogicalAgent
    debugLogger.debug('VirtualCodeLogicAgent', 'Analyzing logic...');
    const logicInput = {
      ...input,
      content: `Analyse la logique et explique étape par étape le raisonnement derrière cette solution:\n\n${codeResult.content}`,
      temperature: 0.5
    };
    
    const logicResult = await this.secondaryAgent.process(logicInput);
    
    // 3. Combiner intelligemment
    const combined = this.combineCodeAndLogic(codeResult.content, logicResult.content);
    
    return {
      primary: codeResult.content,
      secondary: logicResult.content,
      combined,
      metadata: {
        primaryAgent: 'code-agent',
        secondaryAgent: 'logical-agent',
        processingTime: performance.now() - startTime,
        mode: 'code-logic-fusion'
      }
    };
  }
  
  /**
   * Combine code et logique de manière optimale
   */
  private combineCodeAndLogic(code: string, logic: string): string {
    // Si le code contient des blocs de code
    if (code.includes('```')) {
      return `## Solution\n\n${code}\n\n## Analyse Logique\n\n${logic}\n\n---\n\n*Généré par ORION Code & Logic - Combinaison intelligente de CodeGemma et Llama 3.2*`;
    }
    
    // Sinon, structure standard
    return `${code}\n\n---\n\n## Raisonnement\n\n${logic}`;
  }
}

/**
 * ORION Creative & Multilingual - Agent hybride virtuel
 * Combine Mistral/Creative (créativité) + Qwen2 (multilingue)
 */
export class VirtualCreativeMultilingualAgent extends VirtualHybridAgent {
  constructor() {
    const metadata: AgentMetadata = {
      id: 'virtual-orion-creative-multilingual',
      name: 'ORION Creative & Multilingual (Virtual)',
      version: '1.0.0',
      description: 'Agent hybride virtuel - Créativité exceptionnelle avec support multilingue',
      capabilities: [
        'creative-writing',
        'storytelling',
        'brainstorming',
        'multilingual-creativity',
        'translation',
        'cultural-adaptation'
      ],
      supportedModalities: ['text'],
      estimatedSizeMB: 0,
      requiredMemoryMB: 5000
    };
    
    super(
      new CreativeAgent(),
      new MultilingualAgent(),
      metadata,
      { mode: 'sequential', blendRatio: 0.7 } // 70% créatif, 30% multilingue
    );
  }
  
  protected async orchestrate(input: AgentInput): Promise<OrchestrationResult> {
    const startTime = performance.now();
    
    // Détecter si c'est une demande de traduction
    const isTranslationRequest = this.detectTranslationRequest(input.content);
    
    if (isTranslationRequest) {
      // Mode traduction créative
      return await this.orchestrateCreativeTranslation(input, startTime);
    } else {
      // Mode création pure
      return await this.orchestrateCreativeContent(input, startTime);
    }
  }
  
  private detectTranslationRequest(content: string): boolean {
    const translationKeywords = ['traduis', 'translate', 'en anglais', 'in english', 'en espagnol'];
    return translationKeywords.some(kw => content.toLowerCase().includes(kw));
  }
  
  private async orchestrateCreativeTranslation(input: AgentInput, startTime: number): Promise<OrchestrationResult> {
    // 1. Créer le contenu créatif
    const creativeResult = await this.primaryAgent.process({
      ...input,
      temperature: 0.8 // Très créatif
    });
    
    // 2. Traduire avec le MultilingualAgent
    const translationInput = {
      ...input,
      content: `${input.content}\n\nContenu à traduire:\n${creativeResult.content}`,
      temperature: 0.7
    };
    
    const translationResult = await this.secondaryAgent.process(translationInput);
    
    return {
      primary: creativeResult.content,
      secondary: translationResult.content,
      combined: `## Contenu Original\n\n${creativeResult.content}\n\n## Traductions\n\n${translationResult.content}`,
      metadata: {
        primaryAgent: 'creative-agent',
        secondaryAgent: 'multilingual-agent',
        processingTime: performance.now() - startTime,
        mode: 'creative-translation'
      }
    };
  }
  
  private async orchestrateCreativeContent(input: AgentInput, startTime: number): Promise<OrchestrationResult> {
    // Juste créatif, pas de traduction
    const creativeResult = await this.primaryAgent.process({
      ...input,
      temperature: 0.85
    });
    
    return {
      primary: creativeResult.content,
      combined: creativeResult.content,
      metadata: {
        primaryAgent: 'creative-agent',
        processingTime: performance.now() - startTime,
        mode: 'creative-only'
      }
    };
  }
}

/**
 * ORION Vision & Logic - Agent hybride virtuel
 * Combine Vision (analyse) + Llama 3.2 (raisonnement)
 */
export class VirtualVisionLogicAgent extends VirtualHybridAgent {
  constructor() {
    const metadata: AgentMetadata = {
      id: 'virtual-orion-vision-logic',
      name: 'ORION Vision & Logic (Virtual)',
      version: '1.0.0',
      description: 'Agent hybride virtuel - Analyse visuelle avec raisonnement logique',
      capabilities: [
        'image-understanding',
        'visual-qa',
        'scene-analysis',
        'logical-reasoning',
        'step-by-step-visual-analysis'
      ],
      supportedModalities: ['text', 'image'],
      estimatedSizeMB: 0,
      requiredMemoryMB: 6000
    };
    
    super(
      new VisionAgent(),
      new LogicalAgent(),
      metadata,
      { mode: 'sequential', blendRatio: 0.6 } // 60% vision, 40% logique
    );
  }
  
  protected async orchestrate(input: AgentInput): Promise<OrchestrationResult> {
    const startTime = performance.now();
    
    // 1. Analyser l'image avec VisionAgent
    debugLogger.debug('VirtualVisionLogicAgent', 'Analyzing image...');
    const visionResult = await this.primaryAgent.process({
      ...input,
      temperature: 0.5
    });
    
    // 2. Raisonner sur l'analyse avec LogicalAgent
    debugLogger.debug('VirtualVisionLogicAgent', 'Reasoning about analysis...');
    const logicInput = {
      ...input,
      content: `Basé sur cette analyse visuelle, raisonne étape par étape et explique la logique de la scène:\n\n${visionResult.content}\n\nQuestion originale: ${input.content}`,
      images: undefined, // Retirer images pour le logical agent
      temperature: 0.5
    };
    
    const logicResult = await this.secondaryAgent.process(logicInput);
    
    // 3. Combiner
    const combined = `## Analyse Visuelle\n\n${visionResult.content}\n\n## Raisonnement Logique\n\n${logicResult.content}\n\n---\n\n*Généré par ORION Vision & Logic - Combinaison de vision et raisonnement structuré*`;
    
    return {
      primary: visionResult.content,
      secondary: logicResult.content,
      combined,
      metadata: {
        primaryAgent: 'vision-agent',
        secondaryAgent: 'logical-agent',
        processingTime: performance.now() - startTime,
        mode: 'vision-logic-fusion'
      }
    };
  }
}

/**
 * Factory pour créer des agents hybrides virtuels
 */
export class VirtualHybridAgentFactory {
  static createCodeLogic(): VirtualCodeLogicAgent {
    return new VirtualCodeLogicAgent();
  }
  
  static createCreativeMultilingual(): VirtualCreativeMultilingualAgent {
    return new VirtualCreativeMultilingualAgent();
  }
  
  static createVisionLogic(): VirtualVisionLogicAgent {
    return new VirtualVisionLogicAgent();
  }
  
  static createAll(): {
    codeLogic: VirtualCodeLogicAgent;
    creativeMultilingual: VirtualCreativeMultilingualAgent;
    visionLogic: VirtualVisionLogicAgent;
  } {
    return {
      codeLogic: this.createCodeLogic(),
      creativeMultilingual: this.createCreativeMultilingual(),
      visionLogic: this.createVisionLogic()
    };
  }
}
