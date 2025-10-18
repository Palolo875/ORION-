// src/workers/geniusHour.worker.ts

/**
 * Genius Hour Worker - Analyseur d'Échecs d'ORION
 * 
 * Ce worker se réveille périodiquement pour analyser les rapports d'échec
 * (feedback négatif des utilisateurs) et les logger de manière structurée.
 * 
 * Dans une future version, ce worker pourrait :
 * - Lancer des simulations avec des prompts alternatifs
 * - Proposer des améliorations automatiques
 * - Générer des rapports d'amélioration pour les développeurs
 */

import { get, keys, del } from 'idb-keyval';

console.log("Genius Hour Worker (Failure Logger) chargé et prêt.");

interface FailureReport {
  id: string;
  timestamp: number;
  feedback: string;
  originalQuery: string;
  failedResponse: string;
  conversationContext: unknown[];
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

    for (const key of failureReportKeys) {
      const report = await get(key) as FailureReport;
      
      if (!report) continue;

      console.log("╔══════════════════════════════════════════════════════════╗");
      console.log("║          RAPPORT D'ÉCHEC ANALYSÉ PAR ORION             ║");
      console.log("╚══════════════════════════════════════════════════════════╝");
      console.log(`📝 ID du Rapport: ${report.id}`);
      console.log(`⏰ Timestamp: ${new Date(report.timestamp).toLocaleString('fr-FR')}`);
      console.log(`❓ Question Originale: "${report.originalQuery}"`);
      console.log(`❌ Réponse Échouée: "${report.failedResponse}"`);
      console.log(`📚 Contexte de Conversation: ${report.conversationContext.length} entrée(s)`);
      console.log("─────────────────────────────────────────────────────────");
      
      // Dans une future version, au lieu de logger, on lancerait ici :
      // 1. Une simulation avec un prompt alternatif
      // 2. Une analyse sémantique pour identifier les causes d'échec
      // 3. Une génération de suggestions d'amélioration
      
      console.log("💡 Action Future: Analyser les patterns d'échec et proposer des améliorations");
      console.log("╚══════════════════════════════════════════════════════════╝\n");

      // Une fois le rapport traité, on le supprime pour ne pas le traiter à nouveau
      await del(key);
      console.log(`[GeniusHour] ♻️  Rapport ${report.id} archivé et supprimé.`);
    }

    console.log(`[GeniusHour] ✨ Cycle d'analyse terminé. ${failureReportKeys.length} rapport(s) traité(s).`);
  } catch (error) {
    console.error("[GeniusHour] ❌ Erreur lors de l'analyse des échecs:", error);
  }
}

// Lancer le cycle d'analyse toutes les 30 secondes pour la démo.
// Dans une vraie app, cela pourrait être plus long (ex: toutes les heures) 
// ou basé sur l'inactivité de l'utilisateur.
const ANALYSIS_INTERVAL = 30000; // 30 secondes

console.log(`[GeniusHour] ⚙️  Cycle d'analyse configuré: toutes les ${ANALYSIS_INTERVAL / 1000} secondes`);

setInterval(analyzeFailures, ANALYSIS_INTERVAL);

// Lancer une première analyse au démarrage après 5 secondes
setTimeout(analyzeFailures, 5000);

console.log("[GeniusHour] 🚀 Worker initialisé et en attente du premier cycle d'analyse.");
