// src/tools/workers/converter.worker.ts

/**
 * Universal Converter Tool Worker
 * 
 * Conversion d'unités, devises et températures
 * Exécution directe sans Worker dédié (opérations simples)
 */

import type { ToolExecutionMessage, ToolResult, ConversionArgs } from '../types';

/**
 * Message handler
 */
self.onmessage = async (event: MessageEvent<ToolExecutionMessage>) => {
  const { type, toolId, args, meta } = event.data;

  if (type !== 'execute_tool' || toolId !== 'converter') {
    self.postMessage({
      type: 'tool_result',
      result: {
        success: false,
        toolId: toolId || 'converter',
        error: 'Invalid message type or tool ID',
        executionTime: 0,
      },
      meta,
    });
    return;
  }

  const startTime = performance.now();

  try {
    const value = typeof args[0] === 'string' ? parseFloat(args[0]) : args[0] as number;
    const from = (args[1] as string).toLowerCase();
    const to = (args[2] as string).toLowerCase();

    if (isNaN(value)) {
      throw new Error('Valeur invalide');
    }

    // Détecter le type de conversion
    let result: string;
    
    if (isTemperatureUnit(from) && isTemperatureUnit(to)) {
      result = convertTemperature(value, from, to);
    } else if (isLengthUnit(from) && isLengthUnit(to)) {
      result = convertLength(value, from, to);
    } else if (isCurrencyCode(from) && isCurrencyCode(to)) {
      result = convertCurrency(value, from, to);
    } else if (isWeightUnit(from) && isWeightUnit(to)) {
      result = convertWeight(value, from, to);
    } else {
      throw new Error('Type de conversion non reconnu ou unités incompatibles');
    }

    const executionTime = performance.now() - startTime;

    const toolResult: ToolResult = {
      success: true,
      toolId: 'converter',
      result,
      executionTime,
      metadata: {
        value,
        from,
        to,
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
        toolId: 'converter',
        error: `Erreur de conversion: ${(error as Error).message}`,
        executionTime,
      },
      meta,
    });
  }
};

/**
 * Conversion de température
 */
function convertTemperature(value: number, from: string, to: string): string {
  let celsius: number;
  
  // Convertir en Celsius
  if (from === 'c' || from === 'celsius') {
    celsius = value;
  } else if (from === 'f' || from === 'fahrenheit') {
    celsius = (value - 32) * 5/9;
  } else if (from === 'k' || from === 'kelvin') {
    celsius = value - 273.15;
  } else {
    throw new Error('Unité source invalide');
  }
  
  // Convertir vers l'unité cible
  let result: number;
  let toUnit: string;
  
  if (to === 'c' || to === 'celsius') {
    result = celsius;
    toUnit = '°C';
  } else if (to === 'f' || to === 'fahrenheit') {
    result = celsius * 9/5 + 32;
    toUnit = '°F';
  } else if (to === 'k' || to === 'kelvin') {
    result = celsius + 273.15;
    toUnit = 'K';
  } else {
    throw new Error('Unité cible invalide');
  }
  
  return `${value}°${from.toUpperCase()} = ${result.toFixed(2)}${toUnit}`;
}

/**
 * Conversion de longueur
 */
function convertLength(value: number, from: string, to: string): string {
  const units: Record<string, number> = {
    'm': 1,
    'meter': 1,
    'metre': 1,
    'meters': 1,
    'metres': 1,
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
    'inches': 0.0254,
    'ft': 0.3048,
    'foot': 0.3048,
    'feet': 0.3048,
    'yd': 0.9144,
    'yard': 0.9144,
    'yards': 0.9144,
    'mi': 1609.34,
    'mile': 1609.34,
    'miles': 1609.34,
  };
  
  if (!(from in units) || !(to in units)) {
    throw new Error('Unité invalide');
  }
  
  const meters = value * units[from];
  const result = meters / units[to];
  
  return `${value} ${from} = ${result.toFixed(4)} ${to}`;
}

/**
 * Conversion de poids
 */
function convertWeight(value: number, from: string, to: string): string {
  const units: Record<string, number> = {
    'g': 1,
    'gram': 1,
    'grams': 1,
    'kg': 1000,
    'kilogram': 1000,
    'kilograms': 1000,
    'mg': 0.001,
    'milligram': 0.001,
    'milligrams': 0.001,
    'lb': 453.592,
    'pound': 453.592,
    'pounds': 453.592,
    'oz': 28.3495,
    'ounce': 28.3495,
    'ounces': 28.3495,
  };
  
  if (!(from in units) || !(to in units)) {
    throw new Error('Unité invalide');
  }
  
  const grams = value * units[from];
  const result = grams / units[to];
  
  return `${value} ${from} = ${result.toFixed(4)} ${to}`;
}

/**
 * Conversion de devise (taux statiques)
 */
function convertCurrency(value: number, from: string, to: string): string {
  // Taux de change statiques (base USD)
  // Note: Dans une version complète, ces taux seraient mis à jour régulièrement
  const rates: Record<string, number> = {
    'usd': 1.0,
    'eur': 0.85,
    'gbp': 0.73,
    'jpy': 110.0,
    'cad': 1.25,
    'aud': 1.35,
    'chf': 0.92,
  };
  
  if (!(from in rates) || !(to in rates)) {
    throw new Error('Devise non supportée');
  }
  
  // Convertir via USD
  const usd = value / rates[from];
  const result = usd * rates[to];
  
  return `${value} ${from.toUpperCase()} = ${result.toFixed(2)} ${to.toUpperCase()}\n\nNote: Taux de change statique, pour référence uniquement.`;
}

/**
 * Vérifications de type d'unité
 */
function isTemperatureUnit(unit: string): boolean {
  return ['c', 'celsius', 'f', 'fahrenheit', 'k', 'kelvin'].includes(unit.toLowerCase());
}

function isLengthUnit(unit: string): boolean {
  return ['m', 'meter', 'metre', 'cm', 'mm', 'km', 'in', 'inch', 'ft', 'foot', 'feet', 'yd', 'yard', 'mi', 'mile'].includes(unit.toLowerCase());
}

function isWeightUnit(unit: string): boolean {
  return ['g', 'gram', 'kg', 'kilogram', 'mg', 'milligram', 'lb', 'pound', 'oz', 'ounce'].includes(unit.toLowerCase());
}

function isCurrencyCode(code: string): boolean {
  return ['usd', 'eur', 'gbp', 'jpy', 'cad', 'aud', 'chf'].includes(code.toLowerCase());
}

// Signaler que le worker est prêt
self.postMessage({
  type: 'worker_ready',
  toolId: 'converter',
});
