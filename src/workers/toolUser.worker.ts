// src/workers/toolUser.worker.ts

/**
 * ToolUser Worker (Enhanced with Tool Gateway Integration)
 * 
 * Ce worker gère l'exécution sécurisée des outils pour ORION avec :
 * - Intégration avec le nouveau système Tool Gateway
 * - Détection d'intention améliorée avec pattern matching sophistiqué
 * - Support pour les 12 outils avancés (computation, data, code, audio, vision, etc.)
 * - Validation stricte avec whitelist et Circuit Breaker
 * - Architecture Actor Model avec isolation complète
 */

import type { WorkerMessage } from '../types';
import { TOOL_CONFIG } from '../config/constants';
import { logger } from '../utils/logger';
import { evaluate } from 'mathjs';
import { getToolGateway, findToolByIntent, TOOL_REGISTRY } from '../tools';

logger.info('ToolUserWorker', 'Worker chargé et prêt');

// === Types d'outils ===
type ToolFunction = (...args: unknown[]) => string | Promise<string>;

interface ToolDefinition {
  fn: ToolFunction;
  argCount: number;
  validator: (args: unknown[]) => boolean;
  description: string;
  examples: string[];
}

// === Définition des Outils ===
const tools: Record<string, ToolFunction> = {
  // Outils temporels
  getTime: () => new Date().toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  }),
  
  getDate: () => new Date().toLocaleDateString('fr-FR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }),
  
  getTimestamp: () => Date.now().toString(),
  
  // Outils de calcul
  calculate: (expression: string) => {
    try {
      // Utiliser mathjs au lieu de eval() pour la sécurité
      // mathjs parse et évalue de manière sécurisée les expressions mathématiques
      const result = evaluate(expression);
      return `${expression} = ${result}`;
    } catch (error) {
      return `Erreur de calcul : ${(error as Error).message}`;
    }
  },
  
  // Conversions
  convertTemperature: (value: string, from: string, to: string) => {
    const val = parseFloat(value);
    if (isNaN(val)) return 'Valeur invalide';
    
    const fromUnit = from.toLowerCase();
    const toUnit = to.toLowerCase();
    
    // Convertir en Celsius d'abord
    let celsius: number;
    if (fromUnit === 'c' || fromUnit === 'celsius') {
      celsius = val;
    } else if (fromUnit === 'f' || fromUnit === 'fahrenheit') {
      celsius = (val - 32) * 5/9;
    } else if (fromUnit === 'k' || fromUnit === 'kelvin') {
      celsius = val - 273.15;
    } else {
      return 'Unité source invalide (c/f/k)';
    }
    
    // Convertir vers l'unité cible
    let result: number;
    if (toUnit === 'c' || toUnit === 'celsius') {
      result = celsius;
    } else if (toUnit === 'f' || toUnit === 'fahrenheit') {
      result = celsius * 9/5 + 32;
    } else if (toUnit === 'k' || toUnit === 'kelvin') {
      result = celsius + 273.15;
    } else {
      return 'Unité cible invalide (c/f/k)';
    }
    
    return `${value}°${from.toUpperCase()} = ${result.toFixed(2)}°${to.toUpperCase()}`;
  },
  
  convertLength: (value: string, from: string, to: string) => {
    const val = parseFloat(value);
    if (isNaN(val)) return 'Valeur invalide';
    
    const units: Record<string, number> = {
      'm': 1,
      'meter': 1,
      'metre': 1,
      'cm': 0.01,
      'centimeter': 0.01,
      'centimetre': 0.01,
      'mm': 0.001,
      'millimeter': 0.001,
      'millimetre': 0.001,
      'km': 1000,
      'kilometer': 1000,
      'kilometre': 1000,
      'in': 0.0254,
      'inch': 0.0254,
      'ft': 0.3048,
      'foot': 0.3048,
      'feet': 0.3048,
      'yd': 0.9144,
      'yard': 0.9144,
      'mi': 1609.34,
      'mile': 1609.34,
    };
    
    const fromUnit = from.toLowerCase();
    const toUnit = to.toLowerCase();
    
    if (!(fromUnit in units) || !(toUnit in units)) {
      return 'Unité invalide (m, cm, mm, km, in, ft, yd, mi)';
    }
    
    const meters = val * units[fromUnit];
    const result = meters / units[toUnit];
    
    return `${value} ${from} = ${result.toFixed(4)} ${to}`;
  },
  
  // Utilitaires de texte
  countWords: (text: string) => {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    return `${words.length} mot(s)`;
  },
  
  countCharacters: (text: string) => {
    return `${text.length} caractère(s)`;
  },
  
  reverseText: (text: string) => {
    return text.split('').reverse().join('');
  },
  
  // Générateurs
  generateUUID: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },
  
  generateRandomNumber: (min: string, max: string) => {
    const minNum = parseInt(min);
    const maxNum = parseInt(max);
    
    if (isNaN(minNum) || isNaN(maxNum)) {
      return 'Valeurs invalides';
    }
    
    const random = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
    return `Nombre aléatoire entre ${min} et ${max} : ${random}`;
  },
};

// === Whitelist des Outils ===
const TOOL_WHITELIST: Record<string, ToolDefinition> = {
  getTime: {
    fn: tools.getTime,
    argCount: 0,
    validator: (args) => args.length === 0,
    description: 'Obtenir l\'heure actuelle',
    examples: ['quelle heure est-il', 'donne-moi l\'heure'],
  },
  
  getDate: {
    fn: tools.getDate,
    argCount: 0,
    validator: (args) => args.length === 0,
    description: 'Obtenir la date actuelle',
    examples: ['quelle est la date', 'quel jour sommes-nous'],
  },
  
  getTimestamp: {
    fn: tools.getTimestamp,
    argCount: 0,
    validator: (args) => args.length === 0,
    description: 'Obtenir le timestamp actuel',
    examples: ['timestamp', 'unix time'],
  },
  
  calculate: {
    fn: tools.calculate,
    argCount: 1,
    validator: (args) => typeof args[0] === 'string' && args[0].length > 0,
    description: 'Effectuer un calcul mathématique',
    examples: ['calcule 2+2', 'combien fait 15*7', '(10+5)/3'],
  },
  
  convertTemperature: {
    fn: tools.convertTemperature,
    argCount: 3,
    validator: (args) => args.length === 3 && args.every(a => typeof a === 'string'),
    description: 'Convertir une température',
    examples: ['convertis 25 celsius en fahrenheit', '100 f en c'],
  },
  
  convertLength: {
    fn: tools.convertLength,
    argCount: 3,
    validator: (args) => args.length === 3 && args.every(a => typeof a === 'string'),
    description: 'Convertir une longueur',
    examples: ['convertis 10 km en miles', '5 feet en metres'],
  },
  
  countWords: {
    fn: tools.countWords,
    argCount: 1,
    validator: (args) => typeof args[0] === 'string',
    description: 'Compter les mots dans un texte',
    examples: ['compte les mots dans', 'combien de mots'],
  },
  
  countCharacters: {
    fn: tools.countCharacters,
    argCount: 1,
    validator: (args) => typeof args[0] === 'string',
    description: 'Compter les caractères dans un texte',
    examples: ['compte les caractères', 'longueur du texte'],
  },
  
  reverseText: {
    fn: tools.reverseText,
    argCount: 1,
    validator: (args) => typeof args[0] === 'string',
    description: 'Inverser un texte',
    examples: ['inverse le texte', 'miroir de'],
  },
  
  generateUUID: {
    fn: tools.generateUUID,
    argCount: 0,
    validator: (args) => args.length === 0,
    description: 'Générer un UUID',
    examples: ['génère un uuid', 'crée un identifiant unique'],
  },
  
  generateRandomNumber: {
    fn: tools.generateRandomNumber,
    argCount: 2,
    validator: (args) => args.length === 2 && args.every(a => typeof a === 'string'),
    description: 'Générer un nombre aléatoire',
    examples: ['nombre aléatoire entre 1 et 100', 'random entre 50 et 150'],
  },
};

// === Détection d'Intention Améliorée ===

interface IntentMatch {
  toolName: string;
  confidence: number;
  args: unknown[];
}

/**
 * Patterns regex pour la détection d'intention
 */
const INTENT_PATTERNS: Record<string, RegExp[]> = {
  getTime: [
    /(?:quelle|donne).{0,10}heure/i,
    /time|clock/i,
    /heure (?:actuelle|courante)/i,
  ],
  
  getDate: [
    /(?:quelle|donne).{0,10}date/i,
    /(?:quel|on est le) (?:jour|date)/i,
    /date (?:actuelle|courante|d'aujourd'hui)/i,
    /aujourd'hui/i,
  ],
  
  getTimestamp: [
    /timestamp/i,
    /unix time/i,
    /epoch time/i,
  ],
  
  calculate: [
    /(?:calcule|calculer|combien fait|résultat de).{0,20}[0-9+\-*/().]/i,
    /^[0-9+\-*/().= ]+$/,
  ],
  
  convertTemperature: [
    /convert(?:ir)?.{0,20}(?:celsius|fahrenheit|kelvin|°[cfk])/i,
    /\d+\s*°?[cfk]\s+(?:en|to|vers)\s+°?[cfk]/i,
  ],
  
  convertLength: [
    /convert(?:ir)?.{0,20}(?:m(?:eter|etre)?|km|cm|mm|inch|foot|feet|yard|mile)/i,
    /\d+\s*(?:m(?:eter|etre)?|km|cm|mm|in|ft|yd|mi)\s+(?:en|to|vers)/i,
  ],
  
  countWords: [
    /compt(?:e|er).{0,20}mots?/i,
    /(?:nombre|combien) de mots/i,
  ],
  
  countCharacters: [
    /compt(?:e|er).{0,20}(?:caractères?|lettres?)/i,
    /(?:nombre|combien) de (?:caractères?|lettres?)/i,
    /longueur.{0,10}texte/i,
  ],
  
  reverseText: [
    /invers(?:e|er).{0,20}texte/i,
    /miroir.{0,10}(?:texte|de)/i,
    /reverse/i,
  ],
  
  generateUUID: [
    /(?:génér(?:e|er)|crée|créer|create).{0,20}(?:uuid|guid|identifiant unique)/i,
  ],
  
  generateRandomNumber: [
    /(?:nombre|number).{0,20}aléatoire/i,
    /random.{0,20}(?:number|entre|between)/i,
    /(?:génér(?:e|er)|crée).{0,20}nombre.{0,20}(?:aléatoire|hasard)/i,
  ],
};

/**
 * Extrait les arguments d'une requête pour un outil donné
 */
function extractArguments(query: string, toolName: string): unknown[] {
  const lowerQuery = query.toLowerCase();
  
  switch (toolName) {
    case 'calculate': {
      // Extraire l'expression mathématique
      const match = query.match(/[0-9+\-*/().= ]+/);
      return match ? [match[0].replace(/=/g, '').trim()] : [];
    }
    
    case 'convertTemperature': {
      // Extraire valeur, unité source, unité cible
      const match = query.match(/(\d+(?:\.\d+)?)\s*°?([cfk])\s+(?:en|to|vers)\s+°?([cfk])/i);
      if (match) {
        return [match[1], match[2], match[3]];
      }
      return [];
    }
    
    case 'convertLength': {
      const match = query.match(/(\d+(?:\.\d+)?)\s*(m(?:eter|etre)?s?|km|cm|mm|in(?:ch)?|ft|feet|yd|yard|mi(?:le)?s?)\s+(?:en|to|vers)\s*(m(?:eter|etre)?s?|km|cm|mm|in(?:ch)?|ft|feet|yd|yard|mi(?:le)?s?)/i);
      if (match) {
        return [match[1], match[2], match[3]];
      }
      return [];
    }
    
    case 'countWords':
    case 'countCharacters':
    case 'reverseText': {
      // Le texte après la commande
      const patterns = [
        /(?:dans|de|:|->)\s*["']?(.+?)["']?$/i,
        /["'](.+?)["']/,
      ];
      
      for (const pattern of patterns) {
        const match = query.match(pattern);
        if (match) {
          return [match[1].trim()];
        }
      }
      return [];
    }
    
    case 'generateRandomNumber': {
      const match = query.match(/(?:entre|between)\s+(\d+)\s+(?:et|and)\s+(\d+)/i);
      if (match) {
        return [match[1], match[2]];
      }
      return [];
    }
    
    default:
      return [];
  }
}

/**
 * Détecte l'intention et extrait les arguments
 */
function detectIntent(query: string): IntentMatch | null {
  const matches: IntentMatch[] = [];
  
  for (const [toolName, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(query)) {
        const args = extractArguments(query, toolName);
        const toolDef = TOOL_WHITELIST[toolName];
        
        // Vérifier si on a le bon nombre d'arguments
        const confidence = args.length === toolDef.argCount ? 0.9 : 0.5;
        
        matches.push({
          toolName,
          confidence,
          args,
        });
        
        break; // Passer au prochain outil
      }
    }
  }
  
  // Retourner le match avec la meilleure confiance
  if (matches.length > 0) {
    matches.sort((a, b) => b.confidence - a.confidence);
    return matches[0];
  }
  
  return null;
}

/**
 * Exécute un outil de manière sécurisée
 */
async function safeToolCall(toolName: string, args: unknown[] = []): Promise<string> {
  const toolSpec = TOOL_WHITELIST[toolName];

  if (!toolSpec) {
    logger.error('ToolUserWorker', 'Tentative d\'appel d\'un outil non autorisé', { toolName });
    throw new Error(`Tool "${toolName}" is not in the whitelist.`);
  }

  if (args.length !== toolSpec.argCount) {
    logger.error('ToolUserWorker', 'Nombre d\'arguments incorrect', { toolName, expected: toolSpec.argCount, received: args.length });
    throw new Error(`Invalid number of arguments for tool "${toolName}".`);
  }

  if (toolSpec.validator && !toolSpec.validator(args)) {
    logger.error('ToolUserWorker', 'Validation des arguments échouée', { toolName });
    throw new Error(`Invalid arguments for tool "${toolName}".`);
  }

  logger.debug('ToolUserWorker', 'Appel sécurisé de l\'outil', { toolName, argsCount: args.length });
  
  // Ajouter un timeout pour l'exécution
  const timeoutPromise = new Promise<string>((_, reject) => {
    setTimeout(() => reject(new Error('Tool execution timeout')), TOOL_CONFIG.TIMEOUT);
  });
  
  const executionPromise = Promise.resolve(toolSpec.fn(...args));
  
  return Promise.race([executionPromise, timeoutPromise]);
}

// === Worker Principal avec Tool Gateway ===

// Initialiser le Tool Gateway
let toolGateway: ReturnType<typeof getToolGateway> | null = null;

self.onmessage = async (event: MessageEvent<WorkerMessage<{ query: string }>>) => {
  const { type, payload, meta } = event.data;

  if (type === 'find_and_execute_tool') {
    logger.debug('ToolUserWorker', 'Recherche d\'outil avancée', { 
      query: payload.query.substring(0, 50),
      traceId: meta?.traceId,
    });
    
    // Essayer d'abord les outils simples (legacy)
    const legacyIntent = detectIntent(payload.query);
    
    if (legacyIntent && legacyIntent.confidence > 0.7) {
      try {
        const result = await safeToolCall(legacyIntent.toolName, legacyIntent.args);
        self.postMessage({ 
          type: 'tool_executed', 
          payload: { 
            toolName: legacyIntent.toolName, 
            result,
            confidence: legacyIntent.confidence,
          },
          meta,
        });
        return;
      } catch (error) {
        logger.error('ToolUserWorker', 'Erreur outil legacy', error);
      }
    }
    
    // Essayer les outils avancés via Tool Gateway
    const advancedTool = findToolByIntent(payload.query);
    
    if (advancedTool) {
      try {
        // Initialiser le gateway si nécessaire
        if (!toolGateway) {
          toolGateway = getToolGateway();
        }
        
        // Extraire les arguments (simplification pour le moment)
        const args = extractArgumentsForTool(payload.query, advancedTool.id);
        
        // Exécuter via le Tool Gateway
        const toolResult = await toolGateway.executeTool(
          advancedTool.id,
          args,
          {
            timeout: advancedTool.timeout,
            traceId: meta?.traceId,
          }
        );
        
        if (toolResult.success) {
          self.postMessage({ 
            type: 'tool_executed', 
            payload: { 
              toolName: advancedTool.id,
              result: toolResult.result,
              confidence: 0.9,
              executionTime: toolResult.executionTime,
            },
            meta,
          });
        } else {
          throw new Error(toolResult.error || 'Unknown error');
        }
      } catch (error) {
        logger.error('ToolUserWorker', 'Erreur outil avancé', error);
        self.postMessage({ 
          type: 'tool_error', 
          payload: { error: (error as Error).message, toolName: advancedTool.id },
          meta,
        });
      }
    } else {
      logger.debug('ToolUserWorker', 'Aucun outil pertinent trouvé');
      self.postMessage({ type: 'no_tool_found', meta });
    }
  } else if (type === 'init') {
    // Initialiser le Tool Gateway
    toolGateway = getToolGateway();
    
    const totalTools = Object.keys(TOOL_WHITELIST).length + Object.keys(TOOL_REGISTRY).length;
    
    logger.info('ToolUserWorker', 'Initialized with Tool Gateway', { 
      legacyTools: Object.keys(TOOL_WHITELIST).length,
      advancedTools: Object.keys(TOOL_REGISTRY).length,
      totalTools,
    });
    
    self.postMessage({ type: 'init_complete', payload: { 
      success: true,
      toolCount: totalTools,
      legacyTools: Object.keys(TOOL_WHITELIST),
      advancedTools: Object.keys(TOOL_REGISTRY),
    }, meta });
  } else if (type === 'list_tools') {
    const legacyTools = Object.entries(TOOL_WHITELIST).map(([name, def]) => ({
      name,
      description: def.description,
      examples: def.examples,
      category: 'legacy',
    }));
    
    const advancedTools = Object.values(TOOL_REGISTRY).map(tool => ({
      name: tool.id,
      description: tool.description,
      examples: tool.examples,
      category: tool.category,
      capabilities: tool.capabilities,
    }));
    
    self.postMessage({ 
      type: 'tool_list', 
      payload: { 
        legacyTools,
        advancedTools,
        total: legacyTools.length + advancedTools.length,
      },
      meta,
    });
  } else if (type === 'cleanup') {
    // Nettoyer le Tool Gateway
    if (toolGateway) {
      toolGateway.cleanup();
      toolGateway = null;
    }
    self.postMessage({ type: 'cleanup_complete', meta });
  }
};

/**
 * Extrait les arguments pour un outil avancé
 */
function extractArgumentsForTool(query: string, toolId: string): unknown[] {
  // Pour l'instant, une extraction simplifiée
  // Dans une version complète, on utiliserait un parsing plus sophistiqué
  
  const tool = TOOL_REGISTRY[toolId];
  if (!tool) return [];
  
  switch (toolId) {
    case 'calculator': {
      const match = query.match(/[0-9+\-*/^().= ]+/);
      return match ? [match[0].trim()] : [];
    }
    
    case 'converter': {
      const match = query.match(/(\d+(?:\.\d+)?)\s*(\w+)\s+(?:en|to|vers)\s+(\w+)/i);
      return match ? [match[1], match[2], match[3]] : [];
    }
    
    case 'dataAnalyzer': {
      return [query, 'parse']; // Par défaut, parser les données
    }
    
    case 'codeSandbox': {
      const codeMatch = query.match(/(?:code|fonction|script)[:]\s*(.+)/is);
      return codeMatch ? [codeMatch[1], 'javascript'] : [query, 'javascript'];
    }
    
    case 'memorySearch': {
      return [query];
    }
    
    case 'diagramGenerator': {
      const codeMatch = query.match(/```(\w+)?\s*([\s\S]+?)```/);
      return codeMatch ? [codeMatch[2], codeMatch[1] || 'mermaid'] : ['', 'mermaid'];
    }
    
    case 'qrGenerator':
    case 'textToSpeech':
    case 'imageGenerator': {
      return [query];
    }
    
    default:
      return [query];
  }
}
