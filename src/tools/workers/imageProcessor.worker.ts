// src/tools/workers/imageProcessor.worker.ts

/**
 * Image Processor Tool Worker
 * 
 * Traitement d'images (redimensionnement, recadrage, filtres)
 * Utilise OffscreenCanvas pour les manipulations
 */

import type { ToolExecutionMessage, ToolResult, ImageProcessingArgs } from '../types';

/**
 * Message handler
 */
self.onmessage = async (event: MessageEvent<ToolExecutionMessage>) => {
  const { type, toolId, args, meta } = event.data;

  if (type !== 'execute_tool' || toolId !== 'imageProcessor') {
    self.postMessage({
      type: 'tool_result',
      result: {
        success: false,
        toolId: toolId || 'imageProcessor',
        error: 'Invalid message type or tool ID',
        executionTime: 0,
      },
      meta,
    });
    return;
  }

  const startTime = performance.now();

  try {
    const imageData = args[0] as Blob | ImageData;
    const operation = args[1] as 'resize' | 'crop' | 'filter' | 'rotate';

    // Charger l'image
    let imgData: ImageData;
    
    if (imageData instanceof Blob) {
      imgData = await loadImageFromBlob(imageData);
    } else {
      imgData = imageData;
    }

    // Appliquer l'opération
    let result: ImageData;
    
    switch (operation) {
      case 'resize':
        result = await resizeImage(imgData, 800, 600); // Taille par défaut
        break;
      case 'crop':
        result = await cropImage(imgData, 0, 0, 400, 400); // Crop par défaut
        break;
      case 'filter':
        result = await applyGrayscaleFilter(imgData);
        break;
      case 'rotate':
        result = await rotateImage(imgData, 90); // 90° par défaut
        break;
      default:
        throw new Error(`Opération non supportée: ${operation}`);
    }

    // Convertir le résultat en Blob
    const resultBlob = await imageDataToBlob(result);

    const executionTime = performance.now() - startTime;

    const toolResult: ToolResult = {
      success: true,
      toolId: 'imageProcessor',
      result: resultBlob,
      executionTime,
      metadata: {
        operation,
        originalWidth: imgData.width,
        originalHeight: imgData.height,
        resultWidth: result.width,
        resultHeight: result.height,
      },
    };

    self.postMessage({
      type: 'tool_result',
      result: toolResult,
      meta,
    });
  } catch (error) {
    const executionTime = performance.now() - startTime;

    self.postMessage({
      type: 'tool_result',
      result: {
        success: false,
        toolId: 'imageProcessor',
        error: `Erreur de traitement: ${(error as Error).message}`,
        executionTime,
      },
      meta,
    });
  }
};

/**
 * Charge une image depuis un Blob
 */
async function loadImageFromBlob(blob: Blob): Promise<ImageData> {
  const imageBitmap = await createImageBitmap(blob);
  
  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Impossible de créer le contexte 2D');
  }
  
  ctx.drawImage(imageBitmap, 0, 0);
  return ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
}

/**
 * Redimensionne une image
 */
async function resizeImage(imageData: ImageData, width: number, height: number): Promise<ImageData> {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Impossible de créer le contexte 2D');
  }
  
  // Créer une image temporaire pour le redimensionnement
  const tempCanvas = new OffscreenCanvas(imageData.width, imageData.height);
  const tempCtx = tempCanvas.getContext('2d');
  
  if (!tempCtx) {
    throw new Error('Impossible de créer le contexte temporaire');
  }
  
  tempCtx.putImageData(imageData, 0, 0);
  
  // Redimensionner
  ctx.drawImage(tempCanvas, 0, 0, imageData.width, imageData.height, 0, 0, width, height);
  
  return ctx.getImageData(0, 0, width, height);
}

/**
 * Recadre une image
 */
async function cropImage(
  imageData: ImageData,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<ImageData> {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Impossible de créer le contexte 2D');
  }
  
  // Créer une image temporaire
  const tempCanvas = new OffscreenCanvas(imageData.width, imageData.height);
  const tempCtx = tempCanvas.getContext('2d');
  
  if (!tempCtx) {
    throw new Error('Impossible de créer le contexte temporaire');
  }
  
  tempCtx.putImageData(imageData, 0, 0);
  
  // Recadrer
  ctx.drawImage(tempCanvas, x, y, width, height, 0, 0, width, height);
  
  return ctx.getImageData(0, 0, width, height);
}

/**
 * Applique un filtre noir et blanc
 */
async function applyGrayscaleFilter(imageData: ImageData): Promise<ImageData> {
  const data = new Uint8ClampedArray(imageData.data);
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    // data[i + 3] reste inchangé (alpha)
  }
  
  return new ImageData(data, imageData.width, imageData.height);
}

/**
 * Fait pivoter une image
 */
async function rotateImage(imageData: ImageData, degrees: number): Promise<ImageData> {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  
  // Calculer les nouvelles dimensions
  const newWidth = Math.abs(imageData.width * cos) + Math.abs(imageData.height * sin);
  const newHeight = Math.abs(imageData.width * sin) + Math.abs(imageData.height * cos);
  
  const canvas = new OffscreenCanvas(Math.ceil(newWidth), Math.ceil(newHeight));
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Impossible de créer le contexte 2D');
  }
  
  // Créer une image temporaire
  const tempCanvas = new OffscreenCanvas(imageData.width, imageData.height);
  const tempCtx = tempCanvas.getContext('2d');
  
  if (!tempCtx) {
    throw new Error('Impossible de créer le contexte temporaire');
  }
  
  tempCtx.putImageData(imageData, 0, 0);
  
  // Appliquer la rotation
  ctx.translate(newWidth / 2, newHeight / 2);
  ctx.rotate(radians);
  ctx.drawImage(tempCanvas, -imageData.width / 2, -imageData.height / 2);
  
  return ctx.getImageData(0, 0, Math.ceil(newWidth), Math.ceil(newHeight));
}

/**
 * Convertit ImageData en Blob
 */
async function imageDataToBlob(imageData: ImageData): Promise<Blob> {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Impossible de créer le contexte 2D');
  }
  
  ctx.putImageData(imageData, 0, 0);
  return await canvas.convertToBlob({ type: 'image/png' });
}

// Signaler que le worker est prêt
self.postMessage({
  type: 'worker_ready',
  toolId: 'imageProcessor',
});
