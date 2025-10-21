// src/config/models.ts

/**
 * Configuration des modèles LLM disponibles pour ORION
 * Avec support étendu et auto-détection des capacités
 */

export interface ModelConfig {
  id: string;
  name: string;
  size: number; // en bytes
  quality: 'basic' | 'high' | 'very-high' | 'ultra';
  speed: 'very-fast' | 'fast' | 'moderate' | 'slow';
  description: string;
  maxTokens: number;
  recommended: boolean;
  minRAM: number; // RAM minimale requise en GB
  minGPU?: string; // GPU minimal recommandé
  capabilities?: string[]; // Capacités spéciales
}

export const MODELS: Record<string, ModelConfig> = {
  demo: {
    id: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC',
    name: 'Démo Rapide',
    size: 550 * 1024 * 1024, // ~550MB
    quality: 'basic',
    speed: 'very-fast',
    description: 'Modèle léger pour découvrir ORION instantanément',
    maxTokens: 2048,
    recommended: false,
    minRAM: 2,
    capabilities: ['chat', 'basic-reasoning'],
  },
  
  standard: {
    id: 'Phi-3-mini-4k-instruct-q4f16_1-MLC',
    name: 'Standard (Recommandé)',
    size: 2 * 1024 * 1024 * 1024, // 2GB
    quality: 'high',
    speed: 'fast',
    description: 'Modèle recommandé avec le meilleur compromis qualité/performance',
    maxTokens: 4096,
    recommended: true,
    minRAM: 4,
    capabilities: ['chat', 'reasoning', 'code', 'multilingual'],
  },
  
  advanced: {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    name: 'Avancé',
    size: 1.9 * 1024 * 1024 * 1024, // 1.9GB
    quality: 'very-high',
    speed: 'moderate',
    description: 'Performances maximales pour des tâches complexes',
    maxTokens: 8192,
    recommended: false,
    minRAM: 6,
    capabilities: ['chat', 'advanced-reasoning', 'code', 'multilingual', 'long-context'],
  },
  
  // Nouveaux modèles ajoutés
  mistral: {
    id: 'Mistral-7B-Instruct-v0.2-q4f16_1-MLC',
    name: 'Mistral 7B',
    size: 4.5 * 1024 * 1024 * 1024, // 4.5GB
    quality: 'ultra',
    speed: 'moderate',
    description: 'Modèle puissant pour des tâches exigeantes',
    maxTokens: 8192,
    recommended: false,
    minRAM: 8,
    minGPU: 'RTX 3060 ou équivalent',
    capabilities: ['chat', 'expert-reasoning', 'code', 'multilingual', 'long-context'],
  },
  
  gemma: {
    id: 'gemma-2b-it-q4f16_1-MLC',
    name: 'Gemma 2B',
    size: 1.5 * 1024 * 1024 * 1024, // 1.5GB
    quality: 'high',
    speed: 'fast',
    description: 'Modèle Google compact et efficace',
    maxTokens: 8192,
    recommended: false,
    minRAM: 4,
    capabilities: ['chat', 'reasoning', 'code', 'multilingual'],
  },
  
  codegemma: {
    id: 'CodeGemma-2b-q4f16_1-MLC',
    name: 'CodeGemma 2B',
    size: 1.6 * 1024 * 1024 * 1024, // 1.6GB
    quality: 'high',
    speed: 'fast',
    description: 'Spécialisé pour la programmation',
    maxTokens: 8192,
    recommended: false,
    minRAM: 4,
    capabilities: ['code', 'debugging', 'code-generation', 'code-explanation'],
  },
  
  // Modèles multimodaux LÉGERS (vision + texte) - OPTIMISÉS
  // Ces versions sont quantizées pour réduire la taille tout en gardant de bonnes performances
  
  phi3visionMini: {
    id: 'Phi-3.5-vision-instruct-q4f16_1-MLC',
    name: 'Phi-3.5 Vision Mini',
    size: 1.4 * 1024 * 1024 * 1024, // 1.4GB - OPTIMISÉ
    quality: 'high',
    speed: 'fast',
    description: '🔥 Vision légère optimisée - Recommandé pour la plupart des usages',
    maxTokens: 4096,
    recommended: true, // RECOMMANDÉ pour vision
    minRAM: 4,
    capabilities: ['chat', 'vision', 'image-understanding', 'multimodal', 'reasoning'],
  },
  
  // Modèles Vision AVANCÉS (pour machines puissantes uniquement)
  // ⚠️ ATTENTION: Ces modèles sont lourds et nécessitent beaucoup de RAM
  
  llavaLite: {
    id: 'llava-1.5-7b-q4f16_1-MLC',
    name: 'LLaVA 7B Lite',
    size: 2.8 * 1024 * 1024 * 1024, // 2.8GB - Version quantizée
    quality: 'very-high',
    speed: 'moderate',
    description: '⚠️ Vision avancée - Nécessite 8GB RAM minimum',
    maxTokens: 4096,
    recommended: false,
    minRAM: 8,
    minGPU: 'RTX 3060 ou équivalent',
    capabilities: ['chat', 'vision', 'image-understanding', 'multimodal', 'advanced-reasoning'],
  },
  
  phi3visionPro: {
    id: 'Phi-3-vision-128k-instruct-q4f16_1-MLC',
    name: 'Phi-3 Vision Pro',
    size: 2.4 * 1024 * 1024 * 1024, // 2.4GB
    quality: 'very-high',
    speed: 'fast',
    description: '⚠️ Contexte ultra-long (128K) - Réservé aux machines puissantes',
    maxTokens: 128000,
    recommended: false,
    minRAM: 6,
    capabilities: ['chat', 'vision', 'image-understanding', 'multimodal', 'reasoning', 'long-context'],
  },
};

export const DEFAULT_MODEL = 'standard';

// === Auto-détection des capacités de l'appareil ===

export interface DeviceCapabilities {
  ram: number; // GB estimé
  gpu: string | null;
  webgl: boolean;
  webgpu: boolean;
  maxWorkers: number;
  recommendedModel: string;
  compatibleModels: string[];
}

export async function detectDeviceCapabilities(): Promise<DeviceCapabilities> {
  const capabilities: DeviceCapabilities = {
    ram: estimateRAM(),
    gpu: await detectGPU(),
    webgl: checkWebGL(),
    webgpu: await checkWebGPU(),
    maxWorkers: navigator.hardwareConcurrency || 4,
    recommendedModel: DEFAULT_MODEL,
    compatibleModels: [],
  };
  
  // Déterminer les modèles compatibles
  for (const [key, model] of Object.entries(MODELS)) {
    if (capabilities.ram >= model.minRAM) {
      capabilities.compatibleModels.push(key);
    }
  }
  
  // Choisir le meilleur modèle compatible
  if (capabilities.compatibleModels.length > 0) {
    // Trier par qualité puis par taille
    const sortedModels = capabilities.compatibleModels.sort((a, b) => {
      const modelA = MODELS[a];
      const modelB = MODELS[b];
      
      // D'abord par qualité
      const qualityOrder = { 'basic': 1, 'high': 2, 'very-high': 3, 'ultra': 4 };
      const qualityDiff = qualityOrder[modelB.quality] - qualityOrder[modelA.quality];
      
      if (qualityDiff !== 0) return qualityDiff;
      
      // Ensuite par taille (plus petit = mieux si même qualité)
      return modelA.size - modelB.size;
    });
    
    capabilities.recommendedModel = sortedModels[0];
  }
  
  console.log('[Device Detection]', capabilities);
  return capabilities;
}

function estimateRAM(): number {
  // @ts-expect-error - deviceMemory is not in standard Navigator type but exists in Chrome/Edge
  if (navigator.deviceMemory) {
    // @ts-expect-error - deviceMemory is not in standard Navigator type but exists in Chrome/Edge
    return navigator.deviceMemory;
  }
  
  // Estimation basée sur les performances
  const start = performance.now();
  const arr = new Array(1000000).fill(0);
  const end = performance.now();
  
  // Libérer la mémoire
  arr.length = 0;
  
  // Si rapide (< 50ms), probablement 8GB+
  // Si modéré (50-100ms), probablement 4-8GB
  // Si lent (> 100ms), probablement < 4GB
  if (end - start < 50) return 8;
  if (end - start < 100) return 4;
  return 2;
}

async function detectGPU(): Promise<string | null> {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return null;
    
    // @ts-expect-error - WEBGL_debug_renderer_info is a WebGL extension not in standard types
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      // @ts-expect-error - UNMASKED_RENDERER_WEBGL constant from WEBGL_debug_renderer_info extension
      return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    }
  } catch (error) {
    console.warn('[GPU Detection] Error:', error);
  }
  
  return null;
}

function checkWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch (e) {
    return false;
  }
}

async function checkWebGPU(): Promise<boolean> {
  try {
    // @ts-expect-error - WebGPU API is not yet in standard Navigator type
    if (!navigator.gpu) return false;
    
    // @ts-expect-error - WebGPU API is not yet in standard Navigator type
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch (e) {
    return false;
  }
}

// === Benchmark automatique ===

export interface BenchmarkResult {
  modelId: string;
  tokensPerSecond: number;
  loadTime: number;
  memoryUsage: number;
}

export async function benchmarkModel(
  modelId: string,
  testPrompt: string = "Bonjour, comment vas-tu ?"
): Promise<BenchmarkResult> {
  const startLoad = performance.now();
  
  // Simulation - dans une vraie implémentation, charger le modèle et mesurer
  // Pour l'instant, retourner des valeurs estimées
  const model = Object.values(MODELS).find(m => m.id === modelId);
  
  if (!model) {
    throw new Error(`Modèle ${modelId} non trouvé`);
  }
  
  // Estimation basée sur la taille et la vitesse du modèle
  const speedMultiplier = {
    'very-fast': 50,
    'fast': 30,
    'moderate': 15,
    'slow': 8,
  }[model.speed];
  
  const loadTime = model.size / (1024 * 1024 * 100); // ~100MB/s
  
  return {
    modelId,
    tokensPerSecond: speedMultiplier,
    loadTime: loadTime * 1000, // en ms
    memoryUsage: model.size,
  };
}

// === Utilitaires ===

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export function getModelsByCapability(capability: string): ModelConfig[] {
  return Object.values(MODELS).filter(model => 
    model.capabilities?.includes(capability)
  );
}

export function getRecommendedModels(): ModelConfig[] {
  return Object.values(MODELS).filter(model => model.recommended);
}

export function compareModels(modelId1: string, modelId2: string): {
  winner: string;
  reasons: string[];
} {
  const model1 = Object.values(MODELS).find(m => m.id === modelId1);
  const model2 = Object.values(MODELS).find(m => m.id === modelId2);
  
  if (!model1 || !model2) {
    throw new Error('Modèles non trouvés');
  }
  
  const reasons: string[] = [];
  let score1 = 0;
  let score2 = 0;
  
  // Comparer la qualité
  const qualityOrder = { 'basic': 1, 'high': 2, 'very-high': 3, 'ultra': 4 };
  if (qualityOrder[model1.quality] > qualityOrder[model2.quality]) {
    score1++;
    reasons.push(`${model1.name} a une meilleure qualité`);
  } else if (qualityOrder[model2.quality] > qualityOrder[model1.quality]) {
    score2++;
    reasons.push(`${model2.name} a une meilleure qualité`);
  }
  
  // Comparer la vitesse
  const speedOrder = { 'very-fast': 4, 'fast': 3, 'moderate': 2, 'slow': 1 };
  if (speedOrder[model1.speed] > speedOrder[model2.speed]) {
    score1++;
    reasons.push(`${model1.name} est plus rapide`);
  } else if (speedOrder[model2.speed] > speedOrder[model1.speed]) {
    score2++;
    reasons.push(`${model2.name} est plus rapide`);
  }
  
  // Comparer la taille
  if (model1.size < model2.size) {
    score1++;
    reasons.push(`${model1.name} est plus léger`);
  } else if (model2.size < model1.size) {
    score2++;
    reasons.push(`${model2.name} est plus léger`);
  }
  
  return {
    winner: score1 > score2 ? modelId1 : (score2 > score1 ? modelId2 : 'tie'),
    reasons,
  };
}
