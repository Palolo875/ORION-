/**
 * Agent Multilingue - Spécialisé dans la traduction et le support multilingue
 * Utilise Qwen2 pour gérer plusieurs langues
 */

import { BaseAgent } from './base-agent';
import { AgentInput, AgentOutput } from '../types/agent.types';
import { WebWorkerMLCEngine } from '@mlc-ai/web-llm';

export class MultilingualAgent extends BaseAgent {
  private engine: any = null;
  
  constructor() {
    super({
      id: 'multilingual-agent',
      name: 'Agent Multilingue',
      capabilities: ['multilingual', 'conversation'],
      modelSize: 800, // ~800MB pour Qwen2-1.5B
      priority: 7,
      modelId: 'Qwen2-1.5B-Instruct-q4f16_1-MLC'
    });
  }
  
  protected async loadModel(): Promise<void> {
    console.log(`[MultilingualAgent] Chargement du modèle ${this.metadata.modelId}`);
    
    // @ts-expect-error - WebWorkerMLCEngine types
    this.engine = await WebWorkerMLCEngine.create({
      initProgressCallback: (progress: { progress: number; text: string }) => {
        console.log(`[MultilingualAgent] ${(progress.progress * 100).toFixed(1)}% - ${progress.text}`);
      }
    });
    
    await this.engine.reload(this.metadata.modelId);
    console.log(`[MultilingualAgent] Modèle chargé - support multilingue actif`);
  }
  
  protected async unloadModel(): Promise<void> {
    if (this.engine) {
      this.engine = null;
    }
  }
  
  protected async processInternal(input: AgentInput): Promise<AgentOutput> {
    // Détection de la langue et adaptation du prompt
    const detectedLanguage = this.detectLanguage(input.content);
    
    const systemPrompt = this.getMultilingualSystemPrompt(detectedLanguage);
    
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: input.content
      }
    ];
    
    // Ajouter l'historique si disponible
    if (input.context?.conversationHistory && input.context.conversationHistory.length > 0) {
      // Insérer l'historique avant le message utilisateur
      messages.splice(1, 0, ...input.context.conversationHistory);
    }
    
    const response = await this.engine.chat.completions.create({
      messages,
      temperature: input.temperature || 0.7,
      max_tokens: input.maxTokens || 1000
    });
    
    return {
      agentId: this.metadata.id,
      content: response.choices[0].message.content,
      confidence: 87,
      processingTime: 0
    };
  }
  
  /**
   * Détection simple de la langue
   */
  private detectLanguage(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Mots-clés par langue
    const patterns = {
      spanish: /\b(hola|gracias|por favor|buenos días|cómo|qué|dónde)\b/,
      german: /\b(hallo|danke|bitte|guten tag|wie|was|wo)\b/,
      italian: /\b(ciao|grazie|per favore|buongiorno|come|cosa|dove)\b/,
      portuguese: /\b(olá|obrigado|por favor|bom dia|como|o que|onde)\b/,
      chinese: /[\u4e00-\u9fa5]/,
      japanese: /[\u3040-\u309f\u30a0-\u30ff]/,
      korean: /[\uac00-\ud7af]/,
      arabic: /[\u0600-\u06ff]/,
      russian: /[\u0400-\u04ff]/,
    };
    
    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(lowerText)) {
        return lang;
      }
    }
    
    // Français par défaut
    return 'french';
  }
  
  /**
   * Génère un system prompt adapté à la langue
   */
  private getMultilingualSystemPrompt(language: string): string {
    const prompts: Record<string, string> = {
      french: "Tu es un assistant multilingue intelligent. Réponds dans la langue de l'utilisateur avec précision et clarté.",
      english: "You are an intelligent multilingual assistant. Respond in the user's language with precision and clarity.",
      spanish: "Eres un asistente multilingüe inteligente. Responde en el idioma del usuario con precisión y claridad.",
      german: "Du bist ein intelligenter mehrsprachiger Assistent. Antworte in der Sprache des Benutzers mit Präzision und Klarheit.",
      italian: "Sei un assistente multilingue intelligente. Rispondi nella lingua dell'utente con precisione e chiarezza.",
      portuguese: "Você é um assistente multilíngue inteligente. Responda no idioma do usuário com precisão e clareza.",
      chinese: "你是一个智能多语言助手。用用户的语言精确清晰地回答。",
      japanese: "あなたは知的な多言語アシスタントです。ユーザーの言語で正確かつ明確に応答してください。",
      korean: "당신은 지능형 다국어 어시스턴트입니다. 사용자의 언어로 정확하고 명확하게 답변하세요.",
      arabic: "أنت مساعد ذكي متعدد اللغات. أجب بلغة المستخدم بدقة ووضوح.",
      russian: "Вы интеллектуальный многоязычный ассистент. Отвечайте на языке пользователя точно и ясно.",
    };
    
    return prompts[language] || prompts.french;
  }
}
