/**
 * Gestionnaire de streaming pour l'OIE
 * Permet l'affichage progressif des réponses token par token
 */

export type StreamCallback = (token: string, isDone: boolean) => void;

export interface StreamOptions {
  onToken?: StreamCallback;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export class StreamingHandler {
  private isStreaming = false;
  private currentStream: string = '';
  
  /**
   * Démarre un streaming de tokens
   */
  async startStream(
    generator: AsyncGenerator<string, void, unknown>,
    options: StreamOptions
  ): Promise<string> {
    this.isStreaming = true;
    this.currentStream = '';
    
    try {
      for await (const token of generator) {
        if (!this.isStreaming) {
          break;
        }
        
        this.currentStream += token;
        
        if (options.onToken) {
          options.onToken(token, false);
        }
      }
      
      // Streaming terminé
      if (options.onToken) {
        options.onToken('', true);
      }
      
      if (options.onComplete) {
        options.onComplete(this.currentStream);
      }
      
      return this.currentStream;
      
    } catch (error) {
      this.isStreaming = false;
      
      if (options.onError) {
        options.onError(error as Error);
      }
      
      throw error;
    } finally {
      this.isStreaming = false;
    }
  }
  
  /**
   * Arrête le streaming en cours
   */
  stopStream(): void {
    this.isStreaming = false;
  }
  
  /**
   * Vérifie si un streaming est en cours
   */
  isActive(): boolean {
    return this.isStreaming;
  }
  
  /**
   * Obtient le texte accumulé jusqu'à présent
   */
  getCurrentText(): string {
    return this.currentStream;
  }
}

/**
 * Simule un streaming pour les modèles qui ne supportent pas le streaming natif
 */
export async function* simulateStreaming(
  text: string,
  options: { delayMs?: number; chunkSize?: number } = {}
): AsyncGenerator<string, void, unknown> {
  const delayMs = options.delayMs || 50;
  const chunkSize = options.chunkSize || 1;
  
  for (let i = 0; i < text.length; i += chunkSize) {
    const chunk = text.slice(i, i + chunkSize);
    yield chunk;
    
    // Délai pour simuler la latence
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}

/**
 * Convertit une réponse complète en streaming simulé
 */
export function createStreamFromText(text: string): AsyncGenerator<string, void, unknown> {
  return simulateStreaming(text, { delayMs: 30, chunkSize: 3 });
}
