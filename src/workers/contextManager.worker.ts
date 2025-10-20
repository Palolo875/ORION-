// src/workers/contextManager.worker.ts

/**
 * Context Manager Worker - Enhanced
 * 
 * Gère la compression et l'optimisation du contexte de conversation avec :
 * - Extraction d'entités nommées (noms, dates, lieux, etc.)
 * - Mémoire de travail vs mémoire à long terme
 * - Graph de connaissances pour structurer les informations importantes
 * - Résumés intelligents avec préservation des entités clés
 */

import { CONTEXT_CONFIG } from '../config/constants';
import { logger } from '../utils/logger';

interface ConversationMessage {
  sender: 'user' | 'orion';
  text: string;
  id?: string;
  importance?: number;
  timestamp?: number;
  entities?: ExtractedEntity[];
}

interface ContextCompressionRequest {
  messages: ConversationMessage[];
  maxTokens?: number;
}

interface ContextCompressionResult {
  compressedMessages: ConversationMessage[];
  originalCount: number;
  compressedCount: number;
  tokensSaved: number;
  entities: ExtractedEntity[];
  knowledgeGraph?: KnowledgeGraph;
}

interface ExtractedEntity {
  type: 'person' | 'date' | 'location' | 'organization' | 'number' | 'email' | 'url' | 'concept';
  value: string;
  context: string;
  importance: number;
  firstMentioned: number;
  lastMentioned: number;
  frequency: number;
}

interface KnowledgeGraph {
  entities: Record<string, ExtractedEntity>;
  relationships: Array<{
    from: string;
    to: string;
    type: string;
    context: string;
  }>;
}

// === Extraction d'Entités Nommées ===

class EntityExtractor {
  /**
   * Extrait les entités nommées d'un texte
   */
  extractEntities(text: string, timestamp: number = Date.now()): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    
    // 1. Noms propres (capitalisés)
    const namePattern = /\b[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+(?:\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+)*\b/g;
    let match;
    while ((match = namePattern.exec(text)) !== null) {
      const value = match[0];
      // Exclure les mots courants en début de phrase
      const commonWords = ['Le', 'La', 'Les', 'Un', 'Une', 'Des', 'Ce', 'Cette', 'Ces', 'Mon', 'Ma', 'Mes'];
      if (!commonWords.includes(value)) {
        entities.push({
          type: 'person',
          value,
          context: this.getContext(text, match.index, 30),
          importance: 0.8,
          firstMentioned: timestamp,
          lastMentioned: timestamp,
          frequency: 1,
        });
      }
    }
    
    // 2. Dates
    const datePatterns = [
      /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/g, // 01/01/2024
      /\d{4}-\d{2}-\d{2}/g, // 2024-01-01
      /(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}/gi,
      /(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+\d{1,2}/gi,
    ];
    
    for (const pattern of datePatterns) {
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: 'date',
          value: match[0],
          context: this.getContext(text, match.index, 30),
          importance: 0.7,
          firstMentioned: timestamp,
          lastMentioned: timestamp,
          frequency: 1,
        });
      }
    }
    
    // 3. Emails
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    while ((match = emailPattern.exec(text)) !== null) {
      entities.push({
        type: 'email',
        value: match[0],
        context: this.getContext(text, match.index, 30),
        importance: 0.9,
        firstMentioned: timestamp,
        lastMentioned: timestamp,
        frequency: 1,
      });
    }
    
    // 4. URLs
    const urlPattern = /https?:\/\/[^\s]+/g;
    while ((match = urlPattern.exec(text)) !== null) {
      entities.push({
        type: 'url',
        value: match[0],
        context: this.getContext(text, match.index, 30),
        importance: 0.8,
        firstMentioned: timestamp,
        lastMentioned: timestamp,
        frequency: 1,
      });
    }
    
    // 5. Nombres importants
    const numberPattern = /\b\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?\s*(?:€|euros?|\$|dollars?|%|pourcent|kg|tonnes?|km|metres?)\b/gi;
    while ((match = numberPattern.exec(text)) !== null) {
      entities.push({
        type: 'number',
        value: match[0],
        context: this.getContext(text, match.index, 30),
        importance: 0.6,
        firstMentioned: timestamp,
        lastMentioned: timestamp,
        frequency: 1,
      });
    }
    
    // 6. Concepts importants (mots-clés en majuscules ou entre guillemets)
    const conceptPattern = /(?:"([^"]+)"|«([^»]+)»|`([^`]+)`)/g;
    while ((match = conceptPattern.exec(text)) !== null) {
      const value = match[1] || match[2] || match[3];
      if (value && value.length > 2) {
        entities.push({
          type: 'concept',
          value,
          context: this.getContext(text, match.index, 30),
          importance: 0.7,
          firstMentioned: timestamp,
          lastMentioned: timestamp,
          frequency: 1,
        });
      }
    }
    
    return entities;
  }
  
  private getContext(text: string, index: number, length: number): string {
    const start = Math.max(0, index - length);
    const end = Math.min(text.length, index + length);
    return text.substring(start, end).trim();
  }
  
  /**
   * Fusionne les entités similaires
   */
  mergeEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const merged: Map<string, ExtractedEntity> = new Map();
    
    for (const entity of entities) {
      const key = `${entity.type}:${entity.value.toLowerCase()}`;
      
      if (merged.has(key)) {
        const existing = merged.get(key)!;
        existing.frequency++;
        existing.lastMentioned = entity.lastMentioned;
        existing.importance = Math.min(1, existing.importance + 0.1);
      } else {
        merged.set(key, { ...entity });
      }
    }
    
    return Array.from(merged.values()).sort((a, b) => b.importance - a.importance);
  }
}

// === Graph de Connaissances ===

class KnowledgeGraphBuilder {
  buildGraph(messages: ConversationMessage[], entities: ExtractedEntity[]): KnowledgeGraph {
    const entityMap: Record<string, ExtractedEntity> = {};
    
    for (const entity of entities) {
      const key = `${entity.type}:${entity.value}`;
      entityMap[key] = entity;
    }
    
    // Détecter les relations entre entités
    const relationships: Array<{from: string, to: string, type: string, context: string}> = [];
    
    for (const message of messages) {
      const messageEntities = message.entities || [];
      
      // Créer des relations entre entités co-occurrentes
      for (let i = 0; i < messageEntities.length; i++) {
        for (let j = i + 1; j < messageEntities.length; j++) {
          const from = `${messageEntities[i].type}:${messageEntities[i].value}`;
          const to = `${messageEntities[j].type}:${messageEntities[j].value}`;
          
          relationships.push({
            from,
            to,
            type: 'co-mentioned',
            context: message.text.substring(0, 100),
          });
        }
      }
    }
    
    return {
      entities: entityMap,
      relationships,
    };
  }
}

// === Context Manager ===

class ContextManager {
  private entityExtractor = new EntityExtractor();
  private graphBuilder = new KnowledgeGraphBuilder();
  
  /**
   * Compresse l'historique de conversation pour respecter la limite de tokens
   */
  async compressContext(
    messages: ConversationMessage[],
    maxTokens: number = CONTEXT_CONFIG.MAX_TOKENS
  ): Promise<ContextCompressionResult> {
    if (messages.length === 0) {
      return {
        compressedMessages: [],
        originalCount: 0,
        compressedCount: 0,
        tokensSaved: 0,
        entities: [],
      };
    }

    // 1. Extraire les entités de tous les messages
    const allEntities: ExtractedEntity[] = [];
    for (const msg of messages) {
      const entities = this.entityExtractor.extractEntities(msg.text, msg.timestamp);
      msg.entities = entities;
      allEntities.push(...entities);
    }
    
    const mergedEntities = this.entityExtractor.mergeEntities(allEntities);
    
    // 2. Toujours garder les messages récents (mémoire de travail)
    const recentCount = Math.min(CONTEXT_CONFIG.RECENT_MESSAGE_COUNT, messages.length);
    const recentMessages = messages.slice(-recentCount);
    
    // 3. Traiter les anciens messages (mémoire à long terme)
    const oldMessages = messages.slice(0, -recentCount);
    
    if (oldMessages.length === 0) {
      return {
        compressedMessages: messages,
        originalCount: messages.length,
        compressedCount: messages.length,
        tokensSaved: 0,
        entities: mergedEntities,
        knowledgeGraph: this.graphBuilder.buildGraph(messages, mergedEntities),
      };
    }

    // 4. Sélectionner les messages importants de l'ancien historique
    const importantOldMessages = this.selectImportantMessages(oldMessages, CONTEXT_CONFIG.IMPORTANT_MESSAGE_LIMIT);
    
    // 5. Créer un résumé enrichi avec entités
    const combinedMessages = [...importantOldMessages, ...recentMessages];
    const estimatedTokens = combinedMessages.length * CONTEXT_CONFIG.TOKENS_PER_MESSAGE_ESTIMATE;
    
    if (estimatedTokens > maxTokens && oldMessages.length > 0) {
      const summary = this.createEnhancedSummary(oldMessages, mergedEntities);
      const summaryMessage: ConversationMessage = {
        sender: 'orion',
        text: summary,
        id: `summary_${Date.now()}`,
        importance: 1,
        timestamp: Date.now(),
        entities: mergedEntities.slice(0, 10), // Top 10 entités
      };
      
      return {
        compressedMessages: [summaryMessage, ...recentMessages],
        originalCount: messages.length,
        compressedCount: recentMessages.length + 1,
        tokensSaved: (messages.length - recentMessages.length - 1) * CONTEXT_CONFIG.TOKENS_PER_MESSAGE_ESTIMATE,
        entities: mergedEntities,
        knowledgeGraph: this.graphBuilder.buildGraph(messages, mergedEntities),
      };
    }
    
    return {
      compressedMessages: combinedMessages,
      originalCount: messages.length,
      compressedCount: combinedMessages.length,
      tokensSaved: (messages.length - combinedMessages.length) * CONTEXT_CONFIG.TOKENS_PER_MESSAGE_ESTIMATE,
      entities: mergedEntities,
      knowledgeGraph: this.graphBuilder.buildGraph(messages, mergedEntities),
    };
  }

  /**
   * Sélectionne les messages les plus importants
   */
  private selectImportantMessages(
    messages: ConversationMessage[],
    limit: number
  ): ConversationMessage[] {
    const messagesWithScores = messages.map(msg => ({
      ...msg,
      importance: this.calculateImportance(msg),
    }));
    
    messagesWithScores.sort((a, b) => (b.importance || 0) - (a.importance || 0));
    
    return messagesWithScores.slice(0, limit);
  }

  /**
   * Calcule le score d'importance d'un message
   */
  private calculateImportance(msg: ConversationMessage): number {
    let score = 0;
    const now = Date.now();
    const timestamp = msg.timestamp || now;
    
    // 1. Récence
    const ageInMs = now - timestamp;
    const ageScore = Math.max(0, 1 - ageInMs / (24 * 60 * 60 * 1000));
    score += ageScore * 0.2;
    
    // 2. Longueur
    const lengthScore = Math.min(msg.text.length / 500, 1);
    score += lengthScore * 0.15;
    
    // 3. Questions de l'utilisateur
    if (msg.sender === 'user' && msg.text.includes('?')) {
      score += 0.2;
    }
    
    // 4. Mots-clés importants
    const keywords = [
      'important', 'crucial', 'rappelle', 'retiens', 'note', 'essentiel',
      'obligatoire', 'nécessaire', 'impératif', 'prioritaire', 'rappel'
    ];
    const hasKeywords = keywords.some(kw => 
      msg.text.toLowerCase().includes(kw)
    );
    if (hasKeywords) {
      score += 0.25;
    }
    
    // 5. Présence d'entités importantes
    if (msg.entities && msg.entities.length > 0) {
      const entityScore = Math.min(msg.entities.length / 5, 1);
      score += entityScore * 0.15;
    }
    
    // 6. Messages de l'utilisateur
    if (msg.sender === 'user') {
      score += 0.05;
    }
    
    return Math.min(score, 1);
  }

  /**
   * Crée un résumé enrichi avec entités
   */
  private createEnhancedSummary(messages: ConversationMessage[], entities: ExtractedEntity[]): string {
    if (messages.length === 0) return 'Aucun historique.';
    
    let summary = '📝 Résumé de la conversation précédente :\n\n';
    
    // Ajouter les entités importantes
    const topEntities = entities.slice(0, 5);
    if (topEntities.length > 0) {
      summary += '🔑 **Informations clés mentionnées** :\n';
      for (const entity of topEntities) {
        const icon = this.getEntityIcon(entity.type);
        summary += `${icon} ${entity.value} (${entity.frequency}x)\n`;
      }
      summary += '\n';
    }
    
    // Ajouter les points de conversation
    const keyPoints: string[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.sender === 'user') {
        const userQuery = this.extractFirstSentence(msg.text);
        
        const response = messages[i + 1];
        if (response && response.sender === 'orion') {
          const orionResponse = this.extractFirstSentence(response.text);
          keyPoints.push(`• ${userQuery} → ${orionResponse}`);
        } else {
          keyPoints.push(`• ${userQuery}`);
        }
      }
    }
    
    summary += '💬 **Échanges** :\n';
    summary += keyPoints.slice(0, CONTEXT_CONFIG.MAX_SUMMARY_KEY_POINTS).join('\n');
    
    return summary;
  }
  
  private getEntityIcon(type: string): string {
    const icons: Record<string, string> = {
      'person': '👤',
      'date': '📅',
      'location': '📍',
      'organization': '🏢',
      'number': '🔢',
      'email': '📧',
      'url': '🔗',
      'concept': '💡',
    };
    return icons[type] || '•';
  }

  /**
   * Extrait la première phrase ou les premiers mots d'un texte
   */
  private extractFirstSentence(text: string): string {
    const sentenceEnd = text.search(/[.!?]\s/);
    if (sentenceEnd !== -1) {
      return text.substring(0, sentenceEnd + 1).trim();
    }
    
    if (text.length > CONTEXT_CONFIG.MAX_TEXT_LENGTH_FOR_SUMMARY) {
      return text.substring(0, CONTEXT_CONFIG.MAX_TEXT_LENGTH_FOR_SUMMARY).trim() + '...';
    }
    
    return text.trim();
  }
}

// Instance du gestionnaire
const contextManager = new ContextManager();

// Worker message handler
self.onmessage = async (event: MessageEvent) => {
  const { type, payload, meta } = event.data;
  
  try {
    if (type === 'compress_context') {
      const request = payload as ContextCompressionRequest;
      const result = await contextManager.compressContext(
        request.messages,
        request.maxTokens
      );
      
      logger.info('ContextManager', 'Compression effectuée', {
        originalCount: result.originalCount,
        compressedCount: result.compressedCount,
        tokensSaved: result.tokensSaved,
        entitiesExtracted: result.entities.length
      });
      
      self.postMessage({
        type: 'context_compressed',
        payload: result,
        meta,
      });
    } else if (type === 'init') {
      logger.info('ContextManager', 'Worker initialisé avec extraction d\\'entités');
      self.postMessage({
        type: 'init_complete',
        payload: { success: true },
        meta,
      });
    }
  } catch (error) {
    logger.error('ContextManager', 'Erreur', error);
    self.postMessage({
      type: 'context_error',
      payload: { error: (error as Error).message },
      meta,
    });
  }
};
