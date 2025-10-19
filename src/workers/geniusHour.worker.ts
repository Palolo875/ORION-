// src/workers/geniusHour.worker.ts

/**
 * Genius Hour Worker - Analyseur d'Échecs d'ORION
 * 
 * Ce worker se réveille périodiquement pour analyser les rapports d'échec
 * (feedback négatif des utilisateurs) avec des techniques avancées :
 * - Analyse sémantique des échecs avec embeddings
 * - Détection de patterns d'échec récurrents
 * - Génération automatique de prompts alternatifs
 * - Suggestions d'amélioration basées sur l'analyse
 */

import { get, keys, del, set } from 'idb-keyval';
import { pipeline, env } from '@xenova/transformers';
import { GENIUS_HOUR_CONFIG, MEMORY_CONFIG } from '../config/constants';

env.allowLocalModels = false;
env.useBrowserCache = true;

console.log("Genius Hour Worker (Advanced Failure Analyzer) chargé et prêt.");

interface FailureReport {
  id: string;
  timestamp: number;
  feedback: string;
  originalQuery: string;
  failedResponse: string;
  conversationContext: unknown[];
}

interface FailurePattern {
  id: string;
  pattern: string;
  occurrences: number;
  examples: string[];
  embedding?: number[];
  lastSeen: number;
}

interface AlternativePrompt {
  original: string;
  alternative: string;
  reason: string;
}

// === Singleton pour le pipeline d'embedding ===
interface PipelineInstance {
  (text: string, options: { pooling: 'mean'; normalize: boolean }): Promise<{
    data: Float32Array;
  }>;
}

class EmbeddingPipeline {
  static task = 'feature-extraction';
  static model = MEMORY_CONFIG.EMBEDDING_MODEL;
  static instance: PipelineInstance = null;

  static async getInstance(): Promise<PipelineInstance> {
    if (this.instance === null) {
      console.log("[GeniusHour] Initialisation du modèle d'embedding...");
      this.instance = (await pipeline(this.task, this.model)) as PipelineInstance;
      console.log("[GeniusHour] Modèle d'embedding prêt.");
    }
    return this.instance;
  }
}

async function createEmbedding(text: string): Promise<number[]> {
  const extractor = await EmbeddingPipeline.getInstance();
  const result = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(result.data);
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Charge les patterns d'échec existants
 */
async function loadFailurePatterns(): Promise<FailurePattern[]> {
  const allKeys = (await keys()) as string[];
  const patternKeys = allKeys.filter(key => 
    typeof key === 'string' && key.startsWith('pattern_')
  );

  const patterns: FailurePattern[] = [];
  for (const key of patternKeys) {
    const pattern = await get(key) as FailurePattern;
    if (pattern) {
      patterns.push(pattern);
    }
  }

  return patterns;
}

/**
 * Détecte si un échec correspond à un pattern existant
 */
async function detectPattern(
  report: FailureReport,
  existingPatterns: FailurePattern[]
): Promise<FailurePattern | null> {
  if (existingPatterns.length === 0) return null;

  const queryEmbedding = await createEmbedding(report.originalQuery);

  for (const pattern of existingPatterns) {
    if (pattern.embedding) {
      const similarity = cosineSimilarity(queryEmbedding, pattern.embedding);
      
      if (similarity >= GENIUS_HOUR_CONFIG.MIN_SIMILARITY_FOR_PATTERN) {
        console.log(`[GeniusHour] 🎯 Pattern détecté: "${pattern.pattern}" (similarité: ${(similarity * 100).toFixed(1)}%)`);
        return pattern;
      }
    }
  }

  return null;
}

/**
 * Crée un nouveau pattern d'échec
 */
async function createNewPattern(report: FailureReport): Promise<FailurePattern> {
  const embedding = await createEmbedding(report.originalQuery);
  
  const pattern: FailurePattern = {
    id: `pattern_${Date.now()}`,
    pattern: extractPatternDescription(report.originalQuery),
    occurrences: 1,
    examples: [report.originalQuery],
    embedding,
    lastSeen: Date.now(),
  };

  await set(pattern.id, pattern);
  console.log(`[GeniusHour] 📊 Nouveau pattern créé: "${pattern.pattern}"`);
  
  return pattern;
}

/**
 * Met à jour un pattern existant
 */
async function updatePattern(pattern: FailurePattern, report: FailureReport) {
  pattern.occurrences++;
  pattern.lastSeen = Date.now();
  
  if (pattern.examples.length < 5) {
    pattern.examples.push(report.originalQuery);
  }
  
  await set(pattern.id, pattern);
  console.log(`[GeniusHour] 📈 Pattern mis à jour: "${pattern.pattern}" (${pattern.occurrences} occurrences)`);
}

/**
 * Extrait une description du pattern à partir de la requête
 */
function extractPatternDescription(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  // Détecter les types de questions
  if (lowerQuery.includes('comment') || lowerQuery.includes('how')) {
    return 'Questions procédurales (comment faire)';
  }
  if (lowerQuery.includes('pourquoi') || lowerQuery.includes('why')) {
    return 'Questions causales (pourquoi)';
  }
  if (lowerQuery.includes('qu\'est-ce') || lowerQuery.includes('what')) {
    return 'Questions définitionnelles (qu\'est-ce que)';
  }
  if (lowerQuery.includes('quand') || lowerQuery.includes('when')) {
    return 'Questions temporelles (quand)';
  }
  if (lowerQuery.includes('où') || lowerQuery.includes('where')) {
    return 'Questions spatiales (où)';
  }
  
  // Détecter les sujets techniques
  if (lowerQuery.match(/code|programming|développement|fonction/)) {
    return 'Questions techniques/programmation';
  }
  if (lowerQuery.match(/math|calcul|équation/)) {
    return 'Questions mathématiques';
  }
  
  // Type de requête par longueur
  if (query.length < 30) {
    return 'Questions courtes/simples';
  }
  if (query.length > 200) {
    return 'Questions longues/complexes';
  }
  
  return 'Questions générales';
}

/**
 * Génère des prompts alternatifs pour améliorer les résultats
 */
function generateAlternativePrompts(report: FailureReport): AlternativePrompt[] {
  const alternatives: AlternativePrompt[] = [];
  const query = report.originalQuery;
  
  // Alternative 1 : Ajouter du contexte
  alternatives.push({
    original: query,
    alternative: `Contexte : L'utilisateur cherche une réponse précise et actionnable.\n\nQuestion : ${query}\n\nMerci de fournir une réponse claire, structurée et complète.`,
    reason: 'Ajout de contexte explicite et de directives de formatage'
  });
  
  // Alternative 2 : Reformulation pour clarté
  if (query.length > 100) {
    alternatives.push({
      original: query,
      alternative: `Résumé de la question : ${query.substring(0, 80)}...\n\nRéponds de manière concise et structurée.`,
      reason: 'Simplification de la requête longue'
    });
  }
  
  // Alternative 3 : Demande d'exemples
  if (!query.toLowerCase().includes('exemple')) {
    alternatives.push({
      original: query,
      alternative: `${query}\n\nPeux-tu inclure des exemples concrets dans ta réponse ?`,
      reason: 'Demande explicite d\'exemples'
    });
  }
  
  return alternatives.slice(0, GENIUS_HOUR_CONFIG.MAX_ALTERNATIVE_PROMPTS);
}

/**
 * Génère un rapport d'amélioration
 */
function generateImprovementReport(
  report: FailureReport,
  pattern: FailurePattern | null,
  alternatives: AlternativePrompt[]
): string {
  let reportText = '═══════════════════════════════════════════════════\n';
  reportText += '          RAPPORT D\'AMÉLIORATION ORION\n';
  reportText += '═══════════════════════════════════════════════════\n\n';
  
  reportText += `📝 Requête originale :\n"${report.originalQuery}"\n\n`;
  reportText += `❌ Réponse insatisfaisante :\n"${report.failedResponse.substring(0, 150)}${report.failedResponse.length > 150 ? '...' : ''}"\n\n`;
  
  if (pattern) {
    reportText += `🎯 Pattern détecté : ${pattern.pattern}\n`;
    reportText += `   Occurrences : ${pattern.occurrences}\n`;
    reportText += `   Dernière occurrence : ${new Date(pattern.lastSeen).toLocaleString('fr-FR')}\n\n`;
    
    if (pattern.occurrences >= 3) {
      reportText += `⚠️  ATTENTION : Ce pattern d'échec est récurrent (${pattern.occurrences}x)\n`;
      reportText += `   Recommandation : Considérer un ajustement du prompt système\n\n`;
    }
  } else {
    reportText += `🆕 Nouveau type d'échec détecté\n\n`;
  }
  
  if (alternatives.length > 0) {
    reportText += `💡 Suggestions de prompts alternatifs :\n\n`;
    alternatives.forEach((alt, idx) => {
      reportText += `   ${idx + 1}. ${alt.reason}\n`;
      reportText += `      "${alt.alternative.substring(0, 100)}..."\n\n`;
    });
  }
  
  reportText += '═══════════════════════════════════════════════════\n';
  
  return reportText;
}

/**
 * Analyse les rapports d'échec stockés en mémoire
 */
async function analyzeFailures() {
  console.log("[GeniusHour] 🔍 Début du cycle d'analyse des échecs...");
  
  try {
    const allKeys = (await keys()) as string[];
    const failureReportKeys = allKeys.filter(key => 
      typeof key === 'string' && key.startsWith('failure_')
    );

    if (failureReportKeys.length === 0) {
      console.log("[GeniusHour] ✅ Aucun rapport d'échec à analyser. Cycle terminé.");
      return;
    }

    console.log(`[GeniusHour] 📊 ${failureReportKeys.length} rapport(s) d'échec trouvé(s).`);

    // Charger les patterns existants
    const existingPatterns = await loadFailurePatterns();
    console.log(`[GeniusHour] 📚 ${existingPatterns.length} pattern(s) d'échec en mémoire.`);

    for (const key of failureReportKeys) {
      const report = await get(key) as FailureReport;
      
      if (!report) continue;

      console.log("\n╔══════════════════════════════════════════════════════════╗");
      console.log("║       ANALYSE AVANCÉE D'ÉCHEC PAR ORION GENIUS          ║");
      console.log("╚══════════════════════════════════════════════════════════╝");
      
      // 1. Détection de pattern
      const matchedPattern = await detectPattern(report, existingPatterns);
      
      if (matchedPattern) {
        await updatePattern(matchedPattern, report);
      } else {
        await createNewPattern(report);
      }
      
      // 2. Génération de prompts alternatifs
      const alternatives = generateAlternativePrompts(report);
      
      // 3. Génération du rapport d'amélioration
      const improvementReport = generateImprovementReport(report, matchedPattern, alternatives);
      console.log(improvementReport);
      
      // 4. Sauvegarder le rapport d'amélioration
      const improvementId = `improvement_${Date.now()}`;
      await set(improvementId, {
        id: improvementId,
        timestamp: Date.now(),
        originalReport: report,
        pattern: matchedPattern,
        alternatives,
        report: improvementReport,
      });
      
      // 5. Supprimer le rapport d'échec traité
      await del(key);
      console.log(`[GeniusHour] ♻️  Rapport ${report.id} analysé et archivé.`);
    }

    console.log(`\n[GeniusHour] ✨ Cycle d'analyse terminé. ${failureReportKeys.length} rapport(s) traité(s).`);
    
    // Nettoyer les anciens rapports d'amélioration (garder les 50 derniers)
    await cleanupImprovementReports();
    
  } catch (error) {
    console.error("[GeniusHour] ❌ Erreur lors de l'analyse des échecs:", error);
  }
}

/**
 * Nettoie les anciens rapports d'amélioration
 */
async function cleanupImprovementReports() {
  const allKeys = (await keys()) as string[];
  const improvementKeys = allKeys.filter(key => 
    typeof key === 'string' && key.startsWith('improvement_')
  );
  
  if (improvementKeys.length > 50) {
    // Trier par timestamp (les plus anciens d'abord)
    const improvements = await Promise.all(
      improvementKeys.map(async key => ({
        key,
        data: await get(key)
      }))
    );
    
    improvements.sort((a, b) => a.data.timestamp - b.data.timestamp);
    
    // Supprimer les plus anciens
    const toDelete = improvements.slice(0, improvements.length - 50);
    for (const item of toDelete) {
      await del(item.key);
    }
    
    console.log(`[GeniusHour] 🧹 ${toDelete.length} ancien(s) rapport(s) d'amélioration supprimé(s).`);
  }
}

// Configuration du cycle d'analyse
console.log(`[GeniusHour] ⚙️  Cycle d'analyse configuré: toutes les ${GENIUS_HOUR_CONFIG.ANALYSIS_INTERVAL / 1000} secondes`);

setInterval(analyzeFailures, GENIUS_HOUR_CONFIG.ANALYSIS_INTERVAL);

// Lancer une première analyse au démarrage
setTimeout(analyzeFailures, GENIUS_HOUR_CONFIG.INITIAL_DELAY);

console.log("[GeniusHour] 🚀 Worker initialisé et en attente du premier cycle d'analyse.");
