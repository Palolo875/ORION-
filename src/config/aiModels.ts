// src/config/aiModels.ts

/**
 * Configuration des modèles d'IA pour les nouveaux outils d'ORION
 * Modèles Audio, Vision et Créatifs
 */

export interface AIModelConfig {
  id: string;
  name: string;
  category: 'audio' | 'vision' | 'creative';
  size: number; // en bytes
  provider: 'transformers' | 'mlc' | 'custom';
  path?: string; // Chemin HuggingFace ou local
  quantization?: '4bit' | '8bit' | 'float16' | 'float32';
  capabilities: string[];
  minRAM: number; // GB
  webgpuRequired: boolean;
  description: string;
}

/**
 * Modèles Audio
 */
export const AUDIO_MODELS: Record<string, AIModelConfig> = {
  whisperBase: {
    id: 'whisper-base',
    name: 'Whisper Base',
    category: 'audio',
    size: 290 * 1024 * 1024, // ~290MB
    provider: 'transformers',
    path: 'Xenova/whisper-base',
    quantization: 'float16',
    capabilities: ['speech-to-text', 'multilingual', 'transcription'],
    minRAM: 2,
    webgpuRequired: false,
    description: 'Modèle de reconnaissance vocale multilingue optimisé pour le web',
  },
  
  whisperSmall: {
    id: 'whisper-small',
    name: 'Whisper Small',
    category: 'audio',
    size: 490 * 1024 * 1024, // ~490MB
    provider: 'transformers',
    path: 'Xenova/whisper-small',
    quantization: 'float16',
    capabilities: ['speech-to-text', 'multilingual', 'transcription', 'high-accuracy'],
    minRAM: 3,
    webgpuRequired: false,
    description: 'Modèle de reconnaissance vocale avec meilleure précision',
  },

  kokoroTTS: {
    id: 'kokoro-tts',
    name: 'Kokoro TTS',
    category: 'audio',
    size: 150 * 1024 * 1024, // ~150MB
    provider: 'custom',
    path: 'local/kokoro-tts',
    quantization: 'float16',
    capabilities: ['text-to-speech', 'natural-voice', 'real-time'],
    minRAM: 2,
    webgpuRequired: false,
    description: 'Synthèse vocale naturelle et expressive',
  },
};

/**
 * Modèles Vision
 */
export const VISION_MODELS: Record<string, AIModelConfig> = {
  mobilenetV3: {
    id: 'mobilenet-v3-small',
    name: 'MobileNetV3 Small',
    category: 'vision',
    size: 5 * 1024 * 1024, // ~5MB
    provider: 'transformers',
    path: 'Xenova/mobilenet-v3-small',
    quantization: '8bit',
    capabilities: ['image-classification', 'fast-inference'],
    minRAM: 1,
    webgpuRequired: false,
    description: 'Classification d\'images ultra-rapide',
  },

  yolov8Nano: {
    id: 'yolov8-nano',
    name: 'YOLOv8 Nano',
    category: 'vision',
    size: 6 * 1024 * 1024, // ~6MB
    provider: 'custom',
    path: 'local/yolov8-nano',
    quantization: '8bit',
    capabilities: ['object-detection', 'bounding-boxes', 'real-time'],
    minRAM: 1,
    webgpuRequired: false,
    description: 'Détection d\'objets en temps réel',
  },

  phi3Vision: {
    id: 'Phi-3-vision-128k-instruct-q4f16_1-MLC',
    name: 'Phi-3 Vision',
    category: 'vision',
    size: 2.4 * 1024 * 1024 * 1024, // 2.4GB
    provider: 'mlc',
    quantization: '4bit',
    capabilities: ['vision', 'image-understanding', 'multimodal', 'reasoning'],
    minRAM: 6,
    webgpuRequired: true,
    description: 'Vision multimodale avancée de Microsoft',
  },
};

/**
 * Modèles Créatifs
 */
export const CREATIVE_MODELS: Record<string, AIModelConfig> = {
  stableDiffusionTiny: {
    id: 'stable-diffusion-tiny-q4',
    name: 'Stable Diffusion Tiny',
    category: 'creative',
    size: 1.5 * 1024 * 1024 * 1024, // ~1.5GB
    provider: 'custom',
    path: 'local/stable-diffusion-tiny',
    quantization: '4bit',
    capabilities: ['text-to-image', 'image-generation'],
    minRAM: 4,
    webgpuRequired: true,
    description: 'Génération d\'images compacte et rapide',
  },

  stableDiffusionXL: {
    id: 'stable-diffusion-xl-q4',
    name: 'Stable Diffusion XL',
    category: 'creative',
    size: 6.5 * 1024 * 1024 * 1024, // ~6.5GB
    provider: 'custom',
    path: 'local/stable-diffusion-xl',
    quantization: '4bit',
    capabilities: ['text-to-image', 'high-quality', 'image-generation'],
    minRAM: 8,
    webgpuRequired: true,
    description: 'Génération d\'images haute qualité (pour appareils puissants)',
  },
};

/**
 * Tous les modèles d'IA
 */
export const ALL_AI_MODELS = {
  ...AUDIO_MODELS,
  ...VISION_MODELS,
  ...CREATIVE_MODELS,
};

/**
 * Obtient un modèle par son ID
 */
export function getAIModelById(modelId: string): AIModelConfig | undefined {
  return ALL_AI_MODELS[modelId];
}

/**
 * Obtient tous les modèles d'une catégorie
 */
export function getAIModelsByCategory(category: 'audio' | 'vision' | 'creative'): AIModelConfig[] {
  return Object.values(ALL_AI_MODELS).filter(model => model.category === category);
}

/**
 * Vérifie si un modèle peut être chargé sur l'appareil actuel
 */
export async function canLoadModel(
  modelId: string,
  deviceRAM: number,
  hasWebGPU: boolean
): Promise<{ canLoad: boolean; reason?: string }> {
  const model = getAIModelById(modelId);
  
  if (!model) {
    return { canLoad: false, reason: 'Modèle non trouvé' };
  }

  // Vérifier la RAM
  if (deviceRAM < model.minRAM) {
    return {
      canLoad: false,
      reason: `RAM insuffisante (requis: ${model.minRAM}GB, disponible: ${deviceRAM}GB)`,
    };
  }

  // Vérifier WebGPU
  if (model.webgpuRequired && !hasWebGPU) {
    return {
      canLoad: false,
      reason: 'WebGPU requis mais non disponible',
    };
  }

  return { canLoad: true };
}

/**
 * Obtient les modèles recommandés selon les capacités de l'appareil
 */
export async function getRecommendedModels(
  deviceRAM: number,
  hasWebGPU: boolean
): Promise<AIModelConfig[]> {
  const recommended: AIModelConfig[] = [];

  for (const model of Object.values(ALL_AI_MODELS)) {
    const { canLoad } = await canLoadModel(model.id, deviceRAM, hasWebGPU);
    if (canLoad) {
      recommended.push(model);
    }
  }

  // Trier par taille (plus petit d'abord)
  return recommended.sort((a, b) => a.size - b.size);
}

/**
 * Estime le temps de chargement d'un modèle
 */
export function estimateLoadTime(modelId: string, networkSpeed: 'slow' | 'medium' | 'fast' = 'medium'): number {
  const model = getAIModelById(modelId);
  if (!model) return 0;

  // Vitesses de téléchargement estimées en MB/s
  const speeds = {
    slow: 1,      // 1 MB/s
    medium: 5,    // 5 MB/s
    fast: 20,     // 20 MB/s
  };

  const sizeInMB = model.size / (1024 * 1024);
  return Math.ceil(sizeInMB / speeds[networkSpeed]);
}

/**
 * Obtient les statistiques des modèles
 */
export function getAIModelsStats() {
  const models = Object.values(ALL_AI_MODELS);
  
  return {
    total: models.length,
    byCategory: {
      audio: models.filter(m => m.category === 'audio').length,
      vision: models.filter(m => m.category === 'vision').length,
      creative: models.filter(m => m.category === 'creative').length,
    },
    totalSize: models.reduce((sum, m) => sum + m.size, 0),
    averageSize: models.reduce((sum, m) => sum + m.size, 0) / models.length,
    webgpuRequired: models.filter(m => m.webgpuRequired).length,
  };
}
