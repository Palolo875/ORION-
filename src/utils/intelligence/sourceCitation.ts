/**
 * Source Citation - Système de gestion des sources et citations
 * 
 * Ce module aide à gérer et citer des sources pour améliorer la fiabilité
 */

import { logger } from '../logger';

export interface Source {
  id: string;
  title: string;
  type: 'memory' | 'context' | 'tool' | 'reasoning' | 'external';
  content?: string;
  url?: string;
  reliability: number; // 0-1
  timestamp?: number;
}

export interface Citation {
  sourceId: string;
  quotedText: string;
  relevance: number; // 0-1
}

export interface ResponseWithSources {
  response: string;
  sources: Source[];
  citations: Citation[];
  confidence: number;
}

/**
 * Crée une source depuis un résultat de mémoire
 */
export function createMemorySource(content: string, id: string = ''): Source {
  return {
    id: id || `mem_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    title: 'Mémoire contextuelle',
    type: 'memory',
    content: content.substring(0, 200),
    reliability: 0.8,
    timestamp: Date.now(),
  };
}

/**
 * Crée une source depuis un résultat d'outil
 */
export function createToolSource(toolName: string, result: string): Source {
  return {
    id: `tool_${toolName}_${Date.now()}`,
    title: `Outil: ${toolName}`,
    type: 'tool',
    content: result.substring(0, 200),
    reliability: 0.95, // Les outils sont généralement très fiables
    timestamp: Date.now(),
  };
}

/**
 * Crée une source depuis le raisonnement interne
 */
export function createReasoningSource(reasoning: string): Source {
  return {
    id: `reason_${Date.now()}`,
    title: 'Raisonnement logique',
    type: 'reasoning',
    content: reasoning.substring(0, 200),
    reliability: 0.7,
    timestamp: Date.now(),
  };
}

/**
 * Formate les sources en section de références
 */
export function formatSources(sources: Source[]): string {
  if (sources.length === 0) {
    return '';
  }
  
  let formatted = '\n\n---\n\n**📚 Sources et références** :\n\n';
  
  sources.forEach((source, index) => {
    const num = index + 1;
    
    switch (source.type) {
      case 'memory':
        formatted += `${num}. Mémoire contextuelle (fiabilité: ${Math.round(source.reliability * 100)}%)\n`;
        if (source.content) {
          formatted += `   *"${source.content}..."*\n`;
        }
        break;
        
      case 'tool':
        formatted += `${num}. ${source.title} (fiabilité: ${Math.round(source.reliability * 100)}%)\n`;
        break;
        
      case 'reasoning':
        formatted += `${num}. Raisonnement logique interne\n`;
        break;
        
      case 'context':
        formatted += `${num}. Contexte de conversation\n`;
        break;
        
      case 'external':
        formatted += `${num}. ${source.title}\n`;
        if (source.url) {
          formatted += `   🔗 ${source.url}\n`;
        }
        break;
    }
    
    formatted += '\n';
  });
  
  return formatted;
}

/**
 * Ajoute des marqueurs de citation numérotés dans le texte
 */
export function addCitationMarkers(
  text: string,
  citations: Citation[],
  sources: Source[]
): string {
  let marked = text;
  
  citations.forEach((citation, index) => {
    const sourceIndex = sources.findIndex(s => s.id === citation.sourceId);
    if (sourceIndex !== -1) {
      const marker = `[${sourceIndex + 1}]`;
      // Ajouter le marqueur après le texte cité
      marked = marked.replace(
        citation.quotedText,
        `${citation.quotedText} ${marker}`
      );
    }
  });
  
  return marked;
}

/**
 * Détecte les affirmations qui auraient besoin de citations
 */
export function detectClaimsNeedingCitation(text: string): string[] {
  const claims: string[] = [];
  
  // Patterns d'affirmations factuelles
  const patterns = [
    /\b\d{4}\b/, // Années
    /\b\d+%\b/, // Pourcentages
    /selon .+?,/gi,
    /\b(recherches?|études?|scientifiques?)\b.+\b(montrent?|démontrent?|prouvent?)\b/gi,
    /\b(statistiques?|données)\b.+\b(indiquent?|révèlent?)\b/gi,
  ];
  
  const sentences = text.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    for (const pattern of patterns) {
      if (pattern.test(sentence)) {
        claims.push(sentence.trim());
        break;
      }
    }
  }
  
  return claims;
}

/**
 * Génère une suggestion de reformulation avec citation
 */
export function suggestCitationFormat(claim: string, source?: Source): string {
  if (!source) {
    return `${claim} [source recommandée]`;
  }
  
  return `${claim} [Source: ${source.title}]`;
}

/**
 * Crée un disclaimer si sources manquantes
 */
export function generateDisclaimerIfNeeded(
  text: string,
  sources: Source[]
): string {
  const claimsNeedingCitation = detectClaimsNeedingCitation(text);
  
  if (claimsNeedingCitation.length > 2 && sources.length === 0) {
    return '\n\n⚠️ *Note de fiabilité* : Cette réponse contient plusieurs affirmations factuelles. Je vous recommande de vérifier ces informations auprès de sources fiables, car je n\'ai pas accès à des sources vérifiées en temps réel.';
  }
  
  if (claimsNeedingCitation.length > 5 && sources.length < 2) {
    return '\n\n⚠️ *Note de fiabilité* : Cette réponse contient de nombreuses affirmations factuelles avec peu de sources. Je vous encourage à vérifier les points importants auprès de sources expertes.';
  }
  
  return '';
}

/**
 * Évalue la qualité des sources
 */
export function evaluateSourceQuality(sources: Source[]): {
  averageReliability: number;
  diversity: number; // Diversité des types de sources
  recency: number; // Fraîcheur des sources
} {
  if (sources.length === 0) {
    return {
      averageReliability: 0,
      diversity: 0,
      recency: 0,
    };
  }
  
  const averageReliability = sources.reduce((sum, s) => sum + s.reliability, 0) / sources.length;
  
  const types = new Set(sources.map(s => s.type));
  const diversity = types.size / 5; // 5 types possibles
  
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const recentSources = sources.filter(s => 
    s.timestamp && (now - s.timestamp) < oneHour
  );
  const recency = recentSources.length / sources.length;
  
  return {
    averageReliability,
    diversity,
    recency,
  };
}

/**
 * Génère un badge de confiance basé sur les sources
 */
export function generateConfidenceBadge(sources: Source[]): string {
  const quality = evaluateSourceQuality(sources);
  
  const confidence = (
    quality.averageReliability * 0.5 +
    quality.diversity * 0.3 +
    quality.recency * 0.2
  );
  
  if (confidence >= 0.8) {
    return '✅ **Haute confiance** (Sources multiples et fiables)';
  } else if (confidence >= 0.6) {
    return '🟡 **Confiance modérée** (Sources limitées ou variées)';
  } else if (confidence >= 0.4) {
    return '⚠️ **Confiance faible** (Peu de sources ou sources peu fiables)';
  } else {
    return '❌ **Très faible confiance** (Aucune source ou sources non vérifiées)';
  }
}

/**
 * Classe principale pour la gestion des sources
 */
export class SourceManager {
  private sources: Source[] = [];
  private citations: Citation[] = [];
  
  /**
   * Ajoute une source
   */
  addSource(source: Source): void {
    this.sources.push(source);
    logger.debug('SourceManager', 'Source added', {
      type: source.type,
      reliability: source.reliability,
    });
  }
  
  /**
   * Ajoute une citation
   */
  addCitation(sourceId: string, quotedText: string, relevance: number = 0.8): void {
    this.citations.push({
      sourceId,
      quotedText,
      relevance,
    });
  }
  
  /**
   * Obtient toutes les sources
   */
  getSources(): Source[] {
    return [...this.sources];
  }
  
  /**
   * Obtient les citations
   */
  getCitations(): Citation[] {
    return [...this.citations];
  }
  
  /**
   * Enrichit une réponse avec les sources
   */
  enrichResponse(response: string): string {
    let enriched = response;
    
    // Ajouter les marqueurs de citation
    if (this.citations.length > 0) {
      enriched = addCitationMarkers(enriched, this.citations, this.sources);
    }
    
    // Ajouter la section sources
    if (this.sources.length > 0) {
      enriched += formatSources(this.sources);
      enriched += '\n' + generateConfidenceBadge(this.sources);
    } else {
      // Ajouter un disclaimer si nécessaire
      enriched += generateDisclaimerIfNeeded(enriched, this.sources);
    }
    
    return enriched;
  }
  
  /**
   * Réinitialise le gestionnaire
   */
  reset(): void {
    this.sources = [];
    this.citations = [];
  }
  
  /**
   * Évalue la qualité globale des sources
   */
  evaluateQuality() {
    return evaluateSourceQuality(this.sources);
  }
}

// Export singleton
export const sourceManager = new SourceManager();
