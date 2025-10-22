/**
 * Formatage centralisé des prompts pour différents modèles
 * Gère les spécificités de format de chaque modèle LLM
 */

export interface PromptFormatConfig {
  systemPrefix?: string;
  systemSuffix?: string;
  userPrefix?: string;
  userSuffix?: string;
  assistantPrefix?: string;
  assistantSuffix?: string;
  separator?: string;
}

export type ModelFamily = 'phi' | 'llama' | 'mistral' | 'gemma' | 'generic';

/**
 * Configurations de formatage par famille de modèle
 */
const MODEL_FORMATS: Record<ModelFamily, PromptFormatConfig> = {
  phi: {
    systemPrefix: '<|system|>\n',
    systemSuffix: '<|end|>\n',
    userPrefix: '<|user|>\n',
    userSuffix: '<|end|>\n',
    assistantPrefix: '<|assistant|>\n',
    assistantSuffix: '<|end|>\n',
    separator: '\n'
  },
  llama: {
    systemPrefix: '[INST] <<SYS>>\n',
    systemSuffix: '\n<</SYS>>\n\n',
    userPrefix: '',
    userSuffix: ' [/INST]',
    assistantPrefix: ' ',
    assistantSuffix: ' </s><s>[INST] ',
    separator: ''
  },
  mistral: {
    systemPrefix: '<s>[INST] ',
    systemSuffix: ' ',
    userPrefix: '',
    userSuffix: ' [/INST]',
    assistantPrefix: '',
    assistantSuffix: '</s> [INST] ',
    separator: ''
  },
  gemma: {
    systemPrefix: '<start_of_turn>user\n',
    systemSuffix: '<end_of_turn>\n',
    userPrefix: '<start_of_turn>user\n',
    userSuffix: '<end_of_turn>\n',
    assistantPrefix: '<start_of_turn>model\n',
    assistantSuffix: '<end_of_turn>\n',
    separator: ''
  },
  generic: {
    systemPrefix: 'SYSTEM: ',
    systemSuffix: '\n\n',
    userPrefix: 'USER: ',
    userSuffix: '\n\n',
    assistantPrefix: 'ASSISTANT: ',
    assistantSuffix: '\n\n',
    separator: ''
  }
};

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class PromptFormatter {
  private config: PromptFormatConfig;
  
  constructor(modelFamily: ModelFamily = 'generic') {
    this.config = MODEL_FORMATS[modelFamily];
  }
  
  /**
   * Détermine automatiquement la famille du modèle à partir de son ID
   */
  static detectModelFamily(modelId: string): ModelFamily {
    const id = modelId.toLowerCase();
    
    if (id.includes('phi')) return 'phi';
    if (id.includes('llama')) return 'llama';
    if (id.includes('mistral')) return 'mistral';
    if (id.includes('gemma')) return 'gemma';
    
    return 'generic';
  }
  
  /**
   * Crée un formatter à partir d'un ID de modèle
   */
  static fromModelId(modelId: string): PromptFormatter {
    const family = PromptFormatter.detectModelFamily(modelId);
    return new PromptFormatter(family);
  }
  
  /**
   * Formate un message simple (user -> assistant)
   */
  formatSimple(userMessage: string, systemPrompt?: string): string {
    let formatted = '';
    
    if (systemPrompt) {
      formatted += this.formatMessage({ role: 'system', content: systemPrompt });
    }
    
    formatted += this.formatMessage({ role: 'user', content: userMessage });
    formatted += this.config.assistantPrefix || '';
    
    return formatted;
  }
  
  /**
   * Formate une conversation complète
   */
  formatConversation(messages: Message[]): string {
    let formatted = '';
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      formatted += this.formatMessage(message);
      
      // Ajouter le préfixe assistant à la fin pour préparer la génération
      if (i === messages.length - 1 && message.role === 'user') {
        formatted += this.config.assistantPrefix || '';
      }
    }
    
    return formatted;
  }
  
  /**
   * Formate un message individuel
   */
  private formatMessage(message: Message): string {
    const { role, content } = message;
    
    let prefix = '';
    let suffix = '';
    
    switch (role) {
      case 'system':
        prefix = this.config.systemPrefix || '';
        suffix = this.config.systemSuffix || '';
        break;
      case 'user':
        prefix = this.config.userPrefix || '';
        suffix = this.config.userSuffix || '';
        break;
      case 'assistant':
        prefix = this.config.assistantPrefix || '';
        suffix = this.config.assistantSuffix || '';
        break;
    }
    
    return `${prefix}${content}${suffix}`;
  }
  
  /**
   * Ajoute du contexte ambient au système
   */
  formatWithContext(
    userMessage: string,
    options?: {
      systemPrompt?: string;
      ambientContext?: string;
      conversationHistory?: Message[];
    }
  ): string {
    const messages: Message[] = [];
    
    // Construire le system prompt
    let systemContent = options?.systemPrompt || '';
    if (options?.ambientContext) {
      systemContent += `\n\nContexte:\n${options.ambientContext}`;
    }
    
    if (systemContent) {
      messages.push({ role: 'system', content: systemContent });
    }
    
    // Ajouter l'historique
    if (options?.conversationHistory) {
      messages.push(...options.conversationHistory);
    }
    
    // Ajouter le message utilisateur
    messages.push({ role: 'user', content: userMessage });
    
    return this.formatConversation(messages);
  }
}

/**
 * Utilitaire pour créer rapidement un prompt formaté
 */
export function formatPrompt(
  modelId: string,
  userMessage: string,
  options?: {
    systemPrompt?: string;
    ambientContext?: string;
    conversationHistory?: Message[];
  }
): string {
  const formatter = PromptFormatter.fromModelId(modelId);
  return formatter.formatWithContext(userMessage, options);
}
