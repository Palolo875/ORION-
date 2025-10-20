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
import { logger } from '../utils/logger';

env.allowLocalModels = false;
env.useBrowserCache = true;

logger.info('GeniusHourWorker', 'Worker chargé et prêt');

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

interface GeniusStatistics {
  totalFailuresAnalyzed: number;
  totalPatternsDetected: number;
  mostCommonPattern: string | null;
  averagePatternOccurrences: number;
  totalAlternativesGenerated: number;
  lastAnalysisTimestamp: number;
  improvementRate: number; // Taux d'amélioration estimé
}

interface AutoImprovementSuggestion {
  id: string;
  type: 'system_prompt' | 'agent_config' | 'temperature' | 'max_tokens';
  current: string | number;
  suggested: string | number;
  reason: string;
  confidence: number;
  basedOnPatterns: string[];
}

// === Singleton pour le pipeline d'embedding ===
// Type pour le pipeline d'embedding de Transformers.js
type PipelineInstance = ReturnType<typeof pipeline> extends Promise<infer T> ? T : never;

class EmbeddingPipeline {
  static task = 'feature-extraction' as const;
  static model = MEMORY_CONFIG.EMBEDDING_MODEL;
  static instance: PipelineInstance | null = null;

  static async getInstance(): Promise<PipelineInstance> {
    if (this.instance === null) {
      logger.info('GeniusHourWorker', "Initialisation du modèle d'embedding");
      // @ts-expect-error - Transformers.js pipeline type mismatch mais fonctionne correctement
      this.instance = await pipeline(this.task, this.model);
      logger.info('GeniusHourWorker', "Modèle d'embedding prêt");
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
        logger.debug('GeniusHourWorker', 'Pattern détecté', { pattern: pattern.pattern, similarity: (similarity * 100).toFixed(1) + '%' });
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
  logger.debug('GeniusHourWorker', 'Nouveau pattern créé', { pattern: pattern.pattern });
  
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
  logger.debug('GeniusHourWorker', 'Pattern mis à jour', { pattern: pattern.pattern, occurrences: pattern.occurrences });
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
  logger.info('GeniusHourWorker', "Début du cycle d'analyse des échecs");
  
  try {
    const allKeys = (await keys()) as string[];
    const failureReportKeys = allKeys.filter(key => 
      typeof key === 'string' && key.startsWith('failure_')
    );

    if (failureReportKeys.length === 0) {
      logger.debug('GeniusHourWorker', 'Aucun rapport d\'\u00e9chec à analyser. Cycle terminé');
      return;
    }

    logger.info('GeniusHourWorker', 'Rapports d\'\u00e9chec trouvés', { count: failureReportKeys.length });

    // Charger les patterns existants
    const existingPatterns = await loadFailurePatterns();
    logger.info('GeniusHourWorker', 'Patterns d\'\u00e9chec en mémoire', { count: existingPatterns.length });

    for (const key of failureReportKeys) {
      const report = await get(key) as FailureReport;
      
      if (!report) continue;

      logger.info('GeniusHourWorker', '===== ANALYSE AVANCÉE D\'\u00c9CHEC PAR ORION GENIUS =====');
      
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
      logger.info('GeniusHourWorker', 'Rapport d\'amélioration', { report: improvementReport.substring(0, 500) });
      
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
      logger.debug('GeniusHourWorker', 'Rapport analysé et archivé', { reportId: report.id });
    }

    logger.info('GeniusHourWorker', 'Cycle d\'analyse terminé', { processedReports: failureReportKeys.length });
    
    // Nettoyer les anciens rapports d'amélioration (garder les 50 derniers)
    await cleanupImprovementReports();
    
    // Mettre à jour les statistiques globales
    const updatedPatterns = await loadFailurePatterns();
    const stats = await updateGlobalStatistics(updatedPatterns);
    logger.info('GeniusHourWorker', '📊 Statistiques mises à jour', { stats });
    
    // Générer des suggestions d'auto-amélioration
    const suggestions = await generateAutoImprovementSuggestions(updatedPatterns);
    if (suggestions.length > 0) {
      logger.info('GeniusHourWorker', '💡 Nouvelles suggestions générées', { 
        count: suggestions.length 
      });
    }
    
    // Générer et afficher le tableau de bord des insights
    const dashboard = await generateInsightsDashboard(updatedPatterns, stats, suggestions);
    logger.info('GeniusHourWorker', 'Tableau de bord ORION Genius', { dashboard });
    
  } catch (error) {
    logger.error('GeniusHourWorker', 'Erreur lors de l\'analyse des échecs', error);
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
    
    logger.debug('GeniusHourWorker', 'Anciens rapports d\'amélioration supprimés', { count: toDelete.length });
  }
}

/**
 * Calcule et met à jour les statistiques globales de Genius Hour
 */
async function updateGlobalStatistics(patterns: FailurePattern[]): Promise<GeniusStatistics> {
  const stats: GeniusStatistics = {
    totalFailuresAnalyzed: 0,
    totalPatternsDetected: patterns.length,
    mostCommonPattern: null,
    averagePatternOccurrences: 0,
    totalAlternativesGenerated: 0,
    lastAnalysisTimestamp: Date.now(),
    improvementRate: 0,
  };

  if (patterns.length > 0) {
    // Trouver le pattern le plus fréquent
    const sortedPatterns = [...patterns].sort((a, b) => b.occurrences - a.occurrences);
    stats.mostCommonPattern = sortedPatterns[0].pattern;
    
    // Calculer la moyenne des occurrences
    stats.totalFailuresAnalyzed = patterns.reduce((sum, p) => sum + p.occurrences, 0);
    stats.averagePatternOccurrences = stats.totalFailuresAnalyzed / patterns.length;
    
    // Calculer le taux d'amélioration (basé sur la récurrence des patterns)
    // Plus un pattern se répète, moins le système s'améliore
    const maxOccurrences = sortedPatterns[0].occurrences;
    stats.improvementRate = Math.max(0, 1 - (maxOccurrences / 10)); // 10 occurrences = 0% amélioration
  }

  // Compter les alternatives générées
  const allKeys = (await keys()) as string[];
  const improvementKeys = allKeys.filter(key => 
    typeof key === 'string' && key.startsWith('improvement_')
  );
  
  for (const key of improvementKeys) {
    const improvement = await get(key);
    if (improvement?.alternatives) {
      stats.totalAlternativesGenerated += improvement.alternatives.length;
    }
  }

  // Sauvegarder les statistiques
  await set('genius_statistics', stats);
  
  return stats;
}

/**
 * Génère des suggestions d'auto-amélioration basées sur les patterns récurrents
 */
async function generateAutoImprovementSuggestions(patterns: FailurePattern[]): Promise<AutoImprovementSuggestion[]> {
  const suggestions: AutoImprovementSuggestion[] = [];
  
  // Analyser les patterns pour générer des suggestions
  const sortedPatterns = [...patterns].sort((a, b) => b.occurrences - a.occurrences);
  
  for (const pattern of sortedPatterns.slice(0, 3)) { // Top 3 patterns
    if (pattern.occurrences >= 3) {
      // Si le pattern se répète 3+ fois, suggérer des améliorations
      
      // Suggestion 1 : Ajuster le prompt système selon le type de pattern
      if (pattern.pattern.includes('procédurales')) {
        suggestions.push({
          id: `suggestion_${Date.now()}_1`,
          type: 'system_prompt',
          current: 'Prompt système standard',
          suggested: 'Ajouter : "Privilégier les réponses étape par étape avec des instructions claires"',
          reason: `Pattern récurrent détecté : ${pattern.pattern} (${pattern.occurrences} occurrences)`,
          confidence: Math.min(pattern.occurrences / 10, 0.9),
          basedOnPatterns: [pattern.pattern],
        });
      }
      
      if (pattern.pattern.includes('techniques/programmation')) {
        suggestions.push({
          id: `suggestion_${Date.now()}_2`,
          type: 'system_prompt',
          current: 'Prompt système standard',
          suggested: 'Ajouter : "Toujours inclure des exemples de code commentés et testables"',
          reason: `Pattern récurrent détecté : ${pattern.pattern} (${pattern.occurrences} occurrences)`,
          confidence: Math.min(pattern.occurrences / 10, 0.9),
          basedOnPatterns: [pattern.pattern],
        });
      }
      
      if (pattern.pattern.includes('longues/complexes')) {
        suggestions.push({
          id: `suggestion_${Date.now()}_3`,
          type: 'max_tokens',
          current: 2000,
          suggested: 3000,
          reason: `Questions complexes nécessitent plus d'espace de réponse (${pattern.occurrences} occurrences)`,
          confidence: Math.min(pattern.occurrences / 10, 0.8),
          basedOnPatterns: [pattern.pattern],
        });
      }
      
      if (pattern.pattern.includes('courtes/simples')) {
        suggestions.push({
          id: `suggestion_${Date.now()}_4`,
          type: 'temperature',
          current: 0.7,
          suggested: 0.5,
          reason: `Questions simples nécessitent plus de précision, moins de créativité (${pattern.occurrences} occurrences)`,
          confidence: Math.min(pattern.occurrences / 10, 0.75),
          basedOnPatterns: [pattern.pattern],
        });
      }
    }
  }
  
  // Sauvegarder les suggestions
  if (suggestions.length > 0) {
    await set('genius_suggestions', {
      timestamp: Date.now(),
      suggestions,
    });
    
    logger.info('GeniusHourWorker', '🎯 Suggestions d\'auto-amélioration générées', { 
      count: suggestions.length,
      highConfidence: suggestions.filter(s => s.confidence > 0.7).length
    });
  }
  
  return suggestions;
}

/**
 * Génère un tableau de bord des insights d'ORION Genius
 */
async function generateInsightsDashboard(
  patterns: FailurePattern[], 
  stats: GeniusStatistics,
  suggestions: AutoImprovementSuggestion[]
): Promise<string> {
  let dashboard = '╔═══════════════════════════════════════════════════════════╗\n';
  dashboard +=    '║         ORION GENIUS HOUR - TABLEAU DE BORD INSIGHTS       ║\n';
  dashboard +=    '╚═══════════════════════════════════════════════════════════╝\n\n';
  
  // Section Statistiques
  dashboard += '📊 STATISTIQUES GLOBALES\n';
  dashboard += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  dashboard += `   Échecs analysés         : ${stats.totalFailuresAnalyzed}\n`;
  dashboard += `   Patterns détectés       : ${stats.totalPatternsDetected}\n`;
  dashboard += `   Alternatives générées   : ${stats.totalAlternativesGenerated}\n`;
  dashboard += `   Taux d'amélioration     : ${(stats.improvementRate * 100).toFixed(0)}%\n`;
  
  if (stats.mostCommonPattern) {
    dashboard += `   Pattern le + fréquent   : ${stats.mostCommonPattern}\n`;
  }
  
  dashboard += `   Dernière analyse        : ${new Date(stats.lastAnalysisTimestamp).toLocaleString('fr-FR')}\n\n`;
  
  // Section Patterns
  if (patterns.length > 0) {
    dashboard += '🎯 TOP PATTERNS D\'ÉCHEC\n';
    dashboard += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    
    const topPatterns = [...patterns].sort((a, b) => b.occurrences - a.occurrences).slice(0, 5);
    topPatterns.forEach((pattern, idx) => {
      const urgency = pattern.occurrences >= 5 ? '🔴' : pattern.occurrences >= 3 ? '🟡' : '🟢';
      dashboard += `   ${idx + 1}. ${urgency} ${pattern.pattern}\n`;
      dashboard += `      Occurrences : ${pattern.occurrences}x | Dernier : ${new Date(pattern.lastSeen).toLocaleDateString('fr-FR')}\n`;
    });
    dashboard += '\n';
  }
  
  // Section Suggestions
  if (suggestions.length > 0) {
    dashboard += '💡 SUGGESTIONS D\'AUTO-AMÉLIORATION\n';
    dashboard += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    
    const topSuggestions = suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
    
    topSuggestions.forEach((suggestion, idx) => {
      const confidenceBar = '█'.repeat(Math.round(suggestion.confidence * 10));
      dashboard += `   ${idx + 1}. [${suggestion.type.toUpperCase()}] Confiance: ${confidenceBar} ${(suggestion.confidence * 100).toFixed(0)}%\n`;
      dashboard += `      ${suggestion.reason}\n`;
      dashboard += `      Suggéré : ${suggestion.suggested}\n`;
    });
    dashboard += '\n';
  }
  
  dashboard += '╔═══════════════════════════════════════════════════════════╗\n';
  dashboard += '║  ORION apprend de ses erreurs pour mieux vous servir     ║\n';
  dashboard += '╚═══════════════════════════════════════════════════════════╝\n';
  
  return dashboard;
}

// Configuration du cycle d'analyse
logger.info('GeniusHourWorker', 'Cycle d\'analyse configuré', { intervalSeconds: GENIUS_HOUR_CONFIG.ANALYSIS_INTERVAL / 1000 });

setInterval(analyzeFailures, GENIUS_HOUR_CONFIG.ANALYSIS_INTERVAL);

// Lancer une première analyse au démarrage
setTimeout(analyzeFailures, GENIUS_HOUR_CONFIG.INITIAL_DELAY);

logger.info('GeniusHourWorker', 'Worker initialisé et en attente du premier cycle d\'analyse');
