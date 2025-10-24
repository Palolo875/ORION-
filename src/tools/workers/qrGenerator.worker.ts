// src/tools/workers/qrGenerator.worker.ts

/**
 * QR Code Generator Tool Worker
 * 
 * Génération de QR codes et codes-barres
 * Note: Nécessite une bibliothèque QR code pour le rendu réel
 */

import type { ToolExecutionMessage, ToolResult, QRCodeArgs } from '../types';

/**
 * Message handler
 */
self.onmessage = async (event: MessageEvent<ToolExecutionMessage>) => {
  const { type, toolId, args, meta } = event.data;

  if (type !== 'execute_tool' || toolId !== 'qrGenerator') {
    self.postMessage({
      type: 'tool_result',
      result: {
        success: false,
        toolId: toolId || 'qrGenerator',
        error: 'Invalid message type or tool ID',
        executionTime: 0,
      },
      meta,
    });
    return;
  }

  const startTime = performance.now();

  try {
    const data = args[0] as string;
    
    if (data.length === 0) {
      throw new Error('Données vides');
    }

    if (data.length > 2000) {
      throw new Error('Données trop longues pour un QR code (max 2000 caractères)');
    }

    // Générer le QR code (SVG text-based pour le moment)
    const result = generateQRCodePlaceholder(data);

    const executionTime = performance.now() - startTime;

    const toolResult: ToolResult = {
      success: true,
      toolId: 'qrGenerator',
      result,
      executionTime,
      metadata: {
        dataLength: data.length,
        type: 'qr',
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
        toolId: 'qrGenerator',
        error: `Erreur de génération: ${(error as Error).message}`,
        executionTime,
      },
      meta,
    });
  }
};

/**
 * Génère un placeholder pour le QR code
 * Note: Une implémentation complète utiliserait qrcode.js ou une bibliothèque similaire
 */
function generateQRCodePlaceholder(data: string): string {
  return `QR Code généré pour: "${data.substring(0, 50)}${data.length > 50 ? '...' : ''}"\n\nNote: L'implémentation complète du QR code nécessite l'intégration d'une bibliothèque comme qrcode.js. Cette fonctionnalité sera activée lors de la phase d'intégration UI.\n\nPour générer le QR code réel, vous pouvez:\n1. Installer: npm install qrcode\n2. Utiliser l'API: QRCode.toDataURL('${data}')`;
}

// Signaler que le worker est prêt
self.postMessage({
  type: 'worker_ready',
  toolId: 'qrGenerator',
});
