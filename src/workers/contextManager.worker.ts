// src/workers/contextManager.worker.ts

/**
 * Context Manager Worker
 * 
 * Gère la compression et l'optimisation du contexte de conversation
 * pour éviter de dépasser la limite de tokens du modèle.
 */

interface ConversationMessage {
  sender: 'user' | 'orion';
  text: string;
  id?: string;
  importance?: number;
  timestamp?: number;
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
}

// Configuration
const MAX_CONTEXT_TOKENS = 3000; // Laisser 1000 tokens pour la réponse
const TOKENS_PER_MESSAGE_ESTIMATE = 100; // Estimation moyenne

class ContextManager {
  /**
   * Compresse l'historique de conversation pour respecter la limite de tokens
   */
  async compressContext(
    messages: ConversationMessage[],
    maxTokens: number = MAX_CONTEXT_TOKENS
  ): Promise<ContextCompressionResult> {
    if (messages.length === 0) {
      return {
        compressedMessages: [],
        originalCount: 0,
        compressedCount: 0,
        tokensSaved: 0,
      };
    }

    // 1. Toujours garder les 2 derniers échanges (mémoire immédiate)
    const recentCount = Math.min(4, messages.length); // 4 messages = 2 échanges
    const recentMessages = messages.slice(-recentCount);
    
    // 2. Traiter les anciens messages
    const oldMessages = messages.slice(0, -recentCount);
    
    if (oldMessages.length === 0) {
      // Pas assez de messages pour nécessiter une compression
      return {
        compressedMessages: messages,
        originalCount: messages.length,
        compressedCount: messages.length,
        tokensSaved: 0,
      };
    }

    // 3. Sélectionner les messages importants de l'ancien historique
    const importantOldMessages = this.selectImportantMessages(oldMessages, 3);
    
    // 4. Si encore trop de tokens, créer un résumé
    const combinedMessages = [...importantOldMessages, ...recentMessages];
    const estimatedTokens = combinedMessages.length * TOKENS_PER_MESSAGE_ESTIMATE;
    
    if (estimatedTokens > maxTokens && oldMessages.length > 0) {
      // Créer un résumé des anciens messages
      const summary = this.createSummary(oldMessages);
      const summaryMessage: ConversationMessage = {
        sender: 'orion',
        text: `📝 Résumé de la conversation précédente :\n${summary}`,
        id: `summary_${Date.now()}`,
        importance: 1,
        timestamp: Date.now(),
      };
      
      return {
        compressedMessages: [summaryMessage, ...recentMessages],
        originalCount: messages.length,
        compressedCount: recentMessages.length + 1,
        tokensSaved: (messages.length - recentMessages.length - 1) * TOKENS_PER_MESSAGE_ESTIMATE,
      };
    }
    
    return {
      compressedMessages: combinedMessages,
      originalCount: messages.length,
      compressedCount: combinedMessages.length,
      tokensSaved: (messages.length - combinedMessages.length) * TOKENS_PER_MESSAGE_ESTIMATE,
    };
  }

  /**
   * Sélectionne les messages les plus importants selon plusieurs critères
   */
  private selectImportantMessages(
    messages: ConversationMessage[],
    limit: number
  ): ConversationMessage[] {
    // Calculer l'importance de chaque message
    const messagesWithScores = messages.map(msg => ({
      ...msg,
      importance: this.calculateImportance(msg),
    }));
    
    // Trier par importance décroissante
    messagesWithScores.sort((a, b) => (b.importance || 0) - (a.importance || 0));
    
    // Garder les N plus importants
    return messagesWithScores.slice(0, limit);
  }

  /**
   * Calcule le score d'importance d'un message
   */
  private calculateImportance(msg: ConversationMessage): number {
    let score = 0;
    const now = Date.now();
    const timestamp = msg.timestamp || now;
    
    // 1. Récence : messages récents = plus importants (déclin sur 24h)
    const ageInMs = now - timestamp;
    const ageScore = Math.max(0, 1 - ageInMs / (24 * 60 * 60 * 1000));
    score += ageScore * 0.3;
    
    // 2. Longueur : messages plus longs = potentiellement plus d'information
    const lengthScore = Math.min(msg.text.length / 500, 1);
    score += lengthScore * 0.2;
    
    // 3. Questions de l'utilisateur = important
    if (msg.sender === 'user' && msg.text.includes('?')) {
      score += 0.3;
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
      score += 0.3;
    }
    
    // 5. Messages de l'utilisateur = légèrement plus important
    if (msg.sender === 'user') {
      score += 0.1;
    }
    
    return Math.min(score, 1);
  }

  /**
   * Crée un résumé concis des messages
   */
  private createSummary(messages: ConversationMessage[]): string {
    if (messages.length === 0) return 'Aucun historique.';
    
    // Stratégie simple : extraire les points clés
    const keyPoints: string[] = [];
    
    // Grouper par paires question-réponse
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.sender === 'user') {
        // Prendre la première phrase ou 100 premiers caractères
        const userQuery = this.extractFirstSentence(msg.text);
        
        // Chercher la réponse correspondante
        const response = messages[i + 1];
        if (response && response.sender === 'orion') {
          const orionResponse = this.extractFirstSentence(response.text);
          keyPoints.push(`• ${userQuery} → ${orionResponse}`);
        } else {
          keyPoints.push(`• ${userQuery}`);
        }
      }
    }
    
    return keyPoints.slice(0, 5).join('\n'); // Garder max 5 points clés
  }

  /**
   * Extrait la première phrase ou les premiers mots d'un texte
   */
  private extractFirstSentence(text: string): string {
    // Trouver la première phrase
    const sentenceEnd = text.search(/[.!?]\s/);
    if (sentenceEnd !== -1) {
      return text.substring(0, sentenceEnd + 1).trim();
    }
    
    // Sinon, prendre les 100 premiers caractères
    if (text.length > 100) {
      return text.substring(0, 100).trim() + '...';
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
      
      console.log(
        `[ContextManager] Compression: ${result.originalCount} → ${result.compressedCount} messages ` +
        `(${result.tokensSaved} tokens économisés)`
      );
      
      self.postMessage({
        type: 'context_compressed',
        payload: result,
        meta,
      });
    } else if (type === 'init') {
      console.log('[ContextManager] Worker initialisé');
      self.postMessage({
        type: 'init_complete',
        payload: { success: true },
        meta,
      });
    }
  } catch (error) {
    console.error('[ContextManager] Erreur:', error);
    self.postMessage({
      type: 'context_error',
      payload: { error: (error as Error).message },
      meta,
    });
  }
};
