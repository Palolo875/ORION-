/**
 * Service de Gestion des Agents Personnalisés
 * 
 * CRUD complet pour les agents personnalisés créés par l'utilisateur.
 */

import { get, set, del, keys } from 'idb-keyval';
import type { 
  CustomAgent, 
  CustomAgentServiceResult,
  CustomAgentValidationError,
  AgentPreset
} from '../types/custom-agent';
import { CUSTOM_AGENT_CONSTRAINTS } from '../types/custom-agent';
import { logger } from '../utils/logger';

const STORAGE_KEY_PREFIX = 'orion_custom_agent_';

class CustomAgentService {
  /**
   * Valide un agent personnalisé
   */
  private validate(agent: Partial<CustomAgent>): CustomAgentValidationError | null {
    // Validation du nom
    if (agent.name) {
      const nameLength = agent.name.trim().length;
      if (nameLength < CUSTOM_AGENT_CONSTRAINTS.MIN_NAME_LENGTH) {
        return {
          field: 'name',
          message: `Le nom doit contenir au moins ${CUSTOM_AGENT_CONSTRAINTS.MIN_NAME_LENGTH} caractères.`
        };
      }
      if (nameLength > CUSTOM_AGENT_CONSTRAINTS.MAX_NAME_LENGTH) {
        return {
          field: 'name',
          message: `Le nom ne peut pas dépasser ${CUSTOM_AGENT_CONSTRAINTS.MAX_NAME_LENGTH} caractères.`
        };
      }
    }

    // Validation de la description
    if (agent.description) {
      const descLength = agent.description.trim().length;
      if (descLength < CUSTOM_AGENT_CONSTRAINTS.MIN_DESCRIPTION_LENGTH) {
        return {
          field: 'description',
          message: `La description doit contenir au moins ${CUSTOM_AGENT_CONSTRAINTS.MIN_DESCRIPTION_LENGTH} caractères.`
        };
      }
      if (descLength > CUSTOM_AGENT_CONSTRAINTS.MAX_DESCRIPTION_LENGTH) {
        return {
          field: 'description',
          message: `La description ne peut pas dépasser ${CUSTOM_AGENT_CONSTRAINTS.MAX_DESCRIPTION_LENGTH} caractères.`
        };
      }
    }

    // Validation du system prompt
    if (agent.systemPrompt) {
      const promptLength = agent.systemPrompt.trim().length;
      if (promptLength < CUSTOM_AGENT_CONSTRAINTS.MIN_PROMPT_LENGTH) {
        return {
          field: 'systemPrompt',
          message: `Le prompt doit contenir au moins ${CUSTOM_AGENT_CONSTRAINTS.MIN_PROMPT_LENGTH} caractères.`
        };
      }
      if (promptLength > CUSTOM_AGENT_CONSTRAINTS.MAX_PROMPT_LENGTH) {
        return {
          field: 'systemPrompt',
          message: `Le prompt ne peut pas dépasser ${CUSTOM_AGENT_CONSTRAINTS.MAX_PROMPT_LENGTH} caractères.`
        };
      }
    }

    // Validation temperature
    if (agent.temperature !== undefined) {
      if (agent.temperature < CUSTOM_AGENT_CONSTRAINTS.MIN_TEMPERATURE || 
          agent.temperature > CUSTOM_AGENT_CONSTRAINTS.MAX_TEMPERATURE) {
        return {
          field: 'temperature',
          message: `La température doit être entre ${CUSTOM_AGENT_CONSTRAINTS.MIN_TEMPERATURE} et ${CUSTOM_AGENT_CONSTRAINTS.MAX_TEMPERATURE}.`
        };
      }
    }

    // Validation maxTokens
    if (agent.maxTokens !== undefined) {
      if (agent.maxTokens < CUSTOM_AGENT_CONSTRAINTS.MIN_MAX_TOKENS || 
          agent.maxTokens > CUSTOM_AGENT_CONSTRAINTS.MAX_MAX_TOKENS) {
        return {
          field: 'maxTokens',
          message: `Les tokens doivent être entre ${CUSTOM_AGENT_CONSTRAINTS.MIN_MAX_TOKENS} et ${CUSTOM_AGENT_CONSTRAINTS.MAX_MAX_TOKENS}.`
        };
      }
    }

    return null;
  }

  /**
   * Génère un ID unique
   */
  private generateId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Récupère tous les agents personnalisés
   */
  async getAgents(): Promise<CustomAgent[]> {
    try {
      const allKeys = await keys();
      const agentKeys = allKeys.filter(k => 
        typeof k === 'string' && k.startsWith(STORAGE_KEY_PREFIX)
      ) as string[];
      
      const agents: CustomAgent[] = [];
      
      for (const key of agentKeys) {
        try {
          const agent = await get<CustomAgent>(key);
          if (agent) {
            agents.push(agent);
          }
        } catch (error) {
          logger.error('CustomAgentService', `Erreur lecture agent ${key}`, error);
        }
      }
      
      // Trier par date de mise à jour (plus récent en premier)
      return agents.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      logger.error('CustomAgentService', 'Erreur récupération agents', error);
      return [];
    }
  }

  /**
   * Récupère un agent par ID
   */
  async getAgentById(id: string): Promise<CustomAgent | null> {
    try {
      const agent = await get<CustomAgent>(`${STORAGE_KEY_PREFIX}${id}`);
      return agent || null;
    } catch (error) {
      logger.error('CustomAgentService', 'Erreur récupération agent', error);
      return null;
    }
  }

  /**
   * Sauvegarde un nouvel agent
   */
  async saveAgent(
    agentData: Omit<CustomAgent, 'id' | 'createdAt' | 'updatedAt' | 'useCount'>
  ): Promise<CustomAgentServiceResult<CustomAgent>> {
    try {
      // Validation
      const error = this.validate(agentData);
      if (error) {
        return { success: false, error: error.message };
      }

      // Vérifier le nombre d'agents existants
      const existing = await this.getAgents();
      if (existing.length >= CUSTOM_AGENT_CONSTRAINTS.MAX_AGENTS) {
        return {
          success: false,
          error: `Vous ne pouvez pas créer plus de ${CUSTOM_AGENT_CONSTRAINTS.MAX_AGENTS} agents.`
        };
      }

      const agent: CustomAgent = {
        ...agentData,
        id: this.generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        useCount: 0,
      };

      await set(`${STORAGE_KEY_PREFIX}${agent.id}`, agent);
      
      logger.info('CustomAgentService', 'Agent créé', { id: agent.id, name: agent.name });
      return { success: true, data: agent };
    } catch (error) {
      logger.error('CustomAgentService', 'Erreur sauvegarde agent', error);
      return { 
        success: false, 
        error: 'Impossible de sauvegarder l\'agent.' 
      };
    }
  }

  /**
   * Met à jour un agent existant
   */
  async updateAgent(
    id: string,
    updates: Partial<Omit<CustomAgent, 'id' | 'createdAt' | 'useCount'>>
  ): Promise<CustomAgentServiceResult<CustomAgent>> {
    try {
      const existing = await get<CustomAgent>(`${STORAGE_KEY_PREFIX}${id}`);
      
      if (!existing) {
        return { success: false, error: 'Agent introuvable.' };
      }

      // Valider les mises à jour
      const error = this.validate(updates);
      if (error) {
        return { success: false, error: error.message };
      }

      const updated: CustomAgent = {
        ...existing,
        ...updates,
        updatedAt: Date.now(),
      };

      await set(`${STORAGE_KEY_PREFIX}${id}`, updated);
      
      logger.info('CustomAgentService', 'Agent mis à jour', { id, name: updated.name });
      return { success: true, data: updated };
    } catch (error) {
      logger.error('CustomAgentService', 'Erreur mise à jour agent', error);
      return { success: false, error: 'Impossible de mettre à jour l\'agent.' };
    }
  }

  /**
   * Supprime un agent
   */
  async deleteAgent(id: string): Promise<CustomAgentServiceResult> {
    try {
      await del(`${STORAGE_KEY_PREFIX}${id}`);
      logger.info('CustomAgentService', 'Agent supprimé', { id });
      return { success: true };
    } catch (error) {
      logger.error('CustomAgentService', 'Erreur suppression agent', error);
      return { success: false, error: 'Impossible de supprimer l\'agent.' };
    }
  }

  /**
   * Crée un agent depuis un preset
   */
  async createFromPreset(preset: AgentPreset): Promise<CustomAgentServiceResult<CustomAgent>> {
    return await this.saveAgent({
      name: preset.name,
      description: preset.description,
      systemPrompt: preset.systemPrompt,
      category: preset.category,
      temperature: preset.temperature,
      maxTokens: preset.maxTokens,
      isActive: true,
    });
  }

  /**
   * Incrémente le compteur d'utilisation d'un agent
   */
  async incrementUseCount(id: string): Promise<void> {
    try {
      const agent = await get<CustomAgent>(`${STORAGE_KEY_PREFIX}${id}`);
      if (agent) {
        agent.useCount = (agent.useCount || 0) + 1;
        agent.updatedAt = Date.now();
        await set(`${STORAGE_KEY_PREFIX}${id}`, agent);
      }
    } catch (error) {
      logger.error('CustomAgentService', 'Erreur incrémentation useCount', error);
    }
  }

  /**
   * Duplique un agent existant
   */
  async duplicateAgent(id: string): Promise<CustomAgentServiceResult<CustomAgent>> {
    try {
      const agent = await get<CustomAgent>(`${STORAGE_KEY_PREFIX}${id}`);
      if (!agent) {
        return { success: false, error: 'Agent introuvable.' };
      }

      return await this.saveAgent({
        name: `${agent.name} (copie)`,
        description: agent.description,
        systemPrompt: agent.systemPrompt,
        category: agent.category,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        isActive: false, // Désactivé par défaut
      });
    } catch (error) {
      logger.error('CustomAgentService', 'Erreur duplication agent', error);
      return { success: false, error: 'Impossible de dupliquer l\'agent.' };
    }
  }
}

// Instance singleton
export const customAgentService = new CustomAgentService();
