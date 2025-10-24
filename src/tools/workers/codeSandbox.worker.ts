// src/tools/workers/codeSandbox.worker.ts

/**
 * Code Sandbox Tool Worker
 * 
 * Exécution sécurisée de code JavaScript dans un environnement limité
 * Validation de syntaxe et tests de code
 */

import type { ToolExecutionMessage, ToolResult, CodeExecutionArgs } from '../types';

/**
 * Message handler
 */
self.onmessage = async (event: MessageEvent<ToolExecutionMessage>) => {
  const { type, toolId, args, meta } = event.data;

  if (type !== 'execute_tool' || toolId !== 'codeSandbox') {
    self.postMessage({
      type: 'tool_result',
      result: {
        success: false,
        toolId: toolId || 'codeSandbox',
        error: 'Invalid message type or tool ID',
        executionTime: 0,
      },
      meta,
    });
    return;
  }

  const startTime = performance.now();

  try {
    const code = args[0] as string;
    const language = args[1] as 'javascript' | 'python';

    if (language !== 'javascript') {
      throw new Error('Seul JavaScript est supporté pour le moment');
    }

    // Validation de sécurité
    if (!isSafeCode(code)) {
      throw new Error('Code contient des patterns potentiellement dangereux');
    }

    // Exécuter le code dans un environnement limité
    const result = executeSandboxedCode(code);

    const executionTime = performance.now() - startTime;

    const toolResult: ToolResult = {
      success: true,
      toolId: 'codeSandbox',
      result: `Résultat d'exécution:\n${result}`,
      executionTime,
      metadata: {
        language,
        codeLength: code.length,
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
        toolId: 'codeSandbox',
        error: `Erreur d'exécution: ${(error as Error).message}`,
        executionTime,
      },
      meta,
    });
  }
};

/**
 * Vérifie si le code est sûr à exécuter
 */
function isSafeCode(code: string): boolean {
  // Liste des patterns dangereux
  const dangerousPatterns = [
    /import\s+|require\s*\(/i,
    /fetch\s*\(|XMLHttpRequest/i,
    /eval\s*\(/i,
    /Function\s*\(/i,
    /document\.|window\.|global\./i,
    /process\.|__dirname|__filename/i,
    /localStorage|sessionStorage|indexedDB/i,
    /\.\.\/|\.\.\\/, // Path traversal
  ];

  return !dangerousPatterns.some(pattern => pattern.test(code));
}

/**
 * Exécute le code dans un environnement sandboxé
 */
function executeSandboxedCode(code: string): string {
  // Créer un contexte isolé avec des globals limités
  const sandbox = {
    console: {
      log: (...args: unknown[]) => {
        outputs.push(args.map(String).join(' '));
      },
    },
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Date,
    // Pas d'accès à fetch, XMLHttpRequest, localStorage, etc.
  };

  const outputs: string[] = [];

  try {
    // Wrapper le code pour capturer le résultat
    const wrappedCode = `
      'use strict';
      const { console, Math, JSON, Array, Object, String, Number, Boolean, Date } = globalThis.__sandbox;
      ${code}
    `;

    // Créer une fonction avec le code
    const func = new Function('globalThis', wrappedCode);

    // Créer un objet global restreint
    const restrictedGlobal = {
      __sandbox: sandbox,
    };

    // Exécuter avec le contexte restreint
    const result = func.call(null, restrictedGlobal);

    // Compiler la sortie
    if (outputs.length > 0) {
      return outputs.join('\n') + (result !== undefined ? `\n=> ${result}` : '');
    } else if (result !== undefined) {
      return `=> ${result}`;
    } else {
      return 'Code exécuté avec succès (aucune sortie)';
    }
  } catch (error) {
    throw new Error(`Erreur d'exécution: ${(error as Error).message}`);
  }
}

// Signaler que le worker est prêt
self.postMessage({
  type: 'worker_ready',
  toolId: 'codeSandbox',
});
