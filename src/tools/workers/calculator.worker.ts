// src/tools/workers/calculator.worker.ts

/**
 * Calculator Tool Worker
 * 
 * Outil de calcul mathématique avancé utilisant math.js
 * Exécution isolée dans un Web Worker pour la sécurité
 */

import { evaluate, simplify, derivative, format } from 'mathjs';
import type { ToolExecutionMessage, ToolResult } from '../types';

/**
 * Message handler
 */
self.onmessage = async (event: MessageEvent<ToolExecutionMessage>) => {
  const { type, toolId, args, meta } = event.data;

  if (type !== 'execute_tool' || toolId !== 'calculator') {
    self.postMessage({
      type: 'tool_result',
      result: {
        success: false,
        toolId: toolId || 'calculator',
        error: 'Invalid message type or tool ID',
        executionTime: 0,
      },
      meta,
    });
    return;
  }

  const startTime = performance.now();

  try {
    const expression = args[0] as string;
    
    // Validation de sécurité - bloquer les expressions dangereuses
    if (containsDangerousPatterns(expression)) {
      throw new Error('Expression contains potentially dangerous patterns');
    }

    // Déterminer le type d'opération
    let result: string;

    if (expression.includes('derivative')) {
      // Calcul de dérivée
      result = handleDerivative(expression);
    } else if (expression.includes('simplify')) {
      // Simplification d'expression
      result = handleSimplify(expression);
    } else if (expression.includes('mean') || expression.includes('sum') || 
               expression.includes('median') || expression.includes('std')) {
      // Statistiques
      result = handleStatistics(expression);
    } else {
      // Évaluation standard
      const evalResult = evaluate(expression);
      result = format(evalResult, { precision: 14 });
    }

    const executionTime = performance.now() - startTime;

    const toolResult: ToolResult = {
      success: true,
      toolId: 'calculator',
      result: `${expression} = ${result}`,
      executionTime,
      metadata: {
        expressionType: detectExpressionType(expression),
        precision: 14,
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
        toolId: 'calculator',
        error: `Erreur de calcul: ${(error as Error).message}`,
        executionTime,
      },
      meta,
    });
  }
};

/**
 * Vérifie les patterns dangereux
 */
function containsDangerousPatterns(expression: string): boolean {
  const dangerousPatterns = [
    /import|require|eval|function/i,
    /\.\.|\.\/|\.\.\//, // Path traversal
    /process|global|window|document/i,
  ];

  return dangerousPatterns.some(pattern => pattern.test(expression));
}

/**
 * Gère les calculs de dérivée
 */
function handleDerivative(expression: string): string {
  // Extraire la fonction et la variable
  const match = expression.match(/derivative\s*\(\s*['"](.+?)['"]?\s*,\s*['"]?(\w+)['"]?\s*\)/);
  
  if (!match) {
    throw new Error('Format de dérivée invalide. Utilisez: derivative("x^2", "x")');
  }

  const func = match[1];
  const variable = match[2];

  const result = derivative(func, variable);
  return result.toString();
}

/**
 * Gère la simplification d'expressions
 */
function handleSimplify(expression: string): string {
  const match = expression.match(/simplify\s*\(\s*['"](.+?)['"]?\s*\)/);
  
  if (!match) {
    throw new Error('Format de simplification invalide. Utilisez: simplify("2x + 3x")');
  }

  const expr = match[1];
  const result = simplify(expr);
  return result.toString();
}

/**
 * Gère les calculs statistiques
 */
function handleStatistics(expression: string): string {
  // Les fonctions statistiques de math.js fonctionnent directement
  const result = evaluate(expression);
  return format(result, { precision: 14 });
}

/**
 * Détecte le type d'expression
 */
function detectExpressionType(expression: string): string {
  if (expression.includes('derivative')) return 'derivative';
  if (expression.includes('simplify')) return 'simplify';
  if (expression.includes('mean') || expression.includes('std') || 
      expression.includes('median') || expression.includes('sum')) return 'statistics';
  if (/sin|cos|tan|asin|acos|atan/i.test(expression)) return 'trigonometry';
  if (/sqrt|cbrt|pow|exp|log/i.test(expression)) return 'advanced-math';
  if (/[+\-*/^()]/. test(expression)) return 'arithmetic';
  return 'unknown';
}

// Signaler que le worker est prêt
self.postMessage({
  type: 'worker_ready',
  toolId: 'calculator',
});
