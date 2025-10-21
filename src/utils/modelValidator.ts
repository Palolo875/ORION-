/**
 * Validation et vérification des capacités avant téléchargement de modèles
 * Prévient les crashs et problèmes de mémoire/stockage
 */

import { ModelConfig } from '@/config/models';
import { logger } from './logger';

export interface ValidationResult {
  canLoad: boolean;
  warnings: string[];
  errors: string[];
  recommendations: string[];
  estimatedLoadTime: number; // en secondes
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceInfo {
  ram: number; // GB
  availableStorage: number; // bytes
  usedStorage: number; // bytes
  totalStorage: number; // bytes
  gpu: string | null;
  webgpu: boolean;
  cores: number;
}

/**
 * Obtient les informations sur l'appareil
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  const info: DeviceInfo = {
    // @ts-expect-error - deviceMemory est une extension Chrome/Edge
    ram: navigator.deviceMemory || estimateRAM(),
    availableStorage: 0,
    usedStorage: 0,
    totalStorage: 0,
    gpu: await detectGPU(),
    webgpu: await checkWebGPU(),
    cores: navigator.hardwareConcurrency || 4,
  };

  // Obtenir les infos de stockage
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      info.totalStorage = estimate.quota || 0;
      info.usedStorage = estimate.usage || 0;
      info.availableStorage = info.totalStorage - info.usedStorage;
    } catch (error) {
      logger.warn('ModelValidator', 'Impossible d\'obtenir les infos de stockage', error);
    }
  }

  return info;
}

/**
 * Estime la RAM disponible sur l'appareil
 */
function estimateRAM(): number {
  const start = performance.now();
  const arr = new Array(1000000).fill(0);
  const end = performance.now();
  arr.length = 0;

  if (end - start < 50) return 8;
  if (end - start < 100) return 4;
  return 2;
}

/**
 * Détecte le GPU de l'appareil
 */
async function detectGPU(): Promise<string | null> {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return null;
    
    // @ts-expect-error - WEBGL_debug_renderer_info extension
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      // @ts-expect-error - UNMASKED_RENDERER_WEBGL constant
      return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    }
  } catch (error) {
    logger.warn('ModelValidator', 'Erreur détection GPU', error);
  }
  
  return null;
}

/**
 * Vérifie le support WebGPU
 */
async function checkWebGPU(): Promise<boolean> {
  try {
    // @ts-expect-error - WebGPU API
    if (!navigator.gpu) return false;
    // @ts-expect-error - WebGPU API
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch (e) {
    return false;
  }
}

/**
 * Valide si un modèle peut être chargé en toute sécurité
 */
export async function validateModelLoad(model: ModelConfig): Promise<ValidationResult> {
  const device = await getDeviceInfo();
  const result: ValidationResult = {
    canLoad: true,
    warnings: [],
    errors: [],
    recommendations: [],
    estimatedLoadTime: 0,
    riskLevel: 'low',
  };

  // 1. Vérifier la RAM
  if (device.ram < model.minRAM) {
    result.canLoad = false;
    result.errors.push(
      `⚠️ RAM insuffisante: ${device.ram}GB disponible, ${model.minRAM}GB requis`
    );
    result.riskLevel = 'critical';
  } else if (device.ram === model.minRAM) {
    result.warnings.push(
      `⚠️ RAM juste suffisante (${device.ram}GB). Des ralentissements sont possibles.`
    );
    result.riskLevel = 'high';
  } else if (device.ram < model.minRAM + 2) {
    result.warnings.push(
      `💡 RAM limitée (${device.ram}GB). Fermez les autres applications pour de meilleures performances.`
    );
    result.riskLevel = result.riskLevel === 'low' ? 'medium' : result.riskLevel;
  }

  // 2. Vérifier le stockage disponible
  if (device.availableStorage > 0) {
    const requiredSpace = model.size * 1.5; // Marge de sécurité 50%
    
    if (device.availableStorage < model.size) {
      result.canLoad = false;
      result.errors.push(
        `💾 Stockage insuffisant: ${formatBytes(device.availableStorage)} disponible, ${formatBytes(model.size)} requis`
      );
      result.riskLevel = 'critical';
    } else if (device.availableStorage < requiredSpace) {
      result.warnings.push(
        `💾 Stockage limité: ${formatBytes(device.availableStorage)} disponible. Libérez de l'espace.`
      );
      result.riskLevel = result.riskLevel === 'low' ? 'medium' : result.riskLevel;
    }

    // Calcul du pourcentage d'utilisation du stockage
    const usagePercent = (device.usedStorage / device.totalStorage) * 100;
    if (usagePercent > 80) {
      result.warnings.push(
        `💾 Stockage à ${usagePercent.toFixed(0)}% de capacité. Nettoyez le cache.`
      );
    }
  }

  // 3. Vérifier WebGPU pour les modèles lourds
  if (model.size > 2 * 1024 * 1024 * 1024 && !device.webgpu) {
    result.warnings.push(
      `⚡ WebGPU non disponible. Les performances seront réduites avec ce modèle.`
    );
    result.riskLevel = result.riskLevel === 'low' ? 'medium' : result.riskLevel;
  }

  // 4. Vérifier GPU si spécifié
  if (model.minGPU && !device.gpu) {
    result.warnings.push(
      `🎮 GPU non détecté. Recommandation: ${model.minGPU}`
    );
  }

  // 5. Calculer le temps de téléchargement estimé
  // Hypothèse: 10 MB/s (connexion moyenne)
  const downloadSpeed = 10 * 1024 * 1024; // 10 MB/s
  result.estimatedLoadTime = Math.ceil(model.size / downloadSpeed);

  if (result.estimatedLoadTime > 300) { // > 5 minutes
    result.warnings.push(
      `⏱️ Téléchargement long estimé: ~${Math.ceil(result.estimatedLoadTime / 60)} minutes`
    );
  }

  // 6. Recommandations
  if (result.warnings.length > 0 || result.errors.length > 0) {
    result.recommendations = generateRecommendations(model, device, result);
  }

  // 7. Log de la validation
  logger.info('ModelValidator', 'Validation du modèle', {
    model: model.name,
    canLoad: result.canLoad,
    riskLevel: result.riskLevel,
    warnings: result.warnings.length,
    errors: result.errors.length,
  });

  return result;
}

/**
 * Génère des recommandations basées sur la validation
 */
function generateRecommendations(
  model: ModelConfig,
  device: DeviceInfo,
  result: ValidationResult
): string[] {
  const recommendations: string[] = [];

  // Si RAM insuffisante
  if (device.ram < model.minRAM) {
    recommendations.push('🔄 Choisissez un modèle plus léger adapté à votre appareil');
    recommendations.push('💻 Fermez toutes les applications gourmandes en mémoire');
    recommendations.push('🔄 Redémarrez votre navigateur pour libérer la mémoire');
  }

  // Si stockage insuffisant
  if (device.availableStorage > 0 && device.availableStorage < model.size * 1.5) {
    recommendations.push('🗑️ Videz le cache du navigateur pour libérer de l\'espace');
    recommendations.push('💾 Supprimez les anciens modèles inutilisés');
    recommendations.push('📁 Libérez de l\'espace disque sur votre appareil');
  }

  // Si pas de WebGPU
  if (!device.webgpu && model.size > 2 * 1024 * 1024 * 1024) {
    recommendations.push('🌐 Utilisez Chrome/Edge récent pour profiter de WebGPU');
    recommendations.push('⚡ Les performances seront limitées sans accélération GPU');
  }

  // Recommandations générales
  if (result.riskLevel === 'high' || result.riskLevel === 'critical') {
    recommendations.push('✅ Commencez avec un modèle plus petit pour tester');
    recommendations.push('📊 Surveillez l\'utilisation de la mémoire dans les outils développeur');
  }

  return recommendations;
}

/**
 * Formate les bytes en format lisible
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
}

/**
 * Vérifie si le cache peut accueillir un nouveau modèle
 */
export async function canCacheModel(modelSize: number): Promise<{
  canCache: boolean;
  needsCleanup: boolean;
  spaceNeeded: number;
}> {
  const device = await getDeviceInfo();
  const requiredSpace = modelSize * 1.5; // Marge de sécurité

  const canCache = device.availableStorage >= requiredSpace;
  const needsCleanup = device.availableStorage < requiredSpace && device.availableStorage > 0;
  const spaceNeeded = Math.max(0, requiredSpace - device.availableStorage);

  return {
    canCache,
    needsCleanup,
    spaceNeeded,
  };
}

/**
 * Obtient une estimation de la performance attendue
 */
export async function estimatePerformance(model: ModelConfig): Promise<{
  tokensPerSecond: number;
  category: 'excellent' | 'good' | 'acceptable' | 'poor';
  willUseGPU: boolean;
}> {
  const device = await getDeviceInfo();
  
  const willUseGPU = device.webgpu;
  const ramMultiplier = device.ram >= model.minRAM + 2 ? 1.2 : (device.ram >= model.minRAM ? 1.0 : 0.6);
  const gpuMultiplier = willUseGPU ? 2.0 : 1.0;

  const speedMap = {
    'very-fast': 50,
    'fast': 30,
    'moderate': 15,
    'slow': 8,
  };

  const baseSpeed = speedMap[model.speed];
  const tokensPerSecond = baseSpeed * ramMultiplier * gpuMultiplier;

  let category: 'excellent' | 'good' | 'acceptable' | 'poor';
  if (tokensPerSecond >= 40) category = 'excellent';
  else if (tokensPerSecond >= 20) category = 'good';
  else if (tokensPerSecond >= 10) category = 'acceptable';
  else category = 'poor';

  return {
    tokensPerSecond: Math.round(tokensPerSecond),
    category,
    willUseGPU,
  };
}
