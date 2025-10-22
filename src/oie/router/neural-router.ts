/**
 * Routeur Neural pour l'OIE
 * Utilise des embeddings sémantiques pour un routage plus intelligent
 * Amélioration du SimpleRouter avec capacités d'apprentissage
 */

import { DetectedIntent, RoutingDecision } from '../types/router.types';
import { AgentMetadata } from '../types/agent.types';

interface SemanticPattern {
  embedding?: number[]; // Embedding du pattern (pour la recherche sémantique future)
  keywords: string[];
  agentId: string;
  capability: string;
  priority: number;
  examples?: string[]; // Exemples de requêtes
}

interface RoutingHistory {
  query: string;
  selectedAgent: string;
  confidence: number;
  timestamp: number;
  wasSuccessful?: boolean;
}

export class NeuralRouter {
  private agents: Map<string, AgentMetadata> = new Map();
  private routingHistory: RoutingHistory[] = [];
  private maxHistorySize = 100;
  
  // Patterns sémantiques enrichis
  private semanticPatterns: SemanticPattern[] = [
    {
      keywords: ['génère image', 'crée image', 'dessine', 'illustre', 'génère illustration', 
                 'créer visuel', 'image de', 'picture of', 'draw', 'generate image', 
                 'create image', 'art', 'artwork', 'painting', 'sketch'],
      agentId: 'creative-agent',
      capability: 'image_generation',
      priority: 11,
      examples: [
        'génère une image d\'un coucher de soleil',
        'crée une illustration de robot futuriste',
        'dessine un paysage montagneux'
      ]
    },
    {
      keywords: ['image', 'photo', 'picture', 'analyser image', 'voir', 'regarde', 
                 'what do you see', 'describe this', 'identifie', 'reconnaissance'],
      agentId: 'vision-agent',
      capability: 'image_analysis',
      priority: 10,
      examples: [
        'qu\'est-ce qu\'il y a sur cette image?',
        'analyse cette photo',
        'décris ce que tu vois'
      ]
    },
    {
      keywords: ['code', 'fonction', 'script', 'programme', 'class', 'javascript', 
                 'python', 'typescript', 'java', 'c++', 'rust', 'go', 'api', 'algorithme'],
      agentId: 'code-agent',
      capability: 'code_generation',
      priority: 9,
      examples: [
        'écris une fonction pour trier un tableau',
        'crée un script Python pour...',
        'génère du code TypeScript'
      ]
    },
    {
      keywords: ['explique code', 'comment fonctionne', 'debug', 'erreur dans', 'bug', 
                 'refactor', 'optimise', 'review'],
      agentId: 'code-agent',
      capability: 'code_explanation',
      priority: 9,
      examples: [
        'explique ce code',
        'pourquoi cette erreur?',
        'comment optimiser cette fonction?'
      ]
    },
    {
      keywords: ['analyse', 'décompose', 'étape', 'logique', 'raisonnement', 'pourquoi', 
                 'cause', 'effet', 'conséquence', 'déduction'],
      agentId: 'logical-agent',
      capability: 'logical_analysis',
      priority: 8,
      examples: [
        'analyse ce problème étape par étape',
        'quel est le raisonnement logique?',
        'pourquoi ce phénomène se produit?'
      ]
    },
    {
      keywords: ['créatif', 'imagination', 'invente', 'histoire', 'poème', 'original', 
                 'métaphore', 'brainstorm', 'idée'],
      agentId: 'conversation-agent',
      capability: 'creative_writing',
      priority: 7,
      examples: [
        'écris une histoire sur...',
        'invente une métaphore pour...',
        'brainstorme des idées pour...'
      ]
    }
  ];
  
  registerAgent(metadata: AgentMetadata): void {
    this.agents.set(metadata.id, metadata);
    console.log(`[NeuralRouter] Agent enregistré: ${metadata.name}`);
  }
  
  /**
   * Routage basique avec keywords (version améliorée)
   */
  async route(userQuery: string): Promise<RoutingDecision> {
    const query = userQuery.toLowerCase();
    
    // 1. Vérifier l'historique pour des patterns similaires
    const historicalMatch = this.findHistoricalMatch(query);
    if (historicalMatch && historicalMatch.confidence > 0.8) {
      console.log(`[NeuralRouter] 🎯 Correspondance historique trouvée (confiance: ${historicalMatch.confidence})`);
      return {
        selectedAgent: historicalMatch.selectedAgent,
        confidence: historicalMatch.confidence,
        reasoning: `Basé sur des requêtes similaires précédentes (${historicalMatch.reasoning})`
      };
    }
    
    // 2. Chercher la meilleure correspondance avec les patterns sémantiques
    let bestMatch: { pattern: SemanticPattern; score: number } | null = null;
    
    for (const pattern of this.semanticPatterns) {
      const matches = pattern.keywords.filter(kw => query.includes(kw));
      
      if (matches.length > 0) {
        // Score pondéré: (nb mots-clés / total) * priorité * bonus de longueur
        const keywordRatio = matches.length / pattern.keywords.length;
        const lengthBonus = Math.min(matches.join('').length / query.length, 1);
        const score = keywordRatio * pattern.priority * (1 + lengthBonus * 0.5);
        
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { pattern, score };
        }
      }
    }
    
    // 3. Si correspondance trouvée
    if (bestMatch) {
      const confidence = Math.min(bestMatch.score / 15, 0.95); // Normaliser sur 0-0.95
      
      const decision: RoutingDecision = {
        selectedAgent: bestMatch.pattern.agentId,
        confidence,
        reasoning: `Mots-clés détectés: ${bestMatch.pattern.keywords.filter(kw => query.includes(kw)).join(', ')}`
      };
      
      // Enregistrer dans l'historique
      this.addToHistory(query, decision);
      
      return decision;
    }
    
    // 4. Fallback vers conversation-agent
    const fallbackDecision: RoutingDecision = {
      selectedAgent: 'conversation-agent',
      confidence: 0.6,
      reasoning: 'Agent conversationnel par défaut (aucun pattern spécifique détecté)'
    };
    
    this.addToHistory(query, fallbackDecision);
    
    return fallbackDecision;
  }
  
  /**
   * Routage avec contexte enrichi
   */
  async routeWithContext(
    userQuery: string, 
    options?: {
      hasImages?: boolean;
      hasAudio?: boolean;
      conversationHistory?: any[];
      preferredCapability?: string;
    }
  ): Promise<RoutingDecision> {
    // Si des données audio sont présentes, forcer l'agent de transcription
    if (options?.hasAudio) {
      return {
        selectedAgent: 'speech-to-text-agent',
        confidence: 1.0,
        reasoning: 'Audio détecté - utilisation de l\'agent de transcription'
      };
    }
    
    // Si des images sont présentes, déterminer si c'est pour analyse ou génération
    if (options?.hasImages) {
      // Si la requête contient des mots-clés de génération, c'est probablement une erreur
      const hasGenerationKeywords = /génère|crée|dessine|illustre|create|generate|draw/i.test(userQuery);
      
      if (hasGenerationKeywords) {
        return {
          selectedAgent: 'creative-agent',
          confidence: 0.9,
          reasoning: 'Requête de génération d\'image détectée (images fournies seront ignorées)'
        };
      }
      
      return {
        selectedAgent: 'vision-agent',
        confidence: 1.0,
        reasoning: 'Images détectées - utilisation de l\'agent vision pour analyse'
      };
    }
    
    // Si une capacité est spécifiée
    if (options?.preferredCapability) {
      const agent = Array.from(this.agents.values()).find(a => 
        a.capabilities.includes(options.preferredCapability as any)
      );
      
      if (agent) {
        return {
          selectedAgent: agent.id,
          confidence: 0.9,
          reasoning: `Capacité requise: ${options.preferredCapability}`
        };
      }
    }
    
    // Analyse de l'historique conversationnel pour le contexte
    if (options?.conversationHistory && options.conversationHistory.length > 0) {
      const recentMessages = options.conversationHistory.slice(-3);
      const conversationContext = recentMessages.map(m => m.content || '').join(' ').toLowerCase();
      
      // Si le contexte récent parle de code, augmenter la probabilité de code-agent
      if (/code|fonction|script|programme/.test(conversationContext)) {
        const decision = await this.route(userQuery);
        if (decision.selectedAgent === 'code-agent') {
          decision.confidence = Math.min(decision.confidence + 0.1, 0.95);
          decision.reasoning += ' (renforcé par le contexte conversationnel)';
        }
        return decision;
      }
    }
    
    // Sinon, utiliser le routage standard
    return this.route(userQuery);
  }
  
  /**
   * Ajouter à l'historique de routage
   */
  private addToHistory(query: string, decision: RoutingDecision): void {
    this.routingHistory.push({
      query: query.toLowerCase(),
      selectedAgent: decision.selectedAgent,
      confidence: decision.confidence,
      timestamp: Date.now()
    });
    
    // Limiter la taille de l'historique
    if (this.routingHistory.length > this.maxHistorySize) {
      this.routingHistory.shift();
    }
  }
  
  /**
   * Trouver une correspondance dans l'historique
   */
  private findHistoricalMatch(query: string): RoutingDecision | null {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    
    // Chercher des requêtes très similaires dans l'historique récent
    for (const entry of this.routingHistory.slice(-20).reverse()) {
      const entryWords = entry.query.split(/\s+/);
      const commonWords = queryWords.filter(w => entryWords.includes(w));
      const similarity = commonWords.length / Math.max(queryWords.length, entryWords.length);
      
      if (similarity > 0.7 && entry.wasSuccessful !== false) {
        return {
          selectedAgent: entry.selectedAgent,
          confidence: entry.confidence * similarity,
          reasoning: `similaire à "${entry.query.substring(0, 50)}..."`
        };
      }
    }
    
    return null;
  }
  
  /**
   * Marquer une décision de routage comme réussie ou échouée
   * (utilisé pour l'apprentissage)
   */
  markDecisionOutcome(query: string, wasSuccessful: boolean): void {
    const recentEntry = this.routingHistory
      .slice()
      .reverse()
      .find(entry => entry.query === query.toLowerCase());
    
    if (recentEntry) {
      recentEntry.wasSuccessful = wasSuccessful;
      console.log(`[NeuralRouter] 📊 Feedback enregistré: ${wasSuccessful ? '✅' : '❌'} pour "${query.substring(0, 50)}"`);
    }
  }
  
  /**
   * Obtenir des statistiques sur le routage
   */
  getStats() {
    const agentCounts = new Map<string, number>();
    const successCounts = new Map<string, { success: number; total: number }>();
    
    for (const entry of this.routingHistory) {
      // Comptage des utilisations
      agentCounts.set(entry.selectedAgent, (agentCounts.get(entry.selectedAgent) || 0) + 1);
      
      // Comptage des succès
      if (entry.wasSuccessful !== undefined) {
        const stats = successCounts.get(entry.selectedAgent) || { success: 0, total: 0 };
        stats.total++;
        if (entry.wasSuccessful) stats.success++;
        successCounts.set(entry.selectedAgent, stats);
      }
    }
    
    return {
      totalRoutings: this.routingHistory.length,
      agentUsage: Object.fromEntries(agentCounts),
      successRates: Object.fromEntries(
        Array.from(successCounts.entries()).map(([agent, stats]) => [
          agent,
          stats.total > 0 ? (stats.success / stats.total) * 100 : null
        ])
      )
    };
  }
}
