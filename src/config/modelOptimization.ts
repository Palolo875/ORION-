// src/config/modelOptimization.ts

/**
 * Configuration d'optimisation et quantization pour les modèles
 * 
 * STRATÉGIES:
 * 1. Quantization dynamique basée sur les capacités de l'appareil
 * 2. Lazy loading avec déchargement automatique
 * 3. Progressive loading pour une meilleure UX
 * 4. Compression et cache intelligent
 */

export interface QuantizationConfig {
  id: string;
  name: string;
  bits: 4 | 8 | 16 | 32;
  suffix: string;
  sizeReduction: number; // Pourcentage de réduction
  qualityImpact: 'none' | 'minimal' | 'moderate' | 'noticeable';
  minRAM: number; // GB
  description: string;
}

export const QUANTIZATION_LEVELS: Record<string, QuantizationConfig> = {
  q4: {
    id: 'q4',
    name: '4-bit quantization',
    bits: 4,
    suffix: 'q4f16_1',
    sizeReduction: 75, // 75% de réduction par rapport à float32
    qualityImpact: 'minimal',
    minRAM: 2,
    description: 'Compression maximale avec qualité acceptable',
  },
  q8: {
    id: 'q8',
    name: '8-bit quantization',
    bits: 8,
    suffix: 'q8f16_1',
    sizeReduction: 50,
    qualityImpact: 'none',
    minRAM: 4,
    description: 'Bon équilibre qualité/taille',
  },
  q16: {
    id: 'q16',
    name: '16-bit (half precision)',
    bits: 16,
    suffix: 'q16f16_1',
    sizeReduction: 25,
    qualityImpact: 'none',
    minRAM: 6,
    description: 'Haute qualité avec légère compression',
  },
  q32: {
    id: 'q32',
    name: '32-bit (full precision)',
    bits: 32,
    suffix: 'q32f32_1',
    sizeReduction: 0,
    qualityImpact: 'none',
    minRAM: 8,
    description: 'Qualité maximale, sans compression',
  },
};

export interface ModelOptimizationStrategy {
  useQuantization: boolean;
  quantizationLevel: keyof typeof QUANTIZATION_LEVELS;
  useLazyLoading: boolean;
  useProgressiveLoading: boolean;
  unloadAfterInactivity: boolean;
  inactivityTimeout: number; // ms
  useMemoryPressureDetection: boolean;
  maxConcurrentModels: number;
}

/**
 * Détermine la meilleure stratégie d'optimisation basée sur l'appareil
 */
export function getOptimizationStrategy(deviceRAM: number): ModelOptimizationStrategy {
  if (deviceRAM <= 2) {
    // Appareils avec peu de RAM: optimisation agressive
    return {
      useQuantization: true,
      quantizationLevel: 'q4',
      useLazyLoading: true,
      useProgressiveLoading: true,
      unloadAfterInactivity: true,
      inactivityTimeout: 60000, // 1 minute
      useMemoryPressureDetection: true,
      maxConcurrentModels: 1,
    };
  } else if (deviceRAM <= 4) {
    // Appareils moyens: optimisation équilibrée
    return {
      useQuantization: true,
      quantizationLevel: 'q4',
      useLazyLoading: true,
      useProgressiveLoading: true,
      unloadAfterInactivity: true,
      inactivityTimeout: 300000, // 5 minutes
      useMemoryPressureDetection: true,
      maxConcurrentModels: 2,
    };
  } else if (deviceRAM <= 8) {
    // Appareils performants: optimisation légère
    return {
      useQuantization: true,
      quantizationLevel: 'q8',
      useLazyLoading: true,
      useProgressiveLoading: false,
      unloadAfterInactivity: true,
      inactivityTimeout: 600000, // 10 minutes
      useMemoryPressureDetection: true,
      maxConcurrentModels: 3,
    };
  } else {
    // Appareils puissants: optimisation minimale
    return {
      useQuantization: false,
      quantizationLevel: 'q16',
      useLazyLoading: false,
      useProgressiveLoading: false,
      unloadAfterInactivity: false,
      inactivityTimeout: 0,
      useMemoryPressureDetection: false,
      maxConcurrentModels: 5,
    };
  }
}

/**
 * Applique la quantization à l'ID du modèle
 */
export function applyQuantization(modelId: string, level: keyof typeof QUANTIZATION_LEVELS): string {
  const config = QUANTIZATION_LEVELS[level];
  
  // Si le modèle a déjà un suffix de quantization, le remplacer
  const baseId = modelId.replace(/-q\d+f\d+_\d+(-MLC)?$/, '');
  
  return `${baseId}-${config.suffix}-MLC`;
}

/**
 * Détecte la pression mémoire
 */
export async function detectMemoryPressure(): Promise<{
  pressure: 'low' | 'medium' | 'high' | 'critical';
  availableMemory: number;
  usedMemory: number;
  totalMemory: number;
}> {
  // Utiliser l'API Performance Memory si disponible
  // @ts-expect-error - memory API non standard mais disponible dans Chrome
  if (performance.memory) {
    // @ts-expect-error - memory API
    const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
    
    const usageRatio = usedJSHeapSize / jsHeapSizeLimit;
    
    let pressure: 'low' | 'medium' | 'high' | 'critical';
    if (usageRatio > 0.9) pressure = 'critical';
    else if (usageRatio > 0.75) pressure = 'high';
    else if (usageRatio > 0.5) pressure = 'medium';
    else pressure = 'low';
    
    return {
      pressure,
      availableMemory: jsHeapSizeLimit - usedJSHeapSize,
      usedMemory: usedJSHeapSize,
      totalMemory: jsHeapSizeLimit,
    };
  }
  
  // Fallback: estimation basée sur les performances
  try {
    const startTime = performance.now();
    const arr = new Array(10000000).fill(0); // 10M éléments
    const allocTime = performance.now() - startTime;
    arr.length = 0; // Libérer
    
    let pressure: 'low' | 'medium' | 'high' | 'critical';
    if (allocTime > 500) pressure = 'critical';
    else if (allocTime > 200) pressure = 'high';
    else if (allocTime > 100) pressure = 'medium';
    else pressure = 'low';
    
    return {
      pressure,
      availableMemory: 0,
      usedMemory: 0,
      totalMemory: 0,
    };
  } catch {
    return {
      pressure: 'critical',
      availableMemory: 0,
      usedMemory: 0,
      totalMemory: 0,
    };
  }
}

/**
 * Gère le déchargement automatique des modèles
 */
export class ModelUnloadManager {
  private modelLastUsed = new Map<string, number>();
  private checkInterval: number | null = null;
  private strategy: ModelOptimizationStrategy;

  constructor(strategy: ModelOptimizationStrategy) {
    this.strategy = strategy;
    
    if (strategy.unloadAfterInactivity) {
      this.startMonitoring();
    }
  }

  markModelUsed(modelId: string) {
    this.modelLastUsed.set(modelId, Date.now());
  }

  private startMonitoring() {
    // Vérifier toutes les minutes
    this.checkInterval = window.setInterval(() => {
      this.checkInactiveModels();
    }, 60000);
  }

  private async checkInactiveModels() {
    const now = Date.now();
    const modelsToUnload: string[] = [];

    for (const [modelId, lastUsed] of this.modelLastUsed.entries()) {
      if (now - lastUsed > this.strategy.inactivityTimeout) {
        modelsToUnload.push(modelId);
      }
    }

    if (modelsToUnload.length > 0) {
      console.log('[ModelUnloadManager] Déchargement des modèles inactifs:', modelsToUnload);
      
      // Émettre un événement pour le déchargement
      window.dispatchEvent(new CustomEvent('models:unload', {
        detail: { modelIds: modelsToUnload }
      }));

      // Supprimer de la liste
      modelsToUnload.forEach(id => this.modelLastUsed.delete(id));
    }
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

/**
 * Calcule la taille optimale du modèle après quantization
 */
export function calculateOptimizedSize(
  originalSize: number,
  quantizationLevel: keyof typeof QUANTIZATION_LEVELS
): number {
  const config = QUANTIZATION_LEVELS[quantizationLevel];
  return originalSize * (1 - config.sizeReduction / 100);
}

/**
 * Formate les octets en string lisible
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
