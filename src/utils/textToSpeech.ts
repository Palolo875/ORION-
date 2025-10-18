/**
 * Utilitaire pour la synthèse vocale (Text-to-Speech)
 */

export interface TTSOptions {
  lang?: string;
  rate?: number; // 0.1 à 10, défaut 1
  pitch?: number; // 0 à 2, défaut 1
  volume?: number; // 0 à 1, défaut 1
  voice?: SpeechSynthesisVoice;
}

/**
 * Classe pour gérer la synthèse vocale
 */
export class TextToSpeech {
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private onVoicesChangedCallback?: () => void;

  constructor() {
    if (!('speechSynthesis' in window)) {
      throw new Error('La synthèse vocale n\'est pas supportée par ce navigateur');
    }
    
    this.synth = window.speechSynthesis;
    this.loadVoices();
    
    // Les voix peuvent se charger de manière asynchrone
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
        if (this.onVoicesChangedCallback) {
          this.onVoicesChangedCallback();
        }
      };
    }
  }

  /**
   * Charge la liste des voix disponibles
   */
  private loadVoices(): void {
    this.voices = this.synth.getVoices();
  }

  /**
   * Obtient toutes les voix disponibles
   */
  public getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  /**
   * Obtient les voix pour une langue spécifique
   */
  public getVoicesForLanguage(lang: string): SpeechSynthesisVoice[] {
    return this.voices.filter(voice => voice.lang.startsWith(lang));
  }

  /**
   * Obtient la meilleure voix pour une langue
   */
  public getBestVoice(lang: string = 'fr-FR'): SpeechSynthesisVoice | undefined {
    // Essayer de trouver une voix locale d'abord
    const localVoices = this.voices.filter(voice => 
      voice.lang.startsWith(lang) && voice.localService
    );
    
    if (localVoices.length > 0) {
      // Préférer les voix de haute qualité
      const premiumVoice = localVoices.find(v => 
        v.name.toLowerCase().includes('premium') || 
        v.name.toLowerCase().includes('enhanced')
      );
      return premiumVoice || localVoices[0];
    }
    
    // Sinon, prendre n'importe quelle voix pour cette langue
    const anyVoice = this.voices.find(voice => voice.lang.startsWith(lang));
    return anyVoice || this.voices[0];
  }

  /**
   * Parle le texte donné
   */
  public speak(
    text: string,
    options: TTSOptions = {},
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: SpeechSynthesisErrorEvent) => void;
      onPause?: () => void;
      onResume?: () => void;
    }
  ): void {
    // Arrêter toute synthèse en cours
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configurer les options
    utterance.lang = options.lang || 'fr-FR';
    utterance.rate = options.rate || 1;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;
    
    if (options.voice) {
      utterance.voice = options.voice;
    } else {
      const bestVoice = this.getBestVoice(utterance.lang);
      if (bestVoice) {
        utterance.voice = bestVoice;
      }
    }
    
    // Configurer les callbacks
    if (callbacks?.onStart) {
      utterance.onstart = callbacks.onStart;
    }
    
    if (callbacks?.onEnd) {
      utterance.onend = callbacks.onEnd;
    }
    
    if (callbacks?.onError) {
      utterance.onerror = callbacks.onError;
    }
    
    if (callbacks?.onPause) {
      utterance.onpause = callbacks.onPause;
    }
    
    if (callbacks?.onResume) {
      utterance.onresume = callbacks.onResume;
    }
    
    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  /**
   * Met en pause la synthèse en cours
   */
  public pause(): void {
    if (this.synth.speaking && !this.synth.paused) {
      this.synth.pause();
    }
  }

  /**
   * Reprend la synthèse en pause
   */
  public resume(): void {
    if (this.synth.paused) {
      this.synth.resume();
    }
  }

  /**
   * Arrête la synthèse en cours
   */
  public stop(): void {
    this.synth.cancel();
    this.currentUtterance = null;
  }

  /**
   * Vérifie si la synthèse est en cours
   */
  public isSpeaking(): boolean {
    return this.synth.speaking;
  }

  /**
   * Vérifie si la synthèse est en pause
   */
  public isPaused(): boolean {
    return this.synth.paused;
  }

  /**
   * Définit un callback pour quand les voix sont chargées
   */
  public onVoicesChanged(callback: () => void): void {
    this.onVoicesChangedCallback = callback;
  }
}

/**
 * Instance singleton
 */
let ttsInstance: TextToSpeech | null = null;

/**
 * Obtient l'instance singleton de TextToSpeech
 */
export function getTTSInstance(): TextToSpeech {
  if (!ttsInstance) {
    try {
      ttsInstance = new TextToSpeech();
    } catch (error) {
      console.error('[TTS] Erreur lors de l\'initialisation:', error);
      throw error;
    }
  }
  return ttsInstance;
}

/**
 * Vérifie si le TTS est supporté
 */
export function isTTSSupported(): boolean {
  return 'speechSynthesis' in window;
}

/**
 * Divise un long texte en morceaux pour une meilleure synthèse
 */
export function splitTextForTTS(text: string, maxLength: number = 200): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length <= maxLength) {
      currentChunk += sentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Parle un texte de manière séquentielle (pour les longs textes)
 */
export async function speakSequentially(
  text: string,
  options: TTSOptions = {},
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const tts = getTTSInstance();
  const chunks = splitTextForTTS(text);
  
  for (let i = 0; i < chunks.length; i++) {
    await new Promise<void>((resolve, reject) => {
      tts.speak(chunks[i], options, {
        onStart: () => {
          if (onProgress) {
            onProgress(i + 1, chunks.length);
          }
        },
        onEnd: () => resolve(),
        onError: (error) => reject(error),
      });
    });
  }
}
