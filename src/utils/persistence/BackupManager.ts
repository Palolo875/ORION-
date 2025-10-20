// src/utils/persistence/BackupManager.ts

/**
 * Backup Manager
 * 
 * Gère la persistance long-terme de la mémoire avec:
 * - Sauvegardes automatiques périodiques
 * - Export/import vers le stockage local persistant
 * - Gestion des versions d'embeddings
 * - Récupération en cas de corruption de données
 */

import { get, set, keys, del } from 'idb-keyval';
import { MemoryItem } from '../../types';
import { logger } from '../logger';
import { storageManager } from '../browser/storageManager';

interface BackupMetadata {
  version: string;
  timestamp: number;
  itemCount: number;
  embeddingModel: string;
  embeddingVersion: string;
  backupId: string;
}

interface BackupData {
  metadata: BackupMetadata;
  memories: MemoryItem[];
}

export class BackupManager {
  private readonly BACKUP_PREFIX = 'orion_backup_';
  private readonly BACKUP_INTERVAL = 60 * 60 * 1000; // 1 heure
  private readonly MAX_BACKUPS = 5; // Garder les 5 dernières sauvegardes
  private readonly BACKUP_VERSION = '1.0';
  private backupIntervalId: number | null = null;

  constructor() {
    // Demander la persistance dès le démarrage
    this.requestPersistence();
  }

  /**
   * Démarre les sauvegardes automatiques
   */
  startAutoBackup(): void {
    if (this.backupIntervalId !== null) {
      logger.warn('BackupManager', 'Les sauvegardes automatiques sont déjà actives');
      return;
    }

    logger.info('BackupManager', 'Démarrage des sauvegardes automatiques', {
      intervalMinutes: this.BACKUP_INTERVAL / 60000
    });

    // Première sauvegarde après 5 minutes
    setTimeout(() => this.createBackup('auto'), 5 * 60 * 1000);

    // Puis toutes les heures
    this.backupIntervalId = setInterval(() => {
      this.createBackup('auto');
    }, this.BACKUP_INTERVAL) as unknown as number;
  }

  /**
   * Arrête les sauvegardes automatiques
   */
  stopAutoBackup(): void {
    if (this.backupIntervalId !== null) {
      clearInterval(this.backupIntervalId);
      this.backupIntervalId = null;
      logger.info('BackupManager', 'Sauvegardes automatiques arrêtées');
    }
  }

  /**
   * Demande la persistance du stockage
   */
  private async requestPersistence(): Promise<void> {
    try {
      const isPersisted = await storageManager.requestPersistence();
      if (isPersisted) {
        logger.info('BackupManager', 'Stockage persistant activé - Les données survivront aux redémarrages');
      } else {
        logger.warn('BackupManager', 'Stockage non persistant - Les données peuvent être effacées par le navigateur');
      }
    } catch (error) {
      logger.error('BackupManager', 'Erreur lors de la demande de persistance', error);
    }
  }

  /**
   * Crée une sauvegarde de toutes les mémoires
   */
  async createBackup(type: 'manual' | 'auto' = 'manual'): Promise<string | null> {
    try {
      logger.info('BackupManager', `Création d'une sauvegarde (${type})`);

      // Récupérer toutes les mémoires
      const allKeys = (await keys()) as string[];
      const memoryKeys = allKeys.filter(key => typeof key === 'string' && key.startsWith('memory_'));

      if (memoryKeys.length === 0) {
        logger.debug('BackupManager', 'Aucune mémoire à sauvegarder');
        return null;
      }

      const memories: MemoryItem[] = [];
      for (const key of memoryKeys) {
        const item = await get(key) as MemoryItem;
        if (item) {
          memories.push(item);
        }
      }

      const backupId = `${this.BACKUP_PREFIX}${Date.now()}`;
      const metadata: BackupMetadata = {
        version: this.BACKUP_VERSION,
        timestamp: Date.now(),
        itemCount: memories.length,
        embeddingModel: memories[0]?.embeddingVersion || 'unknown',
        embeddingVersion: memories[0]?.embeddingVersion || 'unknown',
        backupId
      };

      const backup: BackupData = {
        metadata,
        memories
      };

      // Sauvegarder dans IndexedDB
      await set(backupId, backup);
      
      logger.info('BackupManager', 'Sauvegarde créée avec succès', {
        backupId,
        itemCount: memories.length,
        sizeKB: Math.round(JSON.stringify(backup).length / 1024)
      });

      // Nettoyer les anciennes sauvegardes
      await this.cleanOldBackups();

      return backupId;
    } catch (error) {
      logger.error('BackupManager', 'Erreur lors de la création de la sauvegarde', error);
      return null;
    }
  }

  /**
   * Nettoie les anciennes sauvegardes (garde seulement les N plus récentes)
   */
  private async cleanOldBackups(): Promise<void> {
    try {
      const allKeys = (await keys()) as string[];
      const backupKeys = allKeys
        .filter(key => typeof key === 'string' && key.startsWith(this.BACKUP_PREFIX))
        .sort()
        .reverse();

      if (backupKeys.length > this.MAX_BACKUPS) {
        const toDelete = backupKeys.slice(this.MAX_BACKUPS);
        
        for (const key of toDelete) {
          await del(key);
          logger.debug('BackupManager', 'Ancienne sauvegarde supprimée', { backupId: key });
        }

        logger.info('BackupManager', 'Nettoyage des anciennes sauvegardes', {
          deleted: toDelete.length,
          remaining: this.MAX_BACKUPS
        });
      }
    } catch (error) {
      logger.error('BackupManager', 'Erreur lors du nettoyage des sauvegardes', error);
    }
  }

  /**
   * Liste toutes les sauvegardes disponibles
   */
  async listBackups(): Promise<BackupMetadata[]> {
    try {
      const allKeys = (await keys()) as string[];
      const backupKeys = allKeys
        .filter(key => typeof key === 'string' && key.startsWith(this.BACKUP_PREFIX))
        .sort()
        .reverse();

      const backups: BackupMetadata[] = [];
      for (const key of backupKeys) {
        const backup = await get(key) as BackupData;
        if (backup && backup.metadata) {
          backups.push(backup.metadata);
        }
      }

      return backups;
    } catch (error) {
      logger.error('BackupManager', 'Erreur lors du listage des sauvegardes', error);
      return [];
    }
  }

  /**
   * Restaure une sauvegarde
   */
  async restoreBackup(backupId: string, clearExisting: boolean = true): Promise<boolean> {
    try {
      logger.info('BackupManager', 'Restauration de la sauvegarde', { backupId, clearExisting });

      const backup = await get(backupId) as BackupData;
      if (!backup) {
        logger.error('BackupManager', 'Sauvegarde non trouvée', { backupId });
        return false;
      }

      // Effacer les mémoires existantes si demandé
      if (clearExisting) {
        const allKeys = (await keys()) as string[];
        const memoryKeys = allKeys.filter(key => typeof key === 'string' && key.startsWith('memory_'));
        
        for (const key of memoryKeys) {
          await del(key);
        }
        
        logger.debug('BackupManager', 'Mémoires existantes effacées', { count: memoryKeys.length });
      }

      // Restaurer les mémoires
      for (const memory of backup.memories) {
        await set(memory.id, memory);
      }

      logger.info('BackupManager', 'Sauvegarde restaurée avec succès', {
        itemCount: backup.memories.length,
        timestamp: new Date(backup.metadata.timestamp).toISOString()
      });

      return true;
    } catch (error) {
      logger.error('BackupManager', 'Erreur lors de la restauration', error);
      return false;
    }
  }

  /**
   * Exporte une sauvegarde vers un fichier JSON
   */
  async exportToFile(backupId?: string): Promise<string | null> {
    try {
      let backup: BackupData;

      if (backupId) {
        // Exporter une sauvegarde spécifique
        const existingBackup = await get(backupId) as BackupData;
        if (!existingBackup) {
          logger.error('BackupManager', 'Sauvegarde non trouvée pour export', { backupId });
          return null;
        }
        backup = existingBackup;
      } else {
        // Créer une nouvelle sauvegarde pour export
        const allKeys = (await keys()) as string[];
        const memoryKeys = allKeys.filter(key => typeof key === 'string' && key.startsWith('memory_'));

        const memories: MemoryItem[] = [];
        for (const key of memoryKeys) {
          const item = await get(key) as MemoryItem;
          if (item) {
            memories.push(item);
          }
        }

        backup = {
          metadata: {
            version: this.BACKUP_VERSION,
            timestamp: Date.now(),
            itemCount: memories.length,
            embeddingModel: memories[0]?.embeddingVersion || 'unknown',
            embeddingVersion: memories[0]?.embeddingVersion || 'unknown',
            backupId: `export_${Date.now()}`
          },
          memories
        };
      }

      const json = JSON.stringify(backup, null, 2);
      logger.info('BackupManager', 'Export créé', {
        itemCount: backup.metadata.itemCount,
        sizeKB: Math.round(json.length / 1024)
      });

      return json;
    } catch (error) {
      logger.error('BackupManager', 'Erreur lors de l\'export', error);
      return null;
    }
  }

  /**
   * Importe une sauvegarde depuis un fichier JSON
   */
  async importFromFile(jsonData: string, clearExisting: boolean = true): Promise<boolean> {
    try {
      logger.info('BackupManager', 'Import depuis fichier', { clearExisting });

      const backup = JSON.parse(jsonData) as BackupData;

      // Valider la structure
      if (!backup.metadata || !backup.memories) {
        logger.error('BackupManager', 'Format de sauvegarde invalide');
        return false;
      }

      // Effacer les mémoires existantes si demandé
      if (clearExisting) {
        const allKeys = (await keys()) as string[];
        const memoryKeys = allKeys.filter(key => typeof key === 'string' && key.startsWith('memory_'));
        
        for (const key of memoryKeys) {
          await del(key);
        }
      }

      // Importer les mémoires
      for (const memory of backup.memories) {
        await set(memory.id, memory);
      }

      logger.info('BackupManager', 'Import réussi', {
        itemCount: backup.memories.length,
        embeddingVersion: backup.metadata.embeddingVersion
      });

      return true;
    } catch (error) {
      logger.error('BackupManager', 'Erreur lors de l\'import', error);
      return false;
    }
  }

  /**
   * Vérifie l'intégrité d'une sauvegarde
   */
  async verifyBackup(backupId: string): Promise<{ valid: boolean; issues: string[] }> {
    try {
      const backup = await get(backupId) as BackupData;
      const issues: string[] = [];

      if (!backup) {
        return { valid: false, issues: ['Sauvegarde non trouvée'] };
      }

      if (!backup.metadata) {
        issues.push('Métadonnées manquantes');
      }

      if (!backup.memories || !Array.isArray(backup.memories)) {
        issues.push('Données de mémoire invalides');
      }

      if (backup.metadata && backup.memories) {
        if (backup.metadata.itemCount !== backup.memories.length) {
          issues.push(`Nombre d'items incorrect: attendu ${backup.metadata.itemCount}, trouvé ${backup.memories.length}`);
        }

        // Vérifier que chaque mémoire a les champs requis
        for (let i = 0; i < backup.memories.length; i++) {
          const mem = backup.memories[i];
          if (!mem.id || !mem.text || !mem.embedding || !mem.embeddingVersion) {
            issues.push(`Mémoire ${i} incomplète`);
          }
        }
      }

      return { valid: issues.length === 0, issues };
    } catch (error) {
      return { valid: false, issues: [`Erreur lors de la vérification: ${(error as Error).message}`] };
    }
  }

  /**
   * Obtient des statistiques sur les sauvegardes
   */
  async getBackupStats(): Promise<{
    totalBackups: number;
    totalSizeKB: number;
    oldestBackup: number | null;
    newestBackup: number | null;
  }> {
    try {
      const backups = await this.listBackups();
      
      let totalSize = 0;
      for (const backup of backups) {
        const data = await get(backup.backupId);
        if (data) {
          totalSize += JSON.stringify(data).length;
        }
      }

      return {
        totalBackups: backups.length,
        totalSizeKB: Math.round(totalSize / 1024),
        oldestBackup: backups.length > 0 ? backups[backups.length - 1].timestamp : null,
        newestBackup: backups.length > 0 ? backups[0].timestamp : null,
      };
    } catch (error) {
      logger.error('BackupManager', 'Erreur lors du calcul des statistiques', error);
      return {
        totalBackups: 0,
        totalSizeKB: 0,
        oldestBackup: null,
        newestBackup: null,
      };
    }
  }
}

// Instance singleton
export const backupManager = new BackupManager();
