/**
 * Hook React pour utiliser l'Orion Inference Engine (OIE)
 * Gère l'initialisation, l'état et les requêtes vers le moteur
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { OrionInferenceEngine, AgentOutput, InferOptions } from '@/oie';

export interface UseOIEResult {
  isReady: boolean;
  isProcessing: boolean;
  error: string | null;
  ask: (query: string, options?: InferOptions) => Promise<AgentOutput>;
  getStats: () => unknown;
  shutdown: () => Promise<void>;
  availableAgents: string[];
}

export interface UseOIEConfig {
  maxMemoryMB?: number;
  maxAgentsInMemory?: number;
  enableVision?: boolean;
  enableCode?: boolean;
  autoInit?: boolean; // Auto-initialiser au montage
}

export function useOIE(config: UseOIEConfig = {}): UseOIEResult {
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableAgents, setAvailableAgents] = useState<string[]>([]);
  
  const engineRef = useRef<OrionInferenceEngine | null>(null);
  
  // Initialiser au montage si autoInit est activé
  useEffect(() => {
    const autoInit = config.autoInit !== false; // Par défaut true
    
    if (!autoInit) {
      return;
    }
    
    const init = async () => {
      try {
        console.log('[useOIE] Initialisation automatique du moteur OIE...');
        
        const engine = new OrionInferenceEngine({
          maxMemoryMB: config.maxMemoryMB || 8000,
          maxAgentsInMemory: config.maxAgentsInMemory || 2,
          enableVision: config.enableVision ?? true,
          enableCode: config.enableCode ?? true,
        });
        
        await engine.initialize();
        engineRef.current = engine;
        
        setAvailableAgents(engine.getAvailableAgents());
        setIsReady(true);
        setError(null);
        
        console.log('[useOIE] ✅ Moteur OIE initialisé');
        
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur d\'initialisation du moteur OIE';
        console.error('[useOIE] ❌ Erreur d\'initialisation:', err);
        setError(errorMessage);
        setIsReady(false);
      }
    };
    
    init();
    
    // Cleanup au démontage
    return () => {
      if (engineRef.current) {
        console.log('[useOIE] Nettoyage - arrêt du moteur');
        engineRef.current.shutdown().catch(err => {
          console.error('[useOIE] Erreur lors de l\'arrêt:', err);
        });
      }
    };
  }, [config.maxMemoryMB, config.maxAgentsInMemory, config.enableVision, config.enableCode, config.autoInit]);
  
  // Fonction pour envoyer une requête
  const ask = useCallback(async (
    query: string,
    options?: InferOptions
  ): Promise<AgentOutput> => {
    if (!engineRef.current || !isReady) {
      throw new Error('OIE non prêt. Le moteur doit être initialisé.');
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await engineRef.current.infer(query, options);
      return response;
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du traitement de la requête';
      console.error('[useOIE] Erreur:', errorMessage);
      setError(errorMessage);
      throw err;
      
    } finally {
      setIsProcessing(false);
    }
  }, [isReady]);
  
  // Fonction pour obtenir les statistiques
  const getStats = useCallback(() => {
    if (!engineRef.current) {
      return null;
    }
    return engineRef.current.getStats();
  }, []);
  
  // Fonction pour arrêter le moteur manuellement
  const shutdown = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.shutdown();
      engineRef.current = null;
      setIsReady(false);
      setAvailableAgents([]);
    }
  }, []);
  
  return {
    isReady,
    isProcessing,
    error,
    ask,
    getStats,
    shutdown,
    availableAgents,
  };
}
