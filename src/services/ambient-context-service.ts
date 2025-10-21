/**
 * Service de Gestion du Contexte Ambiant
 * 
 * Gère la persistance et la récupération des contextes ambiants
 * via IndexedDB (utilisant idb-keyval pour la simplicité).
 */

import { get, set, del, keys } from 'idb-keyval';
import type { 
  AmbientContext, 
  AmbientContextServiceResult,
  AmbientContextValidationError 
} from '../types/ambient-context';
import { AMBIENT_CONTEXT_CONSTRAINTS } from '../types/ambient-context';
import { logger } from '../utils/logger';

const STORAGE_KEY_PREFIX = 'orion_ambient_context_';

class AmbientContextService {
  /**
   * Valide le contenu d'un contexte ambiant
   */
  private validateContent(content: string): AmbientContextValidationError | null {
    const trimmed = content.trim();
    
    if (trimmed.length < AMBIENT_CONTEXT_CONSTRAINTS.MIN_LENGTH) {
      return {
        field: 'content',
        message: `Le contexte doit contenir au moins ${AMBIENT_CONTEXT_CONSTRAINTS.MIN_LENGTH} caractères.`
      };
    }
    
    if (trimmed.length > AMBIENT_CONTEXT_CONSTRAINTS.MAX_LENGTH) {
      return {
        field: 'content',
        message: `Le contexte ne peut pas dépasser ${AMBIENT_CONTEXT_CONSTRAINTS.MAX_LENGTH} caractères.`
      };
    }
    
    return null;
  }

  /**
   * Génère un ID unique pour un contexte
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Récupère tous les contextes ambiants
   */
  async getContexts(): Promise<AmbientContext[]> {
    try {
      const allKeys = await keys();
      const contextKeys = allKeys.filter(k => 
        typeof k === 'string' && k.startsWith(STORAGE_KEY_PREFIX)
      ) as string[];
      
      const contexts: AmbientContext[] = [];
      
      for (const key of contextKeys) {
        try {
          const context = await get<AmbientContext>(key);
          if (context) {
            contexts.push(context);
          }
        } catch (error) {
          logger.error('AmbientContextService', `Erreur lors de la lecture du contexte ${key}`, error);
        }
      }
      
      // Trier par date de mise à jour (plus récent en premier)
      return contexts.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      logger.error('AmbientContextService', 'Erreur lors de la récupération des contextes', error);
      return [];
    }
  }

  /**
   * Récupère uniquement les contextes actifs
   */
  async getActiveContexts(): Promise<AmbientContext[]> {
    const all = await this.getContexts();
    return all.filter(c => c.isActive);
  }

  /**
   * Sauvegarde un nouveau contexte ambiant
   */
  async saveContext(
    content: string, 
    title?: string
  ): Promise<AmbientContextServiceResult<AmbientContext>> {
    try {
      // Validation
      const error = this.validateContent(content);
      if (error) {
        return { success: false, error: error.message };
      }

      // Vérifier le nombre de contextes existants
      const existing = await this.getContexts();
      if (existing.length >= AMBIENT_CONTEXT_CONSTRAINTS.MAX_CONTEXTS) {
        return {
          success: false,
          error: `Vous ne pouvez pas créer plus de ${AMBIENT_CONTEXT_CONSTRAINTS.MAX_CONTEXTS} contextes.`
        };
      }

      // Vérifier le nombre de contextes actifs
      const activeCount = existing.filter(c => c.isActive).length;
      const isActive = activeCount < AMBIENT_CONTEXT_CONSTRAINTS.MAX_ACTIVE_CONTEXTS;

      const context: AmbientContext = {
        id: this.generateId(),
        content: content.trim(),
        title,
        isActive,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await set(`${STORAGE_KEY_PREFIX}${context.id}`, context);
      
      logger.info('AmbientContextService', 'Contexte sauvegardé', { id: context.id });
      return { success: true, data: context };
    } catch (error) {
      logger.error('AmbientContextService', 'Erreur lors de la sauvegarde', error);
      return { 
        success: false, 
        error: 'Impossible de sauvegarder le contexte. Vérifiez que votre navigateur autorise le stockage.' 
      };
    }
  }

  /**
   * Met à jour un contexte existant
   */
  async updateContext(
    id: string,
    updates: Partial<Pick<AmbientContext, 'content' | 'isActive' | 'title'>>
  ): Promise<AmbientContextServiceResult<AmbientContext>> {
    try {
      const existing = await get<AmbientContext>(`${STORAGE_KEY_PREFIX}${id}`);
      
      if (!existing) {
        return { success: false, error: 'Contexte introuvable.' };
      }

      // Valider le nouveau contenu si fourni
      if (updates.content !== undefined) {
        const error = this.validateContent(updates.content);
        if (error) {
          return { success: false, error: error.message };
        }
      }

      // Si on active un contexte, vérifier la limite
      if (updates.isActive === true && !existing.isActive) {
        const activeContexts = await this.getActiveContexts();
        if (activeContexts.length >= AMBIENT_CONTEXT_CONSTRAINTS.MAX_ACTIVE_CONTEXTS) {
          return {
            success: false,
            error: `Vous ne pouvez pas activer plus de ${AMBIENT_CONTEXT_CONSTRAINTS.MAX_ACTIVE_CONTEXTS} contextes simultanément.`
          };
        }
      }

      const updated: AmbientContext = {
        ...existing,
        ...updates,
        content: updates.content?.trim() ?? existing.content,
        updatedAt: Date.now(),
      };

      await set(`${STORAGE_KEY_PREFIX}${id}`, updated);
      
      logger.info('AmbientContextService', 'Contexte mis à jour', { id });
      return { success: true, data: updated };
    } catch (error) {
      logger.error('AmbientContextService', 'Erreur lors de la mise à jour', error);
      return { success: false, error: 'Impossible de mettre à jour le contexte.' };
    }
  }

  /**
   * Supprime un contexte
   */
  async deleteContext(id: string): Promise<AmbientContextServiceResult> {
    try {
      await del(`${STORAGE_KEY_PREFIX}${id}`);
      logger.info('AmbientContextService', 'Contexte supprimé', { id });
      return { success: true };
    } catch (error) {
      logger.error('AmbientContextService', 'Erreur lors de la suppression', error);
      return { success: false, error: 'Impossible de supprimer le contexte.' };
    }
  }

  /**
   * Formate les contextes actifs pour injection dans le prompt LLM
   */
  async getFormattedContextForLLM(): Promise<string> {
    try {
      const activeContexts = await this.getActiveContexts();
      
      if (activeContexts.length === 0) {
        return '';
      }

      const formatted = activeContexts
        .map((ctx, idx) => {
          const title = ctx.title ? `[${ctx.title}] ` : '';
          return `${idx + 1}. ${title}${ctx.content}`;
        })
        .join('\n');

      return `CONTEXTE AMBIANT (Information persistante à prendre en compte):\n${formatted}\n`;
    } catch (error) {
      logger.error('AmbientContextService', 'Erreur lors du formatage pour LLM', error);
      return ''; // Fallback silencieux
    }
  }

  /**
   * Compte le nombre de contextes actifs
   */
  async getActiveContextCount(): Promise<number> {
    const active = await this.getActiveContexts();
    return active.length;
  }
}

// Instance singleton
export const ambientContextService = new AmbientContextService();
