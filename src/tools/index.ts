// src/tools/index.ts

/**
 * Index central pour le système de Tools d'ORION
 * 
 * Exporte tous les composants nécessaires pour l'utilisation des outils
 */

// Types
export type * from './types';

// Tool Gateway
export { ToolGateway, getToolGateway, resetToolGateway } from './tool-gateway';

// Tool Registry
export {
  TOOL_REGISTRY,
  getToolById,
  getToolsByCategory,
  getToolsByCapability,
  getAllTools,
  findToolByIntent,
  getRegistryStats,
} from './tool-registry';

/**
 * Configuration des chemins des workers
 * À utiliser lors de la création de workers
 */
export const TOOL_WORKER_PATHS = {
  calculator: '/src/tools/workers/calculator.worker.ts',
  dataAnalyzer: '/src/tools/workers/dataAnalyzer.worker.ts',
  codeSandbox: '/src/tools/workers/codeSandbox.worker.ts',
  memorySearch: '/src/tools/workers/memorySearch.worker.ts',
  imageProcessor: '/src/tools/workers/imageProcessor.worker.ts',
  diagramGenerator: '/src/tools/workers/diagramGenerator.worker.ts',
  converter: '/src/tools/workers/converter.worker.ts',
  qrGenerator: '/src/tools/workers/qrGenerator.worker.ts',
  textToSpeech: '/src/tools/workers/textToSpeech.worker.ts',
  speechToText: '/src/tools/workers/speechToText.worker.ts',
  visionAnalyzer: '/src/tools/workers/visionAnalyzer.worker.ts',
  imageGenerator: '/src/tools/workers/imageGenerator.worker.ts',
} as const;

/**
 * Catégories de modèles d'IA pour ORION
 * Associe les modèles aux outils
 */
export const AI_MODEL_CATEGORIES = {
  // Modèles LLM principaux
  language: ['demo', 'standard', 'advanced', 'mistral', 'gemma'],
  
  // Modèles de code
  code: ['codegemma'],
  
  // Modèles multimodaux (Vision)
  vision: ['llava', 'phi3vision', 'bakllava'],
  
  // Modèles audio
  audio: {
    stt: ['whisperBase'],
    tts: ['kokoroTTS'],
  },
  
  // Modèles d'analyse visuelle
  analysis: {
    classification: ['mobilenetV3'],
    detection: ['yolov8Nano'],
  },
  
  // Modèles créatifs
  creative: {
    imageGeneration: ['stableDiffusionTiny'],
  },
} as const;

/**
 * Mapping entre les outils et les modèles requis
 */
export const TOOL_MODEL_REQUIREMENTS = {
  calculator: null, // Pas de modèle IA requis
  dataAnalyzer: null,
  codeSandbox: null,
  memorySearch: null,
  imageProcessor: null,
  diagramGenerator: null,
  converter: null,
  qrGenerator: null,
  
  // Outils nécessitant des modèles d'IA
  textToSpeech: ['kokoroTTS'],
  speechToText: ['whisperBase'],
  visionAnalyzer: ['mobilenetV3', 'yolov8Nano'],
  imageGenerator: ['stableDiffusionTiny'],
} as const;

/**
 * Utilitaires pour vérifier les dépendances des outils
 */
export function getToolRequirements(toolId: string): string[] | null {
  return TOOL_MODEL_REQUIREMENTS[toolId as keyof typeof TOOL_MODEL_REQUIREMENTS] || null;
}

/**
 * Vérifie si un outil peut être utilisé avec les modèles chargés
 */
export function isToolAvailable(toolId: string, loadedModels: string[]): boolean {
  const requirements = getToolRequirements(toolId);
  
  // Si l'outil n'a pas de dépendance de modèle, il est toujours disponible
  if (!requirements) {
    return true;
  }
  
  // Vérifier si tous les modèles requis sont chargés
  return requirements.every(model => loadedModels.includes(model));
}

/**
 * Récupère tous les outils disponibles selon les modèles chargés
 */
export function getAvailableTools(loadedModels: string[]): string[] {
  return Object.keys(TOOL_WORKER_PATHS).filter(toolId => 
    isToolAvailable(toolId, loadedModels)
  );
}

/**
 * Statistiques sur les outils et modèles
 */
export function getToolsAndModelsStats(loadedModels: string[]) {
  const allTools = Object.keys(TOOL_WORKER_PATHS);
  const availableTools = getAvailableTools(loadedModels);
  const unavailableTools = allTools.filter(t => !availableTools.includes(t));
  
  return {
    total: allTools.length,
    available: availableTools.length,
    unavailable: unavailableTools.length,
    availableTools,
    unavailableTools,
    loadedModels,
    requiredModelsCount: Object.values(TOOL_MODEL_REQUIREMENTS)
      .filter(r => r !== null)
      .flat().length,
  };
}
