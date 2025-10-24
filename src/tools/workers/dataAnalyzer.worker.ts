// src/tools/workers/dataAnalyzer.worker.ts

/**
 * Data Analyzer Tool Worker
 * 
 * Analyse de données tabulaires (CSV, JSON, Excel)
 * Utilise le parsing natif et des fonctions d'agrégation
 */

import type { ToolExecutionMessage, ToolResult, DataAnalysisArgs } from '../types';

/**
 * Message handler
 */
self.onmessage = async (event: MessageEvent<ToolExecutionMessage>) => {
  const { type, toolId, args, meta } = event.data;

  if (type !== 'execute_tool' || toolId !== 'dataAnalyzer') {
    self.postMessage({
      type: 'tool_result',
      result: {
        success: false,
        toolId: toolId || 'dataAnalyzer',
        error: 'Invalid message type or tool ID',
        executionTime: 0,
      },
      meta,
    });
    return;
  }

  const startTime = performance.now();

  try {
    const data = args[0] as string | Blob;
    const operation = args[1] as 'parse' | 'aggregate' | 'filter' | 'sort';

    // Parser les données
    let parsedData: Record<string, unknown>[];
    
    if (typeof data === 'string') {
      parsedData = await parseData(data);
    } else if (data instanceof Blob) {
      const text = await data.text();
      parsedData = await parseData(text);
    } else {
      throw new Error('Format de données non supporté');
    }

    // Exécuter l'opération demandée
    let result: string;
    
    switch (operation) {
      case 'parse':
        result = formatDataPreview(parsedData);
        break;
      case 'aggregate':
        result = performAggregation(parsedData);
        break;
      case 'filter':
        result = performFiltering(parsedData);
        break;
      case 'sort':
        result = performSorting(parsedData);
        break;
      default:
        throw new Error(`Opération non supportée: ${operation}`);
    }

    const executionTime = performance.now() - startTime;

    const toolResult: ToolResult = {
      success: true,
      toolId: 'dataAnalyzer',
      result,
      executionTime,
      metadata: {
        operation,
        rowCount: parsedData.length,
        columnCount: parsedData.length > 0 ? Object.keys(parsedData[0]).length : 0,
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
        toolId: 'dataAnalyzer',
        error: `Erreur d'analyse: ${(error as Error).message}`,
        executionTime,
      },
      meta,
    });
  }
};

/**
 * Parse les données (CSV ou JSON)
 */
async function parseData(data: string): Promise<Record<string, unknown>[]> {
  // Détecter le format
  const trimmed = data.trim();
  
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    // Format JSON
    return JSON.parse(trimmed);
  } else {
    // Format CSV
    return parseCSV(trimmed);
  }
}

/**
 * Parse CSV simple (sans dépendances externes pour l'instant)
 */
function parseCSV(csv: string): Record<string, unknown>[] {
  const lines = csv.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    throw new Error('Fichier CSV vide');
  }

  // Première ligne = headers
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Lignes suivantes = données
  const result: Record<string, unknown>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: Record<string, unknown> = {};
    
    for (let j = 0; j < headers.length; j++) {
      // Essayer de convertir en nombre si possible
      const value = values[j];
      row[headers[j]] = isNaN(Number(value)) ? value : Number(value);
    }
    
    result.push(row);
  }
  
  return result;
}

/**
 * Formate un aperçu des données
 */
function formatDataPreview(data: Record<string, unknown>[]): string {
  if (data.length === 0) {
    return 'Aucune donnée disponible';
  }

  const headers = Object.keys(data[0]);
  const preview = data.slice(0, 5); // Afficher les 5 premières lignes
  
  let output = `Données analysées: ${data.length} lignes, ${headers.length} colonnes\n\n`;
  output += `Colonnes: ${headers.join(', ')}\n\n`;
  output += 'Aperçu des premières lignes:\n';
  output += JSON.stringify(preview, null, 2);
  
  if (data.length > 5) {
    output += `\n\n... et ${data.length - 5} lignes supplémentaires`;
  }
  
  return output;
}

/**
 * Effectue des agrégations sur les données
 */
function performAggregation(data: Record<string, unknown>[]): string {
  if (data.length === 0) {
    return 'Aucune donnée à agréger';
  }

  const headers = Object.keys(data[0]);
  const numericColumns = headers.filter(header => 
    typeof data[0][header] === 'number'
  );

  if (numericColumns.length === 0) {
    return 'Aucune colonne numérique trouvée pour l\'agrégation';
  }

  let output = 'Statistiques par colonne:\n\n';
  
  for (const col of numericColumns) {
    const values = data.map(row => row[col] as number);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const std = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );

    output += `${col}:\n`;
    output += `  Somme: ${sum.toFixed(2)}\n`;
    output += `  Moyenne: ${mean.toFixed(2)}\n`;
    output += `  Min: ${min.toFixed(2)}\n`;
    output += `  Max: ${max.toFixed(2)}\n`;
    output += `  Écart-type: ${std.toFixed(2)}\n\n`;
  }

  return output;
}

/**
 * Filtre les données (exemple simple)
 */
function performFiltering(data: Record<string, unknown>[]): string {
  // Pour l'instant, retourner un exemple de filtre
  // Dans une version complète, on parserait les critères de filtre
  return 'Filtrage des données - fonctionnalité à venir avec critères spécifiques';
}

/**
 * Trie les données (exemple simple)
 */
function performSorting(data: Record<string, unknown>[]): string {
  // Pour l'instant, retourner un exemple de tri
  // Dans une version complète, on parserait les critères de tri
  return 'Tri des données - fonctionnalité à venir avec critères spécifiques';
}

// Signaler que le worker est prêt
self.postMessage({
  type: 'worker_ready',
  toolId: 'dataAnalyzer',
});
