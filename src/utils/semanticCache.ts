/**
 * Système de Cache Sémantique pour Questions Fréquentes
 * 
 * Utilise la similarité sémantique pour retrouver des réponses en cache,
 * même si la formulation est différente.
 * 
 * Caractéristiques :
 * - Cache basé sur la similarité (pas de correspondance exacte requise)
 * - Contexte conversationnel pour éviter les faux positifs
 * - TTL dynamique selon le type de question
 * - Stratégie LRU pour limiter la taille
 */

import { DebateQuality } from './debateQuality';
import { logger } from './logger';

export interface CachedResponse {
  query: string;
  queryEmbedding: number[];
  response: string;
  timestamp: number;
  hitCount: number;
  metadata: {
    mode?: string;
    agents?: string[];
    quality?: DebateQuality;
  };
  conversationContext: string[]; // Derniers messages pour contexte
  ttl: number; // Time to live en millisecondes
}

export interface CacheStats {
  size: number;
  totalHits: number;
  avgHitsPerEntry: number;
  hitRate: number;
  totalQueries: number;
}

/**
 * Calcule un embedding simple pour une chaîne de texte
 * (Version simplifiée - dans un vrai système, utiliser un modèle d'embeddings)
 */
function createSimpleEmbedding(text: string): number[] {
  const normalized = text.toLowerCase().trim();
  const words = normalized.split(/\s+/);
  
  // Créer un vecteur de 128 dimensions basé sur les mots
  const embedding = new Array(128).fill(0);
  
  words.forEach((word, index) => {
    // Hash simple pour répartir les mots dans l'espace vectoriel
    for (let i = 0; i < word.length; i++) {
      const charCode = word.charCodeAt(i);
      const dimension = (charCode + i + index) % 128;
      embedding[dimension] += 1 / (word.length + 1);
    }
  });
  
  // Normaliser le vecteur
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    return embedding.map(val => val / magnitude);
  }
  
  return embedding;
}

/**
 * Calcule la similarité cosinus entre deux vecteurs
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return 0;
  
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    magnitude1 += vec1[i] * vec1[i];
    magnitude2 += vec2[i] * vec2[i];
  }
  
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Calcule la similarité entre deux contextes conversationnels
 */
function calculateContextSimilarity(context1: string[], context2: string[]): number {
  if (context1.length === 0 && context2.length === 0) return 1;
  if (context1.length === 0 || context2.length === 0) return 0;
  
  // Calculer la similarité des derniers messages
  const maxLen = Math.min(context1.length, context2.length, 3); // Comparer les 3 derniers messages max
  let totalSimilarity = 0;
  
  for (let i = 0; i < maxLen; i++) {
    const idx1 = context1.length - 1 - i;
    const idx2 = context2.length - 1 - i;
    
    if (idx1 >= 0 && idx2 >= 0) {
      const embedding1 = createSimpleEmbedding(context1[idx1]);
      const embedding2 = createSimpleEmbedding(context2[idx2]);
      totalSimilarity += cosineSimilarity(embedding1, embedding2);
    }
  }
  
  return totalSimilarity / maxLen;
}

/**
 * Détermine le TTL dynamique selon le type de question
 */
function getDynamicTTL(query: string): number {
  const text = query.toLowerCase();
  
  // Questions temporelles - courte durée
  const temporalPatterns = [
    { pattern: /aujourd'hui|maintenant|actuellement|ce matin|ce soir/i, ttl: 1 * 60 * 60 * 1000 }, // 1h
    { pattern: /cette semaine|cette année/i, ttl: 24 * 60 * 60 * 1000 }, // 24h
    { pattern: /météo|cours|prix|bourse|bitcoin|crypto/i, ttl: 5 * 60 * 1000 }, // 5min
    { pattern: /actualité|news|dernier|récent/i, ttl: 30 * 60 * 1000 }, // 30min
  ];
  
  for (const { pattern, ttl } of temporalPatterns) {
    if (pattern.test(text)) {
      return ttl;
    }
  }
  
  // Questions statiques - longue durée
  const staticPatterns = [
    /comment|pourquoi|qu'est-ce|quelle est|définition|expliquer/i,
    /histoire|historique|origine/i,
    /théorie|concept|principe/i,
  ];
  
  for (const pattern of staticPatterns) {
    if (pattern.test(text)) {
      return 7 * 24 * 60 * 60 * 1000; // 7 jours
    }
  }
  
  // Par défaut : 24 heures
  return 24 * 60 * 60 * 1000;
}

/**
 * Classe de gestion du cache sémantique
 */
export class SemanticCache {
  private cache: CachedResponse[] = [];
  private readonly SIMILARITY_THRESHOLD = 0.85; // Très similaire (85%)
  private readonly CONTEXT_SIMILARITY_THRESHOLD = 0.7; // Contexte similaire (70%)
  private readonly MAX_CACHE_SIZE = 100;
  
  // Statistiques
  private totalQueries = 0;
  private totalHits = 0;
  
  /**
   * Rechercher une réponse en cache
   */
  async find(
    query: string,
    conversationContext: string[] = []
  ): Promise<CachedResponse | null> {
    this.totalQueries++;
    
    // Calculer l'embedding de la requête
    const queryEmbedding = createSimpleEmbedding(query);
    
    // Filtrer les entrées expirées
    const now = Date.now();
    this.cache = this.cache.filter(item => (now - item.timestamp) < item.ttl);
    
    // Chercher les requêtes similaires
    const candidates = this.cache
      .map(item => {
        const querySimilarity = cosineSimilarity(queryEmbedding, item.queryEmbedding);
        const contextSimilarity = calculateContextSimilarity(conversationContext, item.conversationContext);
        
        return {
          item,
          querySimilarity,
          contextSimilarity,
          score: querySimilarity * 0.7 + contextSimilarity * 0.3 // Pondération
        };
      })
      .filter(({ querySimilarity, contextSimilarity }) => 
        querySimilarity >= this.SIMILARITY_THRESHOLD && 
        contextSimilarity >= this.CONTEXT_SIMILARITY_THRESHOLD
      )
      .sort((a, b) => b.score - a.score);
    
    if (candidates.length === 0) {
      logger.debug('SemanticCache', 'Cache miss', { query: query.substring(0, 50) });
      return null;
    }
    
    const best = candidates[0];
    
    // Incrémenter le compteur de hits
    best.item.hitCount++;
    this.totalHits++;
    
    logger.debug('SemanticCache', 'Cache hit', {
      querySimilarity: (best.querySimilarity * 100).toFixed(1) + '%',
      contextSimilarity: (best.contextSimilarity * 100).toFixed(1) + '%',
      score: (best.score * 100).toFixed(1) + '%',
      originalQuery: best.item.query.substring(0, 50),
      currentQuery: query.substring(0, 50)
    });
    
    return best.item;
  }
  
  /**
   * Ajouter une réponse au cache
   */
  async add(
    query: string,
    response: string,
    conversationContext: string[] = [],
    metadata: CachedResponse['metadata'] = {}
  ): Promise<void> {
    const queryEmbedding = createSimpleEmbedding(query);
    const ttl = getDynamicTTL(query);
    
    const cached: CachedResponse = {
      query,
      queryEmbedding,
      response,
      timestamp: Date.now(),
      hitCount: 0,
      metadata,
      conversationContext: conversationContext.slice(-3), // Garder les 3 derniers messages
      ttl
    };
    
    this.cache.push(cached);
    
    // Appliquer LRU si dépassement de taille
    if (this.cache.length > this.MAX_CACHE_SIZE) {
      this.evictLeastValuable();
    }
    
    logger.debug('SemanticCache', 'Added to cache', {
      query: query.substring(0, 50),
      ttlMinutes: (ttl / 1000 / 60).toFixed(0)
    });
  }
  
  /**
   * Supprimer les entrées les moins précieuses (LRU + score)
   */
  private evictLeastValuable(): void {
    const now = Date.now();
    
    // Calculer un score de valeur pour chaque entrée
    const scored = this.cache.map(item => {
      const age = now - item.timestamp;
      const ageScore = 1 - Math.min(age / item.ttl, 1); // Plus récent = meilleur
      const hitScore = Math.min(item.hitCount / 10, 1); // Plus utilisé = meilleur
      const value = ageScore * 0.4 + hitScore * 0.6;
      
      return { item, value };
    });
    
    // Trier par valeur décroissante
    scored.sort((a, b) => b.value - a.value);
    
    // Garder seulement les MAX_CACHE_SIZE meilleures entrées
    this.cache = scored.slice(0, this.MAX_CACHE_SIZE).map(s => s.item);
    
    logger.debug('SemanticCache', 'Cache eviction', { evictedCount: scored.length - this.MAX_CACHE_SIZE });
  }
  
  /**
   * Invalider tout le cache
   */
  invalidate(): void {
    this.cache = [];
    logger.debug('SemanticCache', 'Cache invalidated');
  }
  
  /**
   * Invalider les entrées contenant certains mots-clés
   */
  invalidateByKeywords(keywords: string[]): void {
    const before = this.cache.length;
    this.cache = this.cache.filter(item => {
      const text = (item.query + ' ' + item.response).toLowerCase();
      return !keywords.some(keyword => text.includes(keyword.toLowerCase()));
    });
    logger.debug('SemanticCache', 'Entries invalidated', { count: before - this.cache.length });
  }
  
  /**
   * Obtenir des statistiques
   */
  getStats(): CacheStats {
    const totalHitsInCache = this.cache.reduce((sum, item) => sum + item.hitCount, 0);
    const hitRate = this.totalQueries > 0 ? this.totalHits / this.totalQueries : 0;
    
    return {
      size: this.cache.length,
      totalHits: totalHitsInCache,
      avgHitsPerEntry: this.cache.length > 0 ? totalHitsInCache / this.cache.length : 0,
      hitRate,
      totalQueries: this.totalQueries
    };
  }
  
  /**
   * Exporter le cache
   */
  export(): string {
    const data = {
      cache: this.cache,
      stats: {
        totalQueries: this.totalQueries,
        totalHits: this.totalHits
      },
      exportedAt: Date.now()
    };
    return JSON.stringify(data);
  }
  
  /**
   * Importer le cache
   */
  import(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      if (data.cache && Array.isArray(data.cache)) {
        this.cache = data.cache;
        this.totalQueries = data.stats?.totalQueries || 0;
        this.totalHits = data.stats?.totalHits || 0;
        logger.info('SemanticCache', 'Cache imported', { count: this.cache.length });
      }
    } catch (error) {
      console.error('[SemanticCache] Import failed:', error);
    }
  }
}

// Instance singleton
export const semanticCache = new SemanticCache();
