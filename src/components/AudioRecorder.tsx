/**
 * Composant d'enregistrement audio pour ORION
 * Permet à l'utilisateur de parler et transcrit via le SpeechToTextAgent
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

export interface AudioRecorderProps {
  onAudioRecorded: (audioData: Float32Array, sampleRate: number) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
}

export function AudioRecorder({ 
  onAudioRecorded, 
  onError,
  disabled = false,
  className 
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Nettoyage à la désactivation du composant
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);
  
  const startRecording = useCallback(async () => {
    try {
      // Demander l'accès au microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000, // Whisper préfère 16kHz
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      // Créer le MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Collecter les chunks audio
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Quand l'enregistrement s'arrête
      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        
        try {
          // Créer un blob audio
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Convertir en Float32Array pour Transformers.js
          const audioData = await convertBlobToFloat32Array(audioBlob);
          
          // Envoyer les données audio
          onAudioRecorded(audioData, 16000);
          
        } catch (error: any) {
          console.error('[AudioRecorder] Erreur de traitement:', error);
          onError?.(error);
        } finally {
          setIsProcessing(false);
          cleanup();
        }
      };
      
      // Démarrer l'enregistrement
      mediaRecorder.start(100); // Collecter des chunks toutes les 100ms
      setIsRecording(true);
      
      console.log('[AudioRecorder] 🎤 Enregistrement démarré');
      
    } catch (error: any) {
      console.error('[AudioRecorder] Erreur d\'accès au micro:', error);
      onError?.(new Error(`Impossible d'accéder au microphone: ${error.message}`));
      setIsRecording(false);
    }
  }, [onAudioRecorded, onError]);
  
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('[AudioRecorder] 🛑 Enregistrement arrêté');
    }
  }, [isRecording]);
  
  const cleanup = useCallback(() => {
    // Arrêter tous les tracks audio
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, []);
  
  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);
  
  return (
    <Button
      variant={isRecording ? "destructive" : "outline"}
      size="icon"
      onClick={handleToggleRecording}
      disabled={disabled || isProcessing}
      className={cn(
        "relative",
        isRecording && "animate-pulse",
        className
      )}
      title={isRecording ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement vocal"}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isRecording ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
      
      {isRecording && (
        <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping" />
      )}
    </Button>
  );
}

/**
 * Convertit un Blob audio en Float32Array pour Transformers.js
 */
async function convertBlobToFloat32Array(blob: Blob): Promise<Float32Array> {
  // Créer un AudioContext
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: 16000
  });
  
  // Lire le blob comme ArrayBuffer
  const arrayBuffer = await blob.arrayBuffer();
  
  // Décoder l'audio
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Extraire les données audio (mono)
  const channelData = audioBuffer.getChannelData(0);
  
  // Retourner comme Float32Array
  return new Float32Array(channelData);
}
