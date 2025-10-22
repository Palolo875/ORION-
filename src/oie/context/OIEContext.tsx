/**
 * Context React pour l'Orion Inference Engine
 * Fournit une instance unique de l'OIE à toute l'application
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OrionInferenceEngine, AgentOutput, InferOptions } from '../core/engine';

interface OIEContextType {
  engine: OrionInferenceEngine | null;
  isReady: boolean;
  isProcessing: boolean;
  error: string | null;
  infer: (query: string, options?: InferOptions) => Promise<AgentOutput>;
  getStats: () => any;
  availableAgents: string[];
}

const OIEContext = createContext<OIEContextType | undefined>(undefined);

interface OIEProviderProps {
  children: ReactNode;
  config?: {
    maxMemoryMB?: number;
    maxAgentsInMemory?: number;
    enableVision?: boolean;
    enableCode?: boolean;
    autoInit?: boolean;
  };
}

export function OIEProvider({ children, config = {} }: OIEProviderProps) {
  const [engine, setEngine] = useState<OrionInferenceEngine | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableAgents, setAvailableAgents] = useState<string[]>([]);
  
  // Initialisation de l'engine
  useEffect(() => {
    const autoInit = config.autoInit !== false;
    
    if (!autoInit) {
      return;
    }
    
    const initEngine = async () => {
      try {
        console.log('[OIEContext] Initialisation du moteur...');
        
        const oie = new OrionInferenceEngine({
          maxMemoryMB: config.maxMemoryMB || 8000,
          maxAgentsInMemory: config.maxAgentsInMemory || 2,
          enableVision: config.enableVision ?? true,
          enableCode: config.enableCode ?? true,
        });
        
        await oie.initialize();
        
        setEngine(oie);
        setAvailableAgents(oie.getAvailableAgents());
        setIsReady(true);
        setError(null);
        
        console.log('[OIEContext] ✅ Moteur prêt');
        
      } catch (err: any) {
        console.error('[OIEContext] ❌ Erreur d\'initialisation:', err);
        setError(err.message || 'Erreur d\'initialisation');
        setIsReady(false);
      }
    };
    
    initEngine();
    
    // Cleanup
    return () => {
      if (engine) {
        console.log('[OIEContext] Arrêt du moteur');
        engine.shutdown().catch(err => {
          console.error('[OIEContext] Erreur lors de l\'arrêt:', err);
        });
      }
    };
  }, [config.maxMemoryMB, config.maxAgentsInMemory, config.enableVision, config.enableCode, config.autoInit]);
  
  // Fonction infer
  const infer = async (query: string, options?: InferOptions): Promise<AgentOutput> => {
    if (!engine || !isReady) {
      throw new Error('OIE non prêt');
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await engine.infer(query, options);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du traitement';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Fonction getStats
  const getStats = () => {
    if (!engine) return null;
    return engine.getStats();
  };
  
  const contextValue: OIEContextType = {
    engine,
    isReady,
    isProcessing,
    error,
    infer,
    getStats,
    availableAgents,
  };
  
  return (
    <OIEContext.Provider value={contextValue}>
      {children}
    </OIEContext.Provider>
  );
}

/**
 * Hook pour utiliser le contexte OIE
 */
export function useOIEContext(): OIEContextType {
  const context = useContext(OIEContext);
  
  if (!context) {
    throw new Error('useOIEContext doit être utilisé à l\'intérieur de OIEProvider');
  }
  
  return context;
}
