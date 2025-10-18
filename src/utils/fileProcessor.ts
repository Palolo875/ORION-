/**
 * Utilitaires pour le traitement des fichiers et images
 */

export interface ProcessedFile {
  name: string;
  type: string;
  size: number;
  content: string; // Base64 pour images, texte pour autres fichiers
  preview?: string; // URL de prévisualisation pour les images
  metadata?: {
    width?: number;
    height?: number;
    pages?: number; // Pour les PDFs
    wordCount?: number; // Pour les documents texte
  };
}

/**
 * Types de fichiers supportés
 */
export const SUPPORTED_FILE_TYPES = {
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  documents: [
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  ],
  code: [
    'text/javascript',
    'text/typescript',
    'text/html',
    'text/css',
    'application/javascript',
    'application/typescript',
  ]
};

/**
 * Vérifie si un type de fichier est supporté
 */
export function isSupportedFileType(type: string): boolean {
  return [
    ...SUPPORTED_FILE_TYPES.images,
    ...SUPPORTED_FILE_TYPES.documents,
    ...SUPPORTED_FILE_TYPES.code
  ].includes(type) || type.startsWith('text/');
}

/**
 * Obtient la catégorie d'un fichier
 */
export function getFileCategory(type: string): 'image' | 'document' | 'code' | 'text' | 'unknown' {
  if (SUPPORTED_FILE_TYPES.images.includes(type)) return 'image';
  if (SUPPORTED_FILE_TYPES.documents.includes(type)) return 'document';
  if (SUPPORTED_FILE_TYPES.code.includes(type)) return 'code';
  if (type.startsWith('text/')) return 'text';
  return 'unknown';
}

/**
 * Convertit un fichier en base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Lit le contenu texte d'un fichier
 */
function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Obtient les dimensions d'une image
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Redimensionne une image si elle est trop grande
 */
async function resizeImage(file: File, maxWidth: number = 1920, maxHeight: number = 1080): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      let { width, height } = img;
      
      // Calculer les nouvelles dimensions en préservant le ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      } else {
        // Pas besoin de redimensionner
        resolve(file);
        return;
      }
      
      // Créer un canvas pour redimensionner
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, file.type);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Traite une image
 */
async function processImage(file: File): Promise<ProcessedFile> {
  try {
    // Obtenir les dimensions originales
    const dimensions = await getImageDimensions(file);
    
    // Redimensionner si nécessaire
    const resized = await resizeImage(file);
    
    // Convertir en base64
    const base64 = await fileToBase64(resized instanceof Blob && !(resized instanceof File) 
      ? new File([resized], file.name, { type: file.type })
      : file
    );
    
    return {
      name: file.name,
      type: file.type,
      size: file.size,
      content: base64,
      preview: base64,
      metadata: {
        width: dimensions.width,
        height: dimensions.height
      }
    };
  } catch (error) {
    throw new Error(`Erreur lors du traitement de l'image: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}

/**
 * Traite un fichier texte
 */
async function processTextFile(file: File): Promise<ProcessedFile> {
  try {
    const content = await readTextFile(file);
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    
    return {
      name: file.name,
      type: file.type,
      size: file.size,
      content,
      metadata: {
        wordCount
      }
    };
  } catch (error) {
    throw new Error(`Erreur lors du traitement du fichier texte: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}

/**
 * Traite un fichier PDF (simplifié - juste lecture du nom pour l'instant)
 */
async function processPDFFile(file: File): Promise<ProcessedFile> {
  // Pour une vraie implémentation, on utiliserait pdf.js
  // Pour l'instant, on retourne juste les métadonnées de base
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    content: `[Document PDF: ${file.name}]`,
    metadata: {
      pages: 0 // Nécessiterait pdf.js pour obtenir le nombre de pages
    }
  };
}

/**
 * Fonction principale pour traiter un fichier
 */
export async function processFile(file: File): Promise<ProcessedFile> {
  // Vérifier la taille du fichier (max 10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Le fichier est trop volumineux (max 10MB). Taille: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }
  
  const category = getFileCategory(file.type);
  
  switch (category) {
    case 'image':
      return await processImage(file);
    
    case 'text':
    case 'code':
      return await processTextFile(file);
    
    case 'document':
      if (file.type === 'application/pdf') {
        return await processPDFFile(file);
      }
      // Pour les autres documents, essayer de les lire comme du texte
      return await processTextFile(file);
    
    default:
      throw new Error(`Type de fichier non supporté: ${file.type}`);
  }
}

/**
 * Traite plusieurs fichiers en parallèle
 */
export async function processFiles(files: File[]): Promise<{
  processed: ProcessedFile[];
  errors: Array<{ file: string; error: string }>;
}> {
  const processed: ProcessedFile[] = [];
  const errors: Array<{ file: string; error: string }> = [];
  
  await Promise.all(
    files.map(async (file) => {
      try {
        const result = await processFile(file);
        processed.push(result);
      } catch (error) {
        errors.push({
          file: file.name,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }
    })
  );
  
  return { processed, errors };
}

/**
 * Formate la taille d'un fichier en format lisible
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Extrait le texte d'une image en utilisant l'OCR (si disponible)
 * Note: Nécessite une API OCR externe ou Tesseract.js
 */
export async function extractTextFromImage(file: File): Promise<string> {
  // Pour l'instant, on retourne un placeholder
  // Une vraie implémentation utiliserait Tesseract.js ou une API OCR
  return `[Extraction de texte depuis ${file.name} - Fonctionnalité OCR à implémenter]`;
}
