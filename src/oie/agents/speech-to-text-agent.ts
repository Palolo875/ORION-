/**
 * Agent Speech-to-Text - Spécialisé dans la transcription audio
 * Utilise Whisper pour convertir la parole en texte
 */

import { BaseAgent } from './base-agent';
import { AgentInput, AgentOutput } from '../types/agent.types';
import { pipeline, Pipeline } from '@xenova/transformers';

export interface AudioInput {
  audioData: Float32Array | ArrayBuffer;
  sampleRate?: number;
}

export class SpeechToTextAgent extends BaseAgent {
  private pipe: Pipeline | null = null;
  
  constructor() {
    super({
      id: 'speech-to-text-agent',
      name: 'Agent Transcription Audio',
      capabilities: ['speech_recognition'],
      modelSize: 150, // ~150MB pour whisper-tiny
      priority: 8,
      modelId: 'Xenova/whisper-tiny'
    });
  }
  
  protected async loadModel(): Promise<void> {
    console.log(`[SpeechToTextAgent] Chargement de ${this.metadata.modelId}...`);
    
    try {
      this.pipe = await pipeline(
        'automatic-speech-recognition',
        this.metadata.modelId,
        {
          quantized: true,
          progress_callback: (progress: any) => {
            if (progress.status === 'progress') {
              const percent = (progress.progress || 0).toFixed(1);
              console.log(`[SpeechToTextAgent] Téléchargement: ${percent}%`);
            }
          }
        }
      );
      
      console.log(`[SpeechToTextAgent] Modèle chargé avec succès`);
    } catch (error: any) {
      console.error(`[SpeechToTextAgent] Erreur de chargement:`, error);
      throw new Error(`Échec du chargement de Whisper: ${error.message}`);
    }
  }
  
  protected async unloadModel(): Promise<void> {
    if (this.pipe) {
      // Transformers.js gère automatiquement la libération de mémoire
      this.pipe = null;
      console.log(`[SpeechToTextAgent] Pipeline libéré`);
    }
  }
  
  protected async processInternal(input: AgentInput): Promise<AgentOutput> {
    if (!this.pipe) {
      throw new Error('Pipeline non chargé');
    }
    
    // Vérifier si l'input contient des données audio
    const audioInput = (input as any).audioData;
    if (!audioInput) {
      throw new Error('Aucune donnée audio fournie');
    }
    
    console.log(`[SpeechToTextAgent] Transcription en cours...`);
    
    try {
      // Transcrire l'audio
      const result = await this.pipe(audioInput, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: 'french', // Privilégier le français par défaut
        task: 'transcribe',
        return_timestamps: false
      });
      
      const transcription = typeof result === 'string' ? result : result.text;
      
      console.log(`[SpeechToTextAgent] Transcription: "${transcription.substring(0, 100)}..."`);
      
      return {
        agentId: this.metadata.id,
        content: transcription,
        confidence: 90,
        processingTime: 0 // Calculé par BaseAgent
      };
      
    } catch (error: any) {
      console.error(`[SpeechToTextAgent] Erreur de transcription:`, error);
      throw new Error(`Échec de la transcription: ${error.message}`);
    }
  }
  
  /**
   * Méthode utilitaire pour transcrire directement un fichier audio
   */
  async transcribeAudio(audioData: Float32Array | ArrayBuffer, sampleRate: number = 16000): Promise<string> {
    const input: AgentInput = {
      content: '',
      context: {}
    };
    
    (input as any).audioData = audioData;
    (input as any).sampleRate = sampleRate;
    
    const output = await this.process(input);
    return output.content;
  }
}
