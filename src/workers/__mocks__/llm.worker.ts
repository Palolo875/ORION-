// src/workers/__mocks__/llm.worker.ts

/**
 * Mock du LLM Worker pour les tests
 * 
 * Ce mock simule le comportement du LLM Worker sans télécharger de modèles.
 * Il génère des réponses intelligentes basées sur le system prompt et la requête.
 * 
 * Usage:
 * - Par défaut en mode test (npm test)
 * - Réponses en 100ms au lieu de 5s
 * - Déterministe et sans dépendance réseau
 */

import type { WorkerMessage, QueryPayload } from '../../types';

/**
 * Mock du Worker LLM
 * Simule les messages et réponses d'un vrai worker
 */
export class MockLLMWorker {
  private listeners = new Map<string, (event: MessageEvent) => void>();
  private currentModel = "Phi-3-mini-4k-instruct-q4f16_1-MLC";
  
  postMessage(message: WorkerMessage<QueryPayload & { 
    context?: string[]; 
    modelId?: string; 
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    agentType?: string;
  }>) {
    const { type, payload, meta } = message;
    
    // Simuler un délai asynchrone (100ms au lieu de 5s)
    setTimeout(() => {
      const mockResponse = this.generateMockResponse(type, payload, meta);
      
      // Appeler le listener onmessage
      const listener = this.listeners.get('message');
      if (listener) {
        listener({ data: mockResponse });
      }
    }, 100);
  }
  
  addEventListener(event: string, callback: (event: MessageEvent) => void) {
    this.listeners.set(event, callback);
  }
  
  removeEventListener(event: string) {
    this.listeners.delete(event);
  }
  
  terminate() {
    this.listeners.clear();
  }
  
  /**
   * Génère une réponse mock intelligente basée sur le contexte
   */
  private generateMockResponse(
    type: string, 
    payload: Record<string, unknown>, 
    meta?: WorkerMessage['meta']
  ): WorkerMessage {
    if (type === 'set_model') {
      this.currentModel = payload.modelId || this.currentModel;
      return {
        type: 'model_set',
        payload: { modelId: this.currentModel },
        meta
      };
    }
    
    if (type === 'init') {
      return {
        type: 'init_complete',
        payload: {},
        meta
      };
    }
    
    if (type === 'generate_response') {
      // Simuler la progression du chargement (uniquement la première fois)
      const listener = this.listeners.get('message');
      if (listener) {
        // Envoyer quelques événements de progression
        setTimeout(() => {
          listener({
            data: {
              type: 'llm_load_progress',
              payload: {
                progress: 0.3,
                text: '[Mock] Chargement du modèle...',
                loaded: 300,
                total: 1000,
                modelId: this.currentModel,
              },
              meta
            }
          });
        }, 10);
        
        setTimeout(() => {
          listener({
            data: {
              type: 'llm_load_progress',
              payload: {
                progress: 0.7,
                text: '[Mock] Initialisation...',
                loaded: 700,
                total: 1000,
                modelId: this.currentModel,
              },
              meta
            }
          });
        }, 50);
      }
      
      // Générer la réponse basée sur le contexte
      const response = this.generateIntelligentResponse(payload);
      
      return {
        type: 'llm_response_complete',
        payload: {
          response,
          agentType: payload.agentType
        },
        meta
      };
    }
    
    // Type de message non géré
    return {
      type: 'llm_error',
      payload: {
        error: `[Mock] Type de message non géré: ${type}`,
        details: { type, payload }
      },
      meta
    };
  }
  
  /**
   * Génère une réponse intelligente basée sur le system prompt et la requête
   */
  private generateIntelligentResponse(payload: {
    query: string;
    systemPrompt?: string;
    agentType?: string;
    context?: string[];
  }): string {
    const { query, systemPrompt = '', agentType, context } = payload;
    const lowerQuery = query.toLowerCase();
    const lowerPrompt = systemPrompt.toLowerCase();
    
    // Réponses spécifiques par type d'agent (débat multi-agents)
    if (agentType === 'logical') {
      return this.generateLogicalResponse(query, context);
    }
    
    if (agentType === 'creative') {
      return this.generateCreativeResponse(query, context);
    }
    
    if (agentType === 'critical') {
      return this.generateCriticalResponse(query, context);
    }
    
    if (agentType === 'synthesizer') {
      return this.generateSynthesizerResponse(query, context);
    }
    
    // Réponses basées sur le system prompt
    if (lowerPrompt.includes('logique') || lowerPrompt.includes('logical')) {
      return this.generateLogicalResponse(query, context);
    }
    
    if (lowerPrompt.includes('créatif') || lowerPrompt.includes('creative')) {
      return this.generateCreativeResponse(query, context);
    }
    
    if (lowerPrompt.includes('critique') || lowerPrompt.includes('critical')) {
      return this.generateCriticalResponse(query, context);
    }
    
    // Réponses basées sur le type de requête
    if (lowerQuery.includes('calcul') || lowerQuery.includes('math')) {
      return `[Mock] Calcul: Pour "${query}", le résultat serait 42. (Réponse mockée)`;
    }
    
    if (lowerQuery.includes('code') || lowerQuery.includes('program')) {
      return `[Mock] Code:\n\`\`\`javascript\n// Exemple de code pour: ${query}\nfunction solution() {\n  return "mock";\n}\n\`\`\``;
    }
    
    if (lowerQuery.includes('explain') || lowerQuery.includes('expliquer')) {
      return `[Mock] Explication: ${query}\n\n1. Premier point d'explication\n2. Deuxième point avec détails\n3. Conclusion de l'explication\n\n${context && context.length > 0 ? `Contexte utilisé: ${context.length} éléments` : ''}`;
    }
    
    // Réponse par défaut
    const contextInfo = context && context.length > 0 
      ? `\n\n(Contexte: ${context.length} éléments de mémoire utilisés)`
      : '';
    
    return `[Mock LLM Response] Réponse à la requête: "${query.substring(0, 100)}..."\n\nCeci est une réponse mockée générée pour les tests. En production, le vrai modèle LLM fournirait une réponse détaillée et pertinente.${contextInfo}`;
  }
  
  /**
   * Génère une réponse logique structurée
   */
  private generateLogicalResponse(query: string, context?: string[]): string {
    const contextInfo = context && context.length > 0 ? `\n\nContexte: ${context.length} éléments` : '';
    return `[Mock - Agent Logique] Analyse structurée de: "${query.substring(0, 50)}..."

**1. Prémisses**
- Élément A: Donnée factuelle identifiée
- Élément B: Relation causale observée

**2. Raisonnement**
- Si A alors B (relation logique)
- B implique C (conséquence)

**3. Conclusion**
- Réponse déductive basée sur les prémisses
- Niveau de certitude: Élevé${contextInfo}`;
  }
  
  /**
   * Génère une réponse créative et imaginative
   */
  private generateCreativeResponse(query: string, context?: string[]): string {
    const contextInfo = context && context.length > 0 ? `\n\n💡 Inspiré par ${context.length} éléments de contexte` : '';
    return `[Mock - Agent Créatif] Exploration créative de: "${query.substring(0, 50)}..."

🎨 **Métaphore**
Imaginons que cette question soit comme un océan de possibilités, où chaque vague représente une perspective unique...

🌟 **Perspectives Innovantes**
1. Approche non conventionnelle: Et si nous envisagions le contraire?
2. Connexions inattendues: Lien avec un domaine apparemment sans rapport
3. Vision futuriste: Comment cela évoluera-t-il dans 10 ans?

✨ **Synthèse Créative**
La réponse se trouve peut-être dans la combinaison audacieuse de ces idées divergentes.${contextInfo}`;
  }
  
  /**
   * Génère une analyse critique
   */
  private generateCriticalResponse(query: string, context?: string[]): string {
    const contextInfo = context && context.length > 0 ? `\n\n📊 Basé sur ${context.length} sources` : '';
    return `[Mock - Agent Critique] Évaluation critique de: "${query.substring(0, 50)}..."

⚠️ **Limites Identifiées**
- Biais potentiel #1: Hypothèse non vérifiée
- Lacune #2: Manque de données empiriques
- Risque #3: Généralisation excessive

🔍 **Points à Questionner**
1. Cette affirmation est-elle supportée par des preuves?
2. Existe-t-il des contre-exemples?
3. Quelles sont les alternatives non explorées?

📋 **Recommandations**
- Approfondir l'analyse avec des données supplémentaires
- Considérer des perspectives alternatives
- Valider les hypothèses de base${contextInfo}`;
  }
  
  /**
   * Génère une synthèse des différents agents
   */
  private generateSynthesizerResponse(query: string, context?: string[]): string {
    const contextInfo = context && context.length > 0 ? `\n\n🔗 Intégrant ${context.length} éléments` : '';
    return `[Mock - Agent Synthétiseur] Synthèse finale pour: "${query.substring(0, 50)}..."

🎯 **Convergence des Perspectives**

**De l'Analyse Logique:**
- Structure argumentative solide
- Raisonnement déductif valide

**De la Vision Créative:**
- Approches innovantes identifiées
- Connexions non conventionnelles

**De l'Évaluation Critique:**
- Limites reconnues et adressées
- Points de vigilance notés

🌟 **Réponse Synthétique**
En combinant rigueur logique, créativité et esprit critique, la meilleure réponse serait une approche équilibrée qui:
1. S'appuie sur des faits vérifiables
2. Explore des solutions innovantes
3. Reste consciente de ses limites

Cette synthèse offre une réponse nuancée et complète.${contextInfo}`;
  }
}

// Export pour compatibilité avec le système de modules
export default MockLLMWorker;
