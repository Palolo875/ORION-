// src/tools/tool-registry.ts

/**
 * Registre central de tous les outils disponibles dans ORION
 * Définit les métadonnées et capacités de chaque outil
 */

import type { ToolDefinition } from './types';

/**
 * Registre des outils disponibles
 */
export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  // ==========================================
  // 1. OUTILS DE COMPUTATION
  // ==========================================
  
  calculator: {
    id: 'calculator',
    name: 'Calculatrice Avancée',
    category: 'computation',
    description: 'Exécution de calculs mathématiques complexes, symboliques et statistiques',
    argCount: 1,
    examples: [
      'calcule 2^10',
      'résous sqrt(144) + log(100)',
      'statistiques: mean([1,2,3,4,5])',
    ],
    capabilities: [
      'arithmetic',
      'algebra',
      'calculus',
      'statistics',
      'trigonometry',
      'complex-numbers',
    ],
    validator: (args) => typeof args[0] === 'string' && args[0].length > 0,
    requiresWorker: true,
    timeout: 5000,
  },

  converter: {
    id: 'converter',
    name: 'Convertisseur Universel',
    category: 'computation',
    description: 'Conversion d\'unités, devises et températures',
    argCount: 3,
    examples: [
      'convertis 100 USD en EUR',
      'convertis 10 km en miles',
      'convertis 25 celsius en fahrenheit',
    ],
    capabilities: [
      'unit-conversion',
      'currency-conversion',
      'temperature-conversion',
    ],
    validator: (args) => 
      args.length === 3 && 
      (typeof args[0] === 'number' || typeof args[0] === 'string') &&
      typeof args[1] === 'string' &&
      typeof args[2] === 'string',
    requiresWorker: false,
  },

  // ==========================================
  // 2. OUTILS DE DATA ANALYSIS
  // ==========================================

  dataAnalyzer: {
    id: 'dataAnalyzer',
    name: 'Analyseur de Données',
    category: 'data',
    description: 'Lecture, manipulation et agrégation de données CSV/JSON/Excel',
    argCount: 2,
    examples: [
      'analyse ce fichier CSV',
      'agrège les données par catégorie',
      'filtre les lignes où prix > 100',
    ],
    capabilities: [
      'csv-parsing',
      'json-parsing',
      'data-aggregation',
      'data-filtering',
      'data-sorting',
      'statistics',
    ],
    validator: (args) => 
      (typeof args[0] === 'string' || args[0] instanceof Blob) &&
      typeof args[1] === 'string',
    requiresWorker: true,
    timeout: 15000,
  },

  // ==========================================
  // 3. OUTILS DE CODE EXECUTION
  // ==========================================

  codeSandbox: {
    id: 'codeSandbox',
    name: 'Sandbox de Code',
    category: 'code',
    description: 'Exécution sécurisée de code JavaScript/Python',
    argCount: 2,
    examples: [
      'exécute: function sum(a,b) { return a+b; } sum(5,3)',
      'teste ce code: [1,2,3].map(x => x*2)',
      'valide la syntaxe de cette fonction',
    ],
    capabilities: [
      'javascript-execution',
      'syntax-validation',
      'code-testing',
      'isolated-execution',
    ],
    validator: (args) => 
      typeof args[0] === 'string' &&
      typeof args[1] === 'string' &&
      ['javascript', 'python'].includes(args[1] as string),
    requiresWorker: true,
    timeout: 10000,
  },

  // ==========================================
  // 4. OUTILS DE SEARCH
  // ==========================================

  memorySearch: {
    id: 'memorySearch',
    name: 'Recherche en Mémoire',
    category: 'search',
    description: 'Recherche sémantique dans la mémoire vectorielle',
    argCount: 1,
    examples: [
      'recherche dans mes conversations précédentes',
      'trouve les informations sur le projet X',
      'quelles sont mes préférences sauvegardées?',
    ],
    capabilities: [
      'semantic-search',
      'vector-search',
      'context-retrieval',
    ],
    validator: (args) => typeof args[0] === 'string' && args[0].length > 0,
    requiresWorker: true,
    timeout: 8000,
  },

  // ==========================================
  // 5. OUTILS DE IMAGE PROCESSING
  // ==========================================

  imageProcessor: {
    id: 'imageProcessor',
    name: 'Traitement d\'Image',
    category: 'image',
    description: 'Redimensionnement, recadrage et filtres d\'images',
    argCount: 2,
    examples: [
      'redimensionne cette image à 800x600',
      'applique un filtre noir et blanc',
      'recadre l\'image au centre',
    ],
    capabilities: [
      'resize',
      'crop',
      'filters',
      'rotate',
      'adjust-brightness',
      'adjust-contrast',
    ],
    validator: (args) =>
      (args[0] instanceof Blob || args[0] instanceof ImageData) &&
      typeof args[1] === 'string',
    requiresWorker: true,
    timeout: 10000,
  },

  // ==========================================
  // 6. OUTILS DE VISUALIZATION
  // ==========================================

  diagramGenerator: {
    id: 'diagramGenerator',
    name: 'Générateur de Diagrammes',
    category: 'visualization',
    description: 'Création de diagrammes Mermaid, PlantUML, D2',
    argCount: 2,
    examples: [
      'crée un diagramme de flux',
      'génère un diagramme de séquence UML',
      'visualise cette architecture en graphique',
    ],
    capabilities: [
      'mermaid-diagrams',
      'flowcharts',
      'sequence-diagrams',
      'class-diagrams',
      'state-diagrams',
    ],
    validator: (args) => 
      typeof args[0] === 'string' &&
      typeof args[1] === 'string' &&
      ['mermaid', 'plantuml', 'd2'].includes(args[1] as string),
    requiresWorker: true,
    timeout: 8000,
  },

  // ==========================================
  // 7. OUTILS DE GENERATION
  // ==========================================

  qrGenerator: {
    id: 'qrGenerator',
    name: 'Générateur de QR Code',
    category: 'generation',
    description: 'Création de QR codes et codes-barres',
    argCount: 1,
    examples: [
      'génère un QR code pour https://orion.ai',
      'crée un code-barres EAN-13',
      'QR code avec correction d\'erreur maximale',
    ],
    capabilities: [
      'qr-code-generation',
      'barcode-generation',
      'error-correction',
      'custom-sizing',
    ],
    validator: (args) => typeof args[0] === 'string' && args[0].length > 0,
    requiresWorker: true,
    timeout: 5000,
  },

  // ==========================================
  // 8. OUTILS AUDIO (STT/TTS)
  // ==========================================

  speechToText: {
    id: 'speechToText',
    name: 'Reconnaissance Vocale (STT)',
    category: 'audio',
    description: 'Transcription audio en texte avec Whisper',
    argCount: 1,
    examples: [
      'transcris cet enregistrement audio',
      'convertis la voix en texte',
      'dicte ce que je dis',
    ],
    capabilities: [
      'audio-transcription',
      'multilingual-support',
      'real-time-transcription',
      'whisper-base',
    ],
    validator: (args) => args[0] instanceof Blob || args[0] instanceof ArrayBuffer,
    requiresWorker: true,
    timeout: 30000,
  },

  textToSpeech: {
    id: 'textToSpeech',
    name: 'Synthèse Vocale (TTS)',
    category: 'audio',
    description: 'Génération de voix avec Kokoro TTS',
    argCount: 1,
    examples: [
      'lis ce texte à voix haute',
      'convertis ce texte en audio',
      'génère une voix pour cette réponse',
    ],
    capabilities: [
      'text-to-speech',
      'natural-voice',
      'multilingual-support',
      'kokoro-tts',
    ],
    validator: (args) => typeof args[0] === 'string' && args[0].length > 0,
    requiresWorker: true,
    timeout: 20000,
  },

  // ==========================================
  // 9. OUTILS AI (Vision, Creative)
  // ==========================================

  visionAnalyzer: {
    id: 'visionAnalyzer',
    name: 'Analyseur Visuel',
    category: 'ai',
    description: 'Classification et détection d\'objets dans les images',
    argCount: 1,
    examples: [
      'qu\'est-ce que c\'est sur cette image?',
      'détecte les objets dans la photo',
      'identifie le sujet principal',
    ],
    capabilities: [
      'image-classification',
      'object-detection',
      'scene-understanding',
      'mobilenet-v3',
      'yolov8-nano',
    ],
    validator: (args) => args[0] instanceof Blob || args[0] instanceof ImageData,
    requiresWorker: true,
    timeout: 15000,
  },

  imageGenerator: {
    id: 'imageGenerator',
    name: 'Générateur d\'Images',
    category: 'ai',
    description: 'Génération d\'images avec Stable Diffusion Tiny',
    argCount: 1,
    examples: [
      'génère une image d\'un coucher de soleil',
      'crée une illustration de chat mignon',
      'dessine un paysage de montagne',
    ],
    capabilities: [
      'text-to-image',
      'image-generation',
      'stable-diffusion-tiny',
      'creative-ai',
    ],
    validator: (args) => typeof args[0] === 'string' && args[0].length > 0,
    requiresWorker: true,
    timeout: 60000, // Génération d'image peut prendre du temps
  },
};

/**
 * Obtient un outil par son ID
 */
export function getToolById(toolId: string): ToolDefinition | undefined {
  return TOOL_REGISTRY[toolId];
}

/**
 * Obtient tous les outils d'une catégorie
 */
export function getToolsByCategory(category: string): ToolDefinition[] {
  return Object.values(TOOL_REGISTRY).filter(tool => tool.category === category);
}

/**
 * Obtient tous les outils ayant une capacité spécifique
 */
export function getToolsByCapability(capability: string): ToolDefinition[] {
  return Object.values(TOOL_REGISTRY).filter(tool => 
    tool.capabilities.includes(capability)
  );
}

/**
 * Liste tous les outils disponibles
 */
export function getAllTools(): ToolDefinition[] {
  return Object.values(TOOL_REGISTRY);
}

/**
 * Recherche un outil par intention (query matching)
 */
export function findToolByIntent(query: string): ToolDefinition | null {
  const lowerQuery = query.toLowerCase();
  
  // Patterns de détection pour chaque outil
  const patterns: Record<string, RegExp[]> = {
    calculator: [
      /calcul(?:e|er|s)?|combien fait|résoud?s?/i,
      /[0-9+\-*/^().= ]{3,}/,
      /sqrt|log|sin|cos|tan|mean|sum/i,
    ],
    converter: [
      /convert(?:is|ir)?|transforme/i,
      /(?:km|meter|mile|celsius|fahrenheit|usd|eur)/i,
    ],
    dataAnalyzer: [
      /analys(?:e|er)|données|csv|json|excel|tableau/i,
      /agrège|filtre|trie|groupe/i,
    ],
    codeSandbox: [
      /exécute|teste|valide|code|fonction|script/i,
      /javascript|python|js|syntax/i,
    ],
    memorySearch: [
      /recherche|trouve|cherche|souviens|mémoire/i,
      /conversation|précédent|historique/i,
    ],
    imageProcessor: [
      /redimensionne|recadre|filtre|image|photo/i,
      /resize|crop|filter|rotate/i,
    ],
    diagramGenerator: [
      /diagramme|graphique|schéma|visualise/i,
      /mermaid|flowchart|uml|sequence/i,
    ],
    qrGenerator: [
      /qr code|code-barre|génère.*code/i,
    ],
    speechToText: [
      /transcris|dicte|reconnaissance vocale|audio.*texte/i,
      /speech.*text|stt/i,
    ],
    textToSpeech: [
      /lis.*haute|synthèse vocale|texte.*audio/i,
      /text.*speech|tts/i,
    ],
    visionAnalyzer: [
      /(?:qu'est-ce|qu'y a-t-il|que vois-tu).*image/i,
      /détecte.*objet|identifie|analyse.*image/i,
    ],
    imageGenerator: [
      /génère.*image|crée.*illustration|dessine/i,
      /stable.*diffusion|text.*image/i,
    ],
  };

  // Chercher la meilleure correspondance
  for (const [toolId, toolPatterns] of Object.entries(patterns)) {
    for (const pattern of toolPatterns) {
      if (pattern.test(lowerQuery)) {
        return TOOL_REGISTRY[toolId] || null;
      }
    }
  }

  return null;
}

/**
 * Statistiques du registre
 */
export function getRegistryStats() {
  const tools = Object.values(TOOL_REGISTRY);
  const categories = new Set(tools.map(t => t.category));
  const capabilities = new Set(tools.flatMap(t => t.capabilities));

  return {
    totalTools: tools.length,
    categories: Array.from(categories),
    capabilities: Array.from(capabilities),
    toolsByCategory: Object.fromEntries(
      Array.from(categories).map(cat => [
        cat,
        tools.filter(t => t.category === cat).length,
      ])
    ),
  };
}
