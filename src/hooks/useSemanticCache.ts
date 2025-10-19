import { useCallback, useRef } from 'react';
import { semanticCache } from '@/utils/semanticCache';
import { DebateQuality } from '@/utils/debateQuality';

export interface UseCacheOptions {
  enabled?: boolean;
  onCacheHit?: (query: string, response: string) => void;
  onCacheMiss?: (query: string) => void;
}

/**
 * Hook pour gérer le cache sémantique des réponses
 */
export function useSemanticCache(options: UseCacheOptions = {}) {
  const { enabled = true, onCacheHit, onCacheMiss } = options;
  const cacheRef = useRef(semanticCache);

  /**
   * Rechercher une réponse en cache
   */
  const findInCache = useCallback(
    async (query: string, conversationContext: string[] = []) => {
      if (!enabled) return null;

      try {
        const cached = await cacheRef.current.find(query, conversationContext);
        
        if (cached) {
          onCacheHit?.(query, cached.response);
          console.log('[useSemanticCache] Cache hit!', {
            query: query.substring(0, 50),
            cachedQuery: cached.query.substring(0, 50),
            hitCount: cached.hitCount
          });
        } else {
          onCacheMiss?.(query);
        }
        
        return cached;
      } catch (error) {
        console.error('[useSemanticCache] Error finding in cache:', error);
        return null;
      }
    },
    [enabled, onCacheHit, onCacheMiss]
  );

  /**
   * Ajouter une réponse au cache
   */
  const addToCache = useCallback(
    async (
      query: string,
      response: string,
      conversationContext: string[] = [],
      metadata?: {
        mode?: string;
        agents?: string[];
        quality?: DebateQuality;
      }
    ) => {
      if (!enabled) return;

      try {
        await cacheRef.current.add(query, response, conversationContext, metadata);
        console.log('[useSemanticCache] Added to cache:', query.substring(0, 50));
      } catch (error) {
        console.error('[useSemanticCache] Error adding to cache:', error);
      }
    },
    [enabled]
  );

  /**
   * Invalider tout le cache
   */
  const invalidateCache = useCallback(() => {
    cacheRef.current.invalidate();
    console.log('[useSemanticCache] Cache invalidated');
  }, []);

  /**
   * Invalider les entrées par mots-clés
   */
  const invalidateByKeywords = useCallback((keywords: string[]) => {
    cacheRef.current.invalidateByKeywords(keywords);
  }, []);

  /**
   * Obtenir les statistiques du cache
   */
  const getCacheStats = useCallback(() => {
    return cacheRef.current.getStats();
  }, []);

  /**
   * Exporter le cache
   */
  const exportCache = useCallback(() => {
    return cacheRef.current.export();
  }, []);

  /**
   * Importer le cache
   */
  const importCache = useCallback((jsonData: string) => {
    cacheRef.current.import(jsonData);
  }, []);

  return {
    findInCache,
    addToCache,
    invalidateCache,
    invalidateByKeywords,
    getCacheStats,
    exportCache,
    importCache
  };
}
