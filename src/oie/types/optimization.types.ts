/**
 * Types pour les stratégies d'optimisation des agents
 * Implémente quantification agressive, sharding et chargement progressif
 */

/**
 * Niveaux de quantification disponibles pour les modèles
 * q4 = 4 bits (standard, bonne qualité)
 * q3 = 3 bits (agressif, compromis qualité/taille)
 * q2 = 2 bits (très agressif, pour modèles simples)
 */
export type QuantizationLevel = 'q4' | 'q3' | 'q2';

/**
 * Stratégie de chargement d'un agent
 */
export type LoadingStrategy = 
  | 'immediate'        // Chargement immédiat au démarrage (ex: NeuralRouter)
  | 'on_demand'        // Chargement à la demande (standard)
  | 'progressive'      // Chargement progressif avec sharding
  | 'complete_on_use'; // Chargement complet lors de la première utilisation

/**
 * Configuration de sharding pour le chargement progressif
 */
export interface ShardingConfig {
  enabled: boolean;
  /**
   * Nombre de shards (morceaux) dans lesquels diviser le modèle
   * Recommandé: 4-8 shards pour les modèles >1GB
   */
  numShards?: number;
  /**
   * Shards à charger initialement pour un "Time To First Token" rapide
   * Les autres shards sont chargés en arrière-plan
   */
  initialShards?: number;
  /**
   * Appliquer le sharding uniquement sur certaines parties du modèle
   * Par exemple: pour LLaVA, sharder seulement le LLM, pas l'encodeur d'images
   */
  partialSharding?: {
    enabled: boolean;
    targetComponents?: string[]; // ex: ['llm', 'decoder']
  };
}

/**
 * Configuration d'optimisation pour un agent
 */
export interface AgentOptimizationConfig {
  /**
   * Niveau de quantification à utiliser
   */
  quantization: QuantizationLevel;
  
  /**
   * Stratégie de chargement
   */
  loadingStrategy: LoadingStrategy;
  
  /**
   * Configuration de sharding (optionnel)
   */
  sharding?: ShardingConfig;
  
  /**
   * Taille estimée du modèle en MB après optimisations
   */
  optimizedSize: number;
  
  /**
   * Taille originale du modèle en MB (avant optimisation)
   */
  originalSize: number;
  
  /**
   * Callbacks pour suivre la progression du chargement
   */
  progressCallbacks?: {
    onShardLoaded?: (shardIndex: number, totalShards: number) => void;
    onProgress?: (progress: number, message: string) => void;
  };
}

/**
 * Statistiques de chargement d'un modèle
 */
export interface LoadingStats {
  /**
   * Temps de chargement total en ms
   */
  totalTime: number;
  
  /**
   * Time To First Token (TTFT) - temps avant que le modèle soit utilisable
   */
  timeToFirstToken?: number;
  
  /**
   * Nombre de shards chargés
   */
  shardsLoaded?: number;
  
  /**
   * Taille totale téléchargée en MB
   */
  downloadedSizeMB: number;
  
  /**
   * Vitesse de téléchargement moyenne en MB/s
   */
  downloadSpeedMBps?: number;
  
  /**
   * Chargement depuis le cache ou téléchargement
   */
  fromCache: boolean;
}

/**
 * Configuration optimale par type d'agent selon le document
 */
export const OPTIMIZATION_PRESETS: Record<string, AgentOptimizationConfig> = {
  'neural-router': {
    quantization: 'q4',
    loadingStrategy: 'immediate',
    optimizedSize: 95,
    originalSize: 95,
    sharding: {
      enabled: false,
    }
  },
  
  'conversation-agent': {
    quantization: 'q3', // Peut tester q2 pour réduire davantage
    loadingStrategy: 'progressive',
    optimizedSize: 1200, // ~1.2 Go avec q3 (réduit de 1.8 Go)
    originalSize: 1800,
    sharding: {
      enabled: true,
      numShards: 6,
      initialShards: 2, // 2 shards = ~400 MB pour démarrage rapide
    }
  },
  
  'code-agent': {
    quantization: 'q3',
    loadingStrategy: 'progressive',
    optimizedSize: 800, // ~800 Mo avec q3 (réduit de 1.1 Go)
    originalSize: 1100,
    sharding: {
      enabled: true,
      numShards: 4,
      initialShards: 2,
    }
  },
  
  'vision-agent': {
    quantization: 'q3', // Prudent - validation visuelle nécessaire
    loadingStrategy: 'complete_on_use',
    optimizedSize: 3000, // ~3 Go avec q3 prudente (réduit de 4 Go)
    originalSize: 4000,
    sharding: {
      enabled: true,
      partialSharding: {
        enabled: true,
        targetComponents: ['llm'], // Sharder uniquement le LLM, pas l'encodeur d'images
      },
      numShards: 4,
      initialShards: 1, // Encodeur complet d'abord
    }
  },
  
  'image-generation-agent': {
    quantization: 'q4', // Pas d'optimisation agressive - modèles de diffusion sensibles
    loadingStrategy: 'complete_on_use',
    optimizedSize: 1300,
    originalSize: 1300,
    sharding: {
      enabled: false, // Le UNet nécessite un accès complet
    }
  },
  
  'multilingual-agent': {
    quantization: 'q3', // Peut tester q2
    loadingStrategy: 'progressive',
    optimizedSize: 600, // ~600 Mo avec q3 (réduit de 800 Mo)
    originalSize: 800,
    sharding: {
      enabled: true,
      numShards: 4,
      initialShards: 2,
    }
  },
};

/**
 * Métadonnées de progression du chargement
 */
export interface LoadingProgress {
  /**
   * Progression globale (0-1)
   */
  progress: number;
  
  /**
   * Message de statut
   */
  message: string;
  
  /**
   * Phase actuelle du chargement
   */
  phase: 'downloading' | 'initializing' | 'loading_shard' | 'ready';
  
  /**
   * Shard en cours de chargement (si applicable)
   */
  currentShard?: number;
  
  /**
   * Total de shards (si applicable)
   */
  totalShards?: number;
  
  /**
   * Estimation du temps restant en secondes
   */
  estimatedTimeRemaining?: number;
}
