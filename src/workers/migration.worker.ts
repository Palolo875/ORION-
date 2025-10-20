// src/workers/migration.worker.ts

/**
 * Migration Worker - Pipeline de Migration d'Embeddings
 * 
 * Ce worker s'exécute en arrière-plan et sa seule tâche est de trouver
 * les souvenirs avec une ancienne version d'embedding et de les mettre à jour.
 * Il fonctionne de manière progressive et non-bloquante.
 */

import { get, set, keys } from 'idb-keyval';
import { MemoryItem } from '../types';
import { pipeline, env } from '@xenova/transformers';
import { logger } from '../utils/logger';

// Configuration de Transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

// Version actuelle du modèle d'embedding
const CURRENT_EMBEDDING_MODEL_VERSION = 'Xenova/all-MiniLM-L6-v2@1.0';

// Intervalle de migration (toutes les minutes)
const MIGRATION_INTERVAL = 60000; // 60 secondes

// --- Singleton pour le pipeline d'embedding ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PipelineInstance = any;

class EmbeddingPipeline {
  static task = 'feature-extraction';
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance: PipelineInstance = null;

  static async getInstance(): Promise<PipelineInstance> {
    if (this.instance === null) {
      logger.info('MigrationWorker', "Initialisation du modèle d'embedding");
      this.instance = await pipeline(this.task as any, this.model);
      logger.info('MigrationWorker', "Modèle d'embedding prêt");
    }
    return this.instance;
  }
}

// --- Fonction pour créer un embedding sémantique ---
async function createSemanticEmbedding(text: string): Promise<number[]> {
  const extractor = await EmbeddingPipeline.getInstance();
  const result = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(result.data);
}

// --- Fonction principale de migration ---
async function runMigration(): Promise<void> {
  try {
    logger.debug('MigrationWorker', "Vérification des versions d'embeddings");
    const allKeys = (await keys()) as string[];
    const memoryKeys = allKeys.filter(key => typeof key === 'string' && key.startsWith('memory_'));

    if (memoryKeys.length === 0) {
      logger.debug('MigrationWorker', 'Aucun souvenir à migrer');
      return;
    }

    let migratedCount = 0;
    
    for (const key of memoryKeys) {
      const item = await get(key) as MemoryItem | undefined;
      
      if (item && item.embeddingVersion !== CURRENT_EMBEDDING_MODEL_VERSION) {
        logger.debug('MigrationWorker', 'Ancien souvenir trouvé - mise à jour', { id: item.id });
        
        try {
          // Recalculer l'embedding avec le nouveau modèle
          const newEmbedding = await createSemanticEmbedding(item.text);
          
          // Mettre à jour l'item
          item.embedding = newEmbedding;
          item.embeddingVersion = CURRENT_EMBEDDING_MODEL_VERSION;
          
          await set(item.id, item);
          logger.debug('MigrationWorker', 'Souvenir mis à jour avec succès', { id: item.id });
          migratedCount++;
          
          // On ne fait qu'un seul item par cycle pour ne pas surcharger le CPU
          break;
        } catch (error) {
          logger.error('MigrationWorker', 'Erreur lors de la migration', { id: item.id, error });
        }
      }
    }
    
    if (migratedCount === 0) {
      logger.info('MigrationWorker', 'Tous les souvenirs sont à jour');
    } else {
      logger.info('MigrationWorker', 'Souvenirs migrés', { count: migratedCount });
    }
  } catch (error) {
    logger.error('MigrationWorker', 'Erreur lors du processus de migration', error);
  }
}

// --- Initialisation et démarrage automatique ---
logger.info('MigrationWorker', 'Worker démarré', { intervalSeconds: MIGRATION_INTERVAL / 1000 });

// Première migration après 30 secondes (laisser le temps au système de démarrer)
setTimeout(() => {
  runMigration();
  
  // Puis continuer avec l'intervalle régulier
  setInterval(runMigration, MIGRATION_INTERVAL);
}, 30000);

// Gestion des messages (pour permettre un contrôle manuel si nécessaire)
self.onmessage = async (event: MessageEvent) => {
  const { type } = event.data;

  try {
    if (type === 'trigger_migration') {
      logger.info('MigrationWorker', 'Migration manuelle déclenchée');
      await runMigration();
      self.postMessage({ type: 'migration_complete', payload: { success: true } });
    } else if (type === 'init') {
      logger.info('MigrationWorker', 'Worker initialisé');
      self.postMessage({ type: 'init_complete', payload: { success: true } });
    }
  } catch (error) {
    logger.error('MigrationWorker', 'Erreur', error);
    self.postMessage({ 
      type: 'migration_error', 
      payload: { error: (error as Error).message } 
    });
  }
};
