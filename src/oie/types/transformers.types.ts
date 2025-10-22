/**
 * Types pour les APIs Transformers.js et modèles
 */

/**
 * Callback de progression pour le téléchargement de modèles
 */
export interface ProgressCallbackData {
  status?: string;
  progress?: number;
  file?: string;
  loaded?: number;
  total?: number;
}

/**
 * Options pour la génération d'images
 */
export interface ImageGenerationOptions {
  num_inference_steps?: number;
  guidance_scale?: number;
  negative_prompt?: string;
  width?: number;
  height?: number;
  seed?: number;
}

/**
 * Contenu de message multimodal
 */
export interface MultimodalMessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

/**
 * Message multimodal complet
 */
export interface MultimodalMessage {
  role: string;
  content: string | MultimodalMessageContent[];
}
