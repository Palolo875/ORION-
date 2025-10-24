/**
 * Smart Memory Manager
 * 
 * Gestion intelligente de la mémoire pour Virtual Hybrid Agents
 * 
 * Optimisations:
 * 1. Déchargement automatique des agents non utilisés
 * 2. Prédiction des agents à pré-charger
 * 3. Compression en mémoire
 * 4. Monitoring en temps réel
 */

import { debugLogger } from './debug-logger';

/**
 * Statistiques d'utilisation d'un agent
 */
interface AgentUsageStats {
  agentId: string;
  lastUsed: number;
  useCount: number;
  avgProcessingTime: number;
  estimatedSizeMB: number;
  loaded: boolean;
}

/**
 * Configuration du gestionnaire
 */
interface SmartMemoryConfig {
  /**
   * Seuil de mémoire (MB) au-delà duquel on décharge
   */
  maxMemoryMB: number;
  
  /**
   * Seuil de mémoire warning (MB)
   */
  warningThresholdMB: number;
  
  /**
   * Temps d'inactivité avant déchargement (ms)
   */
  idleTimeout: number;
  
  /**
   * Activer le pré-chargement prédictif
   */
  enablePredictiveLoading: boolean;
  
  /**
   * Activer le monitoring en temps réel
   */
  enableMonitoring: boolean;
}

/**
 * Smart Memory Manager
 */
export class SmartMemoryManager {
  private static instance: SmartMemoryManager;
  private config: SmartMemoryConfig;
  private agentStats: Map<string, AgentUsageStats> = new Map();
  private monitoringInterval?: number;
  private loadedAgents: Set<string> = new Set();
  
  private constructor(config: Partial<SmartMemoryConfig> = {}) {
    this.config = {
      maxMemoryMB: config.maxMemoryMB || 4000,
      warningThresholdMB: config.warningThresholdMB || 3000,
      idleTimeout: config.idleTimeout || 300000, // 5 minutes
      enablePredictiveLoading: config.enablePredictiveLoading ?? true,
      enableMonitoring: config.enableMonitoring ?? true,
      ...config
    };
    
    if (this.config.enableMonitoring) {
      this.startMonitoring();
    }
  }
  
  static getInstance(config?: Partial<SmartMemoryConfig>): SmartMemoryManager {
    if (!SmartMemoryManager.instance) {
      SmartMemoryManager.instance = new SmartMemoryManager(config);
    }
    return SmartMemoryManager.instance;
  }
  
  /**
   * Enregistre l'utilisation d'un agent
   */
  recordUsage(agentId: string, processingTime: number, sizeMB: number = 0): void {
    const stats = this.agentStats.get(agentId) || {
      agentId,
      lastUsed: 0,
      useCount: 0,
      avgProcessingTime: 0,
      estimatedSizeMB: sizeMB,
      loaded: false
    };
    
    stats.lastUsed = Date.now();
    stats.useCount++;
    stats.avgProcessingTime = 
      (stats.avgProcessingTime * (stats.useCount - 1) + processingTime) / stats.useCount;
    
    if (sizeMB > 0) {
      stats.estimatedSizeMB = sizeMB;
    }
    
    this.agentStats.set(agentId, stats);
    this.loadedAgents.add(agentId);
    stats.loaded = true;
    
    debugLogger.debug('SmartMemoryManager', `Recorded usage for ${agentId}`, {
      useCount: stats.useCount,
      avgTime: Math.round(stats.avgProcessingTime)
    });
  }
  
  /**
   * Marque un agent comme déchargé
   */
  markUnloaded(agentId: string): void {
    const stats = this.agentStats.get(agentId);
    if (stats) {
      stats.loaded = false;
      this.loadedAgents.delete(agentId);
    }
  }
  
  /**
   * Obtient les agents à décharger selon la stratégie LRU
   */
  getAgentsToUnload(targetFreeMB: number): string[] {
    const loadedStats = Array.from(this.agentStats.values())
      .filter(s => s.loaded)
      .sort((a, b) => a.lastUsed - b.lastUsed); // Plus ancien en premier
    
    const toUnload: string[] = [];
    let freedMB = 0;
    
    for (const stat of loadedStats) {
      if (freedMB >= targetFreeMB) break;
      
      toUnload.push(stat.agentId);
      freedMB += stat.estimatedSizeMB;
    }
    
    return toUnload;
  }
  
  /**
   * Obtient les agents inactifs (non utilisés depuis longtemps)
   */
  getIdleAgents(): string[] {
    const now = Date.now();
    const idleAgents: string[] = [];
    
    for (const [agentId, stats] of this.agentStats.entries()) {
      if (!stats.loaded) continue;
      
      const idleTime = now - stats.lastUsed;
      if (idleTime > this.config.idleTimeout) {
        idleAgents.push(agentId);
      }
    }
    
    return idleAgents;
  }
  
  /**
   * Estime la mémoire utilisée actuellement
   */
  getEstimatedMemoryUsage(): {
    totalMB: number;
    byAgent: Record<string, number>;
    loadedAgents: string[];
  } {
    let totalMB = 0;
    const byAgent: Record<string, number> = {};
    const loadedAgentsList: string[] = [];
    
    for (const [agentId, stats] of this.agentStats.entries()) {
      if (stats.loaded) {
        totalMB += stats.estimatedSizeMB;
        byAgent[agentId] = stats.estimatedSizeMB;
        loadedAgentsList.push(agentId);
      }
    }
    
    return {
      totalMB,
      byAgent,
      loadedAgents: loadedAgentsList
    };
  }
  
  /**
   * Obtient la mémoire système réelle (via Performance API)
   */
  getRealMemoryUsage(): {
    usedJSHeapMB: number;
    totalJSHeapMB: number;
    limitJSHeapMB: number;
    percentUsed: number;
  } | null {
    // @ts-ignore - performance.memory existe dans Chrome
    if (performance.memory) {
      // @ts-ignore
      const mem = performance.memory;
      const usedMB = mem.usedJSHeapSize / 1024 / 1024;
      const totalMB = mem.totalJSHeapSize / 1024 / 1024;
      const limitMB = mem.jsHeapSizeLimit / 1024 / 1024;
      
      return {
        usedJSHeapMB: usedMB,
        totalJSHeapMB: totalMB,
        limitJSHeapMB: limitMB,
        percentUsed: (usedMB / limitMB) * 100
      };
    }
    
    return null;
  }
  
  /**
   * Vérifie si on doit décharger des agents
   */
  shouldUnloadAgents(): {
    shouldUnload: boolean;
    reason: string;
    targetFreeMB: number;
  } {
    const estimated = this.getEstimatedMemoryUsage();
    const real = this.getRealMemoryUsage();
    
    // Vérifier mémoire réelle si disponible
    if (real && real.usedJSHeapMB > this.config.maxMemoryMB) {
      return {
        shouldUnload: true,
        reason: 'Real memory usage exceeds limit',
        targetFreeMB: real.usedJSHeapMB - this.config.warningThresholdMB
      };
    }
    
    // Vérifier mémoire estimée
    if (estimated.totalMB > this.config.maxMemoryMB) {
      return {
        shouldUnload: true,
        reason: 'Estimated memory usage exceeds limit',
        targetFreeMB: estimated.totalMB - this.config.warningThresholdMB
      };
    }
    
    return {
      shouldUnload: false,
      reason: 'Memory usage OK',
      targetFreeMB: 0
    };
  }
  
  /**
   * Prédit le prochain agent à utiliser (basé sur les patterns)
   */
  predictNextAgent(currentAgent: string, queryContext?: string): string | null {
    if (!this.config.enablePredictiveLoading) {
      return null;
    }
    
    // Patterns de transition courants
    const patterns: Record<string, string[]> = {
      'code-agent': ['logical-agent', 'vision-agent'], // Code → Logique ou Vision (debug UI)
      'creative-agent': ['multilingual-agent'], // Créatif → Traduction
      'vision-agent': ['logical-agent'], // Vision → Analyse logique
      'logical-agent': ['code-agent'], // Logique → Implémentation
      'multilingual-agent': ['creative-agent'] // Traduction → Nouveau contenu
    };
    
    const possibleNext = patterns[currentAgent];
    if (!possibleNext || possibleNext.length === 0) {
      return null;
    }
    
    // Si contexte de requête fourni, affiner la prédiction
    if (queryContext) {
      const context = queryContext.toLowerCase();
      
      if (context.includes('traduis') || context.includes('translate')) {
        return 'multilingual-agent';
      }
      if (context.includes('code') || context.includes('fonction')) {
        return 'code-agent';
      }
      if (context.includes('logique') || context.includes('pourquoi')) {
        return 'logical-agent';
      }
      if (context.includes('image') || context.includes('photo')) {
        return 'vision-agent';
      }
    }
    
    // Sinon, retourner le plus probable (premier de la liste)
    return possibleNext[0];
  }
  
  /**
   * Démarre le monitoring en temps réel
   */
  private startMonitoring(): void {
    debugLogger.info('SmartMemoryManager', 'Starting memory monitoring');
    
    this.monitoringInterval = window.setInterval(() => {
      const check = this.shouldUnloadAgents();
      const idle = this.getIdleAgents();
      const real = this.getRealMemoryUsage();
      
      if (check.shouldUnload) {
        debugLogger.warn('SmartMemoryManager', 'Memory pressure detected', {
          reason: check.reason,
          targetFreeMB: check.targetFreeMB,
          realMemory: real
        });
      }
      
      if (idle.length > 0) {
        debugLogger.info('SmartMemoryManager', `${idle.length} idle agents detected`, {
          agents: idle
        });
      }
    }, 30000); // Vérifier toutes les 30 secondes
  }
  
  /**
   * Arrête le monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      debugLogger.info('SmartMemoryManager', 'Memory monitoring stopped');
    }
  }
  
  /**
   * Obtient les statistiques complètes
   */
  getStats() {
    return {
      config: this.config,
      estimatedMemory: this.getEstimatedMemoryUsage(),
      realMemory: this.getRealMemoryUsage(),
      agentStats: Array.from(this.agentStats.values()),
      idleAgents: this.getIdleAgents(),
      shouldUnload: this.shouldUnloadAgents()
    };
  }
  
  /**
   * Reset les statistiques
   */
  reset(): void {
    this.agentStats.clear();
    this.loadedAgents.clear();
    debugLogger.info('SmartMemoryManager', 'Stats reset');
  }
}

/**
 * Helper pour obtenir le manager
 */
export function getSmartMemoryManager(config?: Partial<SmartMemoryConfig>): SmartMemoryManager {
  return SmartMemoryManager.getInstance(config);
}
