/**
 * Token Streamer - Streaming de tokens pour réponses en temps réel
 * 
 * Responsabilités:
 * - Streaming de tokens pour une meilleure UX
 * - Gestion des générateurs asynchrones
 * - Support du mode "typewriter" pour affichage progressif
 * - Gestion de l'annulation du streaming
 */

import { debugLogger } from './debug-logger';

/**
 * Token généré avec métadonnées
 */
export interface StreamedToken {
  /**
   * Contenu du token
   */
  token: string;
  
  /**
   * Position dans la séquence
   */
  index: number;
  
  /**
   * Temps écoulé depuis le début (ms)
   */
  elapsedMs: number;
  
  /**
   * Est-ce le dernier token?
   */
  isLast: boolean;
  
  /**
   * Texte complet jusqu'à présent
   */
  fullText: string;
}

/**
 * Options de streaming
 */
export interface StreamOptions {
  /**
   * Délai entre chaque token (ms) pour effet typewriter
   */
  typewriterDelay?: number;
  
  /**
   * Callback appelé pour chaque token
   */
  onToken?: (token: StreamedToken) => void;
  
  /**
   * Callback appelé quand le streaming se termine
   */
  onComplete?: (fullText: string, stats: StreamStats) => void;
  
  /**
   * Callback appelé en cas d'erreur
   */
  onError?: (error: Error) => void;
  
  /**
   * Signal d'annulation
   */
  abortSignal?: AbortSignal;
  
  /**
   * Activer les logs verbeux
   */
  verbose?: boolean;
}

/**
 * Statistiques du streaming
 */
export interface StreamStats {
  /**
   * Nombre total de tokens
   */
  totalTokens: number;
  
  /**
   * Durée totale (ms)
   */
  totalTimeMs: number;
  
  /**
   * Tokens par seconde
   */
  tokensPerSecond: number;
  
  /**
   * Taille du texte final (caractères)
   */
  textLength: number;
  
  /**
   * Le streaming a-t-il été annulé?
   */
  cancelled: boolean;
}

/**
 * Token Streamer
 */
export class TokenStreamer {
  private startTime: number = 0;
  private tokens: string[] = [];
  private cancelled = false;
  
  /**
   * Stream des tokens depuis un générateur
   */
  async *streamFromGenerator(
    generator: AsyncGenerator<string, void, unknown>,
    options: StreamOptions = {}
  ): AsyncGenerator<StreamedToken, void, unknown> {
    this.startTime = performance.now();
    this.tokens = [];
    this.cancelled = false;
    
    const { typewriterDelay = 0, onToken, onError, abortSignal, verbose } = options;
    
    let index = 0;
    let fullText = '';
    
    try {
      for await (const token of generator) {
        // Vérifier l'annulation
        if (abortSignal?.aborted || this.cancelled) {
          if (verbose) {
            debugLogger.info('TokenStreamer', 'Streaming annulé');
          }
          break;
        }
        
        this.tokens.push(token);
        fullText += token;
        
        const streamedToken: StreamedToken = {
          token,
          index,
          elapsedMs: performance.now() - this.startTime,
          isLast: false,
          fullText
        };
        
        // Callback
        if (onToken) {
          try {
            onToken(streamedToken);
          } catch (error) {
            debugLogger.error('TokenStreamer', 'Erreur dans onToken callback', error);
          }
        }
        
        // Yield le token
        yield streamedToken;
        
        // Effet typewriter
        if (typewriterDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, typewriterDelay));
        }
        
        index++;
      }
      
      // Marquer le dernier token
      if (this.tokens.length > 0 && !this.cancelled) {
        const lastToken: StreamedToken = {
          token: '',
          index,
          elapsedMs: performance.now() - this.startTime,
          isLast: true,
          fullText
        };
        
        yield lastToken;
      }
      
    } catch (error) {
      debugLogger.error('TokenStreamer', 'Erreur de streaming', error);
      if (onError && error instanceof Error) {
        onError(error);
      }
      throw error;
    }
  }
  
  /**
   * Stream des tokens depuis du texte complet (simulation)
   */
  async *streamFromText(
    text: string,
    options: StreamOptions = {}
  ): AsyncGenerator<StreamedToken, void, unknown> {
    const { typewriterDelay = 30, onToken, abortSignal, verbose } = options;
    
    this.startTime = performance.now();
    this.tokens = [];
    this.cancelled = false;
    
    // Simuler le streaming en découpant par mots
    const words = text.split(/(\s+)/);
    let fullText = '';
    
    for (let i = 0; i < words.length; i++) {
      // Vérifier l'annulation
      if (abortSignal?.aborted || this.cancelled) {
        if (verbose) {
          debugLogger.info('TokenStreamer', 'Streaming annulé');
        }
        break;
      }
      
      const word = words[i];
      this.tokens.push(word);
      fullText += word;
      
      const streamedToken: StreamedToken = {
        token: word,
        index: i,
        elapsedMs: performance.now() - this.startTime,
        isLast: i === words.length - 1,
        fullText
      };
      
      // Callback
      if (onToken) {
        try {
          onToken(streamedToken);
        } catch (error) {
          debugLogger.error('TokenStreamer', 'Erreur dans onToken callback', error);
        }
      }
      
      yield streamedToken;
      
      // Effet typewriter
      if (typewriterDelay > 0 && i < words.length - 1) {
        await new Promise(resolve => setTimeout(resolve, typewriterDelay));
      }
    }
  }
  
  /**
   * Stream avec chunks de texte plus gros (par phrases)
   */
  async *streamBySentences(
    text: string,
    options: StreamOptions = {}
  ): AsyncGenerator<StreamedToken, void, unknown> {
    const { typewriterDelay = 100, onToken, abortSignal, verbose } = options;
    
    this.startTime = performance.now();
    this.tokens = [];
    this.cancelled = false;
    
    // Découper par phrases
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let fullText = '';
    
    for (let i = 0; i < sentences.length; i++) {
      // Vérifier l'annulation
      if (abortSignal?.aborted || this.cancelled) {
        if (verbose) {
          debugLogger.info('TokenStreamer', 'Streaming annulé');
        }
        break;
      }
      
      const sentence = sentences[i];
      this.tokens.push(sentence);
      fullText += sentence;
      
      const streamedToken: StreamedToken = {
        token: sentence,
        index: i,
        elapsedMs: performance.now() - this.startTime,
        isLast: i === sentences.length - 1,
        fullText
      };
      
      // Callback
      if (onToken) {
        try {
          onToken(streamedToken);
        } catch (error) {
          debugLogger.error('TokenStreamer', 'Erreur dans onToken callback', error);
        }
      }
      
      yield streamedToken;
      
      // Pause entre phrases
      if (typewriterDelay > 0 && i < sentences.length - 1) {
        await new Promise(resolve => setTimeout(resolve, typewriterDelay));
      }
    }
  }
  
  /**
   * Collect tous les tokens et retourner le texte complet
   */
  async collectAll(
    generator: AsyncGenerator<StreamedToken, void, unknown>,
    options: StreamOptions = {}
  ): Promise<{ fullText: string; stats: StreamStats }> {
    const { onComplete } = options;
    
    let fullText = '';
    let lastToken: StreamedToken | null = null;
    
    for await (const token of generator) {
      fullText = token.fullText;
      lastToken = token;
    }
    
    const stats = this.getStats();
    
    if (onComplete) {
      try {
        onComplete(fullText, stats);
      } catch (error) {
        debugLogger.error('TokenStreamer', 'Erreur dans onComplete callback', error);
      }
    }
    
    return { fullText, stats };
  }
  
  /**
   * Annule le streaming en cours
   */
  cancel(): void {
    this.cancelled = true;
    debugLogger.info('TokenStreamer', 'Annulation du streaming demandée');
  }
  
  /**
   * Obtient les statistiques du streaming
   */
  getStats(): StreamStats {
    const totalTimeMs = performance.now() - this.startTime;
    const totalTokens = this.tokens.length;
    const tokensPerSecond = totalTokens / (totalTimeMs / 1000);
    const textLength = this.tokens.join('').length;
    
    return {
      totalTokens,
      totalTimeMs,
      tokensPerSecond,
      textLength,
      cancelled: this.cancelled
    };
  }
  
  /**
   * Reset le streamer
   */
  reset(): void {
    this.startTime = 0;
    this.tokens = [];
    this.cancelled = false;
  }
}

/**
 * Helper function pour créer un streamer
 */
export function createTokenStreamer(): TokenStreamer {
  return new TokenStreamer();
}

/**
 * Helper function pour streamer du texte rapidement
 */
export async function* streamText(
  text: string,
  options: StreamOptions = {}
): AsyncGenerator<StreamedToken, void, unknown> {
  const streamer = createTokenStreamer();
  yield* streamer.streamFromText(text, options);
}

/**
 * Helper function pour simuler un générateur de tokens depuis WebLLM
 */
export async function* simulateWebLLMStream(
  text: string,
  tokensPerSecond: number = 20
): AsyncGenerator<string, void, unknown> {
  const words = text.split(/(\s+)/);
  const delayMs = 1000 / tokensPerSecond;
  
  for (const word of words) {
    yield word;
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}
