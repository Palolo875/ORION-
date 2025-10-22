/**
 * Routeur Simplifié pour l'OIE
 * Détecte l'intention de l'utilisateur et sélectionne l'agent approprié
 */

import { DetectedIntent, RoutingDecision } from '../types/router.types';
import { AgentMetadata } from '../types/agent.types';

export class SimpleRouter {
  private agents: Map<string, AgentMetadata> = new Map();
  
  registerAgent(metadata: AgentMetadata): void {
    this.agents.set(metadata.id, metadata);
    console.log(`[SimpleRouter] Agent enregistré: ${metadata.name}`);
  }
  
  async route(userQuery: string): Promise<RoutingDecision> {
    const query = userQuery.toLowerCase();
    
    // Règles de détection par ordre de priorité
    const rules = [
      {
        keywords: ['image', 'photo', 'picture', 'analyser image', 'voir', 'regarde'],
        agentId: 'vision-agent',
        capability: 'image_analysis',
        priority: 10
      },
      {
        keywords: ['code', 'fonction', 'script', 'programme', 'class', 'javascript', 'python', 'typescript', 'java', 'c++'],
        agentId: 'code-agent',
        capability: 'code_generation',
        priority: 9
      },
      {
        keywords: ['explique code', 'comment fonctionne', 'debug', 'erreur dans', 'bug'],
        agentId: 'code-agent',
        capability: 'code_explanation',
        priority: 9
      },
      {
        keywords: ['analyse', 'décompose', 'étape', 'logique', 'raisonnement', 'pourquoi'],
        agentId: 'logical-agent',
        capability: 'logical_analysis',
        priority: 8
      },
      {
        keywords: ['créatif', 'imagination', 'invente', 'histoire', 'poème', 'original'],
        agentId: 'conversation-agent',
        capability: 'creative_writing',
        priority: 7
      }
    ];
    
    // Chercher la meilleure correspondance
    let bestMatch: { rule: typeof rules[0]; score: number } | null = null;
    
    for (const rule of rules) {
      const matches = rule.keywords.filter(kw => query.includes(kw));
      
      if (matches.length > 0) {
        const score = (matches.length / rule.keywords.length) * rule.priority;
        
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { rule, score };
        }
      }
    }
    
    // Si correspondance trouvée
    if (bestMatch) {
      const confidence = Math.min(bestMatch.score / 10, 0.95);
      
      return {
        selectedAgent: bestMatch.rule.agentId,
        confidence,
        reasoning: `Mots-clés détectés: ${bestMatch.rule.keywords.filter(kw => query.includes(kw)).join(', ')}`
      };
    }
    
    // Fallback vers conversation-agent
    return {
      selectedAgent: 'conversation-agent',
      confidence: 0.6,
      reasoning: 'Agent conversationnel par défaut'
    };
  }
  
  /**
   * Détecte si la requête contient des images
   */
  detectImages(query: string, attachments?: any[]): boolean {
    return !!(attachments && attachments.length > 0 && 
             attachments.some(a => a.type?.startsWith('image')));
  }
  
  /**
   * Suggère un agent basé sur le contexte complet
   */
  async routeWithContext(
    userQuery: string, 
    options?: {
      hasImages?: boolean;
      conversationHistory?: any[];
      preferredCapability?: string;
    }
  ): Promise<RoutingDecision> {
    // Si des images sont présentes, forcer l'agent vision
    if (options?.hasImages) {
      return {
        selectedAgent: 'vision-agent',
        confidence: 1.0,
        reasoning: 'Images détectées - utilisation de l\'agent vision'
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
    
    // Sinon, utiliser le routage standard
    return this.route(userQuery);
  }
}
