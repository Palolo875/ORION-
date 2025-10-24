// src/tools/workers/diagramGenerator.worker.ts

/**
 * Diagram Generator Tool Worker
 * 
 * Génération de diagrammes Mermaid
 * Note: Le rendu réel nécessite la bibliothèque mermaid.js côté UI
 */

import type { ToolExecutionMessage, ToolResult, DiagramArgs } from '../types';

/**
 * Message handler
 */
self.onmessage = async (event: MessageEvent<ToolExecutionMessage>) => {
  const { type, toolId, args, meta } = event.data;

  if (type !== 'execute_tool' || toolId !== 'diagramGenerator') {
    self.postMessage({
      type: 'tool_result',
      result: {
        success: false,
        toolId: toolId || 'diagramGenerator',
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
    const diagramType = (args[1] as 'mermaid' | 'graphviz' | 'd2') || 'mermaid';

    if (diagramType !== 'mermaid') {
      throw new Error('Seul Mermaid est supporté pour le moment');
    }

    // Valider la syntaxe Mermaid
    const validationResult = validateMermaidSyntax(code);
    
    if (!validationResult.valid) {
      throw new Error(`Syntaxe Mermaid invalide: ${validationResult.error}`);
    }

    // Générer le diagramme (retourner le code Mermaid validé)
    const result = generateMermaidDiagram(code);

    const executionTime = performance.now() - startTime;

    const toolResult: ToolResult = {
      success: true,
      toolId: 'diagramGenerator',
      result,
      executionTime,
      metadata: {
        diagramType,
        codeLength: code.length,
        detectedType: validationResult.detectedType,
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
        toolId: 'diagramGenerator',
        error: `Erreur de génération: ${(error as Error).message}`,
        executionTime,
      },
      meta,
    });
  }
};

/**
 * Valide la syntaxe Mermaid
 */
function validateMermaidSyntax(code: string): { valid: boolean; error?: string; detectedType?: string } {
  const trimmed = code.trim();
  
  // Types de diagrammes Mermaid supportés
  const diagramTypes = [
    'graph',
    'flowchart',
    'sequenceDiagram',
    'classDiagram',
    'stateDiagram',
    'erDiagram',
    'gantt',
    'pie',
    'journey',
  ];

  // Vérifier si le code commence par un type de diagramme valide
  const firstLine = trimmed.split('\n')[0].trim();
  const detectedType = diagramTypes.find(type => firstLine.startsWith(type));

  if (!detectedType) {
    return {
      valid: false,
      error: `Type de diagramme non reconnu. Types supportés: ${diagramTypes.join(', ')}`,
    };
  }

  // Vérifications basiques de syntaxe
  if (trimmed.length === 0) {
    return { valid: false, error: 'Code vide' };
  }

  if (trimmed.length > 10000) {
    return { valid: false, error: 'Code trop long (max 10000 caractères)' };
  }

  return { valid: true, detectedType };
}

/**
 * Génère le diagramme Mermaid
 */
function generateMermaidDiagram(code: string): string {
  // Retourner le code Mermaid avec un wrapper pour le rendu
  return `\`\`\`mermaid\n${code}\n\`\`\`\n\nLe diagramme ci-dessus sera rendu par Mermaid.js dans l'interface utilisateur.`;
}

// Signaler que le worker est prêt
self.postMessage({
  type: 'worker_ready',
  toolId: 'diagramGenerator',
});
