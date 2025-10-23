import { useState, useRef, useEffect } from "react";
import { Plus, Send, Mic, Paperclip, X, Wand2, StopCircle, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { UploadPopover } from "./UploadPopover";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { processFiles, formatFileSize, ProcessedFile } from "@/utils/fileProcessor";
import { validateUserInput, rateLimiter } from "@/utils/security";
import { logger } from "@/utils/logger";

interface ChatInputProps {
  onSend: (message: string, attachments?: ProcessedFile[]) => void;
  placeholder?: string;
  isGenerating?: boolean;
  onStopGeneration?: () => void;
  disabled?: boolean;
}

export const ChatInput = ({ 
  onSend, 
  placeholder = "Comment puis-je vous aider ?",
  isGenerating = false,
  onStopGeneration,
  disabled = false
}: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Type definitions for Web Speech API
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    onstart: () => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
  }

  interface SpeechRecognitionEvent {
    resultIndex: number;
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionResultList {
    length: number;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    isFinal: boolean;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    transcript: string;
  }

  interface SpeechRecognitionErrorEvent {
    error: string;
  }

  const handleSend = () => {
    if ((message.trim() || attachments.length > 0) && !disabled && !isGenerating && !isProcessing) {
      // Rate limiting (max 10 messages par minute)
      if (!rateLimiter.check('chat_input', 10, 60000)) {
        toast({
          title: "Trop de messages",
          description: "Veuillez patienter quelques secondes avant d'envoyer un autre message",
          variant: "destructive",
        });
        return;
      }

      // Validation du message
      if (message.trim()) {
        const validation = validateUserInput(message, {
          maxLength: 10000,
          context: 'ChatInput'
        });

        // Si le message est bloqué (contenu malveillant)
        if (validation.blocked) {
          logger.warn('ChatInput', 'Message bloqué pour contenu suspect', {
            warnings: validation.warnings
          });
          toast({
            title: "Message bloqué",
            description: "Votre message contient du contenu potentiellement dangereux",
            variant: "destructive",
          });
          return;
        }

        // Si des warnings mais pas bloqué, informer l'utilisateur
        if (!validation.isValid && validation.warnings.length > 0) {
          logger.info('ChatInput', 'Message modifié lors de la validation', {
            warnings: validation.warnings
          });
          toast({
            title: "Message modifié",
            description: "Votre message a été nettoyé pour des raisons de sécurité",
          });
        }

        // Envoyer le message sanitizé
        onSend(validation.sanitized, attachments.length > 0 ? attachments : undefined);
      } else {
        // Pas de message texte mais des attachments
        onSend(message, attachments.length > 0 ? attachments : undefined);
      }

      setMessage("");
      setAttachments([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    // Check if browser supports Web Speech API
    const SpeechRecognitionAPI = (window as Window & { 
      SpeechRecognition?: new () => SpeechRecognition; 
      webkitSpeechRecognition?: new () => SpeechRecognition;
    }).SpeechRecognition || (window as Window & { 
      SpeechRecognition?: new () => SpeechRecognition; 
      webkitSpeechRecognition?: new () => SpeechRecognition;
    }).webkitSpeechRecognition;
    
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'fr-FR'; // French language
      
      recognition.onstart = () => {
        setIsRecording(true);
        setRecordingTime(0);
        // Démarrer le timer
        recordingIntervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
        toast({
          title: "Écoute en cours...",
          description: "Parlez maintenant",
        });
      };
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setMessage(prev => prev + finalTranscript);
        }
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        
        let errorMessage = "Une erreur est survenue";
        switch (event.error) {
          case 'no-speech':
            errorMessage = "Aucune parole détectée";
            break;
          case 'audio-capture':
            errorMessage = "Aucun microphone trouvé";
            break;
          case 'not-allowed':
            errorMessage = "Permission du microphone refusée";
            break;
          case 'network':
            errorMessage = "Erreur réseau";
            break;
          default:
            errorMessage = `Erreur: ${event.error}`;
        }
        
        toast({
          title: "Erreur de reconnaissance vocale",
          description: errorMessage,
          variant: "destructive",
        });
      };
      
      recognition.onend = () => {
        setIsRecording(false);
        setRecordingTime(0);
        // Arrêter le timer
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
      };
      
      recognitionRef.current = recognition;
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const handleMicClick = () => {
    // Check if browser supports Web Speech API
    const SpeechRecognitionAPI = (window as Window & { 
      SpeechRecognition?: new () => SpeechRecognition; 
      webkitSpeechRecognition?: new () => SpeechRecognition;
    }).SpeechRecognition || (window as Window & { 
      SpeechRecognition?: new () => SpeechRecognition; 
      webkitSpeechRecognition?: new () => SpeechRecognition;
    }).webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      toast({
        title: "Non supporté",
        description: "Votre navigateur ne supporte pas la reconnaissance vocale. Essayez Chrome ou Edge.",
        variant: "destructive",
      });
      return;
    }
    
    if (isRecording) {
      // Stop recording
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      setRecordingTime(0);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      toast({
        title: "Enregistrement arrêté",
        description: "Reconnaissance vocale terminée",
      });
    } else {
      // Start recording
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.error('Error starting recognition:', error);
          toast({
            title: "Erreur",
            description: "Impossible de démarrer la reconnaissance vocale",
            variant: "destructive",
          });
        }
      }
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      const fileArray = Array.from(files);
      const { processed, errors } = await processFiles(fileArray);
      
      if (processed.length > 0) {
        setAttachments(prev => [...prev, ...processed]);
        
        toast({
          title: "Fichiers traités avec succès",
          description: `${processed.length} fichier(s) ajouté(s)`,
        });
      }
      
      if (errors.length > 0) {
        toast({
          title: "Erreurs de traitement",
          description: errors.map(e => `${e.file}: ${e.error}`).join('\n'),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors du traitement des fichiers",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }
    
    if (files.length > 0) {
      setIsProcessing(true);
      
      try {
        const { processed, errors } = await processFiles(files);
        
        if (processed.length > 0) {
          setAttachments(prev => [...prev, ...processed]);
          toast({
            title: "Image(s) collée(s)",
            description: `${processed.length} image(s) ajoutée(s)`,
          });
        }
        
        if (errors.length > 0) {
          toast({
            title: "Erreur",
            description: errors[0].error,
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Erreur lors du traitement de l'image",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 pb-4 sm:pb-8">
      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="group relative flex items-center gap-2 glass rounded-xl px-3 py-2 border border-[hsl(var(--glass-border))] hover:border-primary/50 transition-colors"
            >
              {file.preview ? (
                <div className="flex items-center gap-2">
                  <div className="relative w-10 h-10 rounded overflow-hidden">
                    <img 
                      src={file.preview} 
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate max-w-32">
                      {file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                      {file.metadata?.width && ` • ${file.metadata.width}x${file.metadata.height}`}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate max-w-32">
                      {file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                      {file.metadata?.wordCount && ` • ${file.metadata.wordCount} mots`}
                    </span>
                  </div>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeAttachment(index)}
                className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive ml-2"
                aria-label={`Supprimer ${file.name}`}
                title={`Supprimer ${file.name}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      {/* Processing indicator */}
      {isProcessing && (
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          <span>Traitement des fichiers...</span>
        </div>
      )}

      {/* Input container avec design organique */}
      <div className="glass rounded-[2rem] sm:rounded-[2.5rem] p-3 sm:p-4 glass-hover shadow-2xl border-2 border-[hsl(var(--glass-border))] bg-gradient-to-br from-[hsl(var(--pastel-feather))]/20 to-white/50 dark:from-[hsl(var(--pastel-feather))]/10 dark:to-transparent">
        <div className="flex items-end gap-2 sm:gap-3">
          {/* Attachment button avec design organique */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-2xl hover:bg-gradient-to-br hover:from-[hsl(var(--pastel-violet))]/20 hover:to-[hsl(var(--pastel-rose))]/10 transition-all h-10 w-10 hover:scale-110"
                disabled={disabled || isGenerating}
                aria-label="Joindre un fichier"
                title="Joindre un fichier"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="glass rounded-3xl border-[hsl(var(--glass-border))] p-3 w-64"
            >
              <UploadPopover onFileSelect={handleFileUpload} />
            </PopoverContent>
          </Popover>

          {/* Text input */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={placeholder}
              className="min-h-[40px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm sm:text-base px-3 py-2 pr-12"
              rows={1}
              disabled={disabled || isGenerating}
              aria-label="Saisir votre message"
              aria-multiline="true"
            />
            
            {/* Character count */}
            {message.length > 100 && (
              <div className="absolute bottom-1 right-12 text-xs text-muted-foreground">
                {message.length}
              </div>
            )}
          </div>

          {/* Action buttons avec design organique */}
          <div className="flex items-center gap-2">
            {/* Voice input with recording indicator */}
            <div className="relative flex items-center gap-2">
              {isRecording && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-red-500/20 to-red-500/10 rounded-2xl px-3 py-2 animate-fade-in border border-red-500/30">
                  <div className="flex gap-1">
                    <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm font-medium text-red-500">
                    {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
              <Button
                onClick={handleMicClick}
                variant={isRecording ? "default" : "ghost"}
                size="icon"
                className={cn(
                  "shrink-0 rounded-2xl transition-all h-10 w-10 hover:scale-110",
                  isRecording 
                    ? "bg-gradient-to-br from-red-500 to-red-600 shadow-lg" 
                    : "hover:bg-gradient-to-br hover:from-[hsl(var(--pastel-mint))]/20 hover:to-[hsl(var(--pastel-sky))]/10"
                )}
                disabled={disabled || isGenerating}
                aria-label={isRecording ? "Arrêter l'enregistrement vocal" : "Démarrer l'enregistrement vocal"}
                aria-pressed={isRecording}
                title={isRecording ? "Arrêter l'enregistrement" : "Enregistrement vocal"}
              >
                <Mic className={cn("h-5 w-5", isRecording && "text-white")} />
              </Button>
            </div>

            {/* Send/Stop button avec design organique */}
            {isGenerating ? (
              <Button
                onClick={onStopGeneration}
                size="icon"
                className="shrink-0 rounded-2xl bg-gradient-to-br from-destructive to-destructive/80 hover:scale-110 transition-all h-10 w-10 shadow-lg"
                aria-label="Arrêter la génération"
                title="Arrêter la génération de la réponse"
              >
                <StopCircle className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                disabled={(!message.trim() && attachments.length === 0) || disabled || isProcessing}
                size="icon"
                className="shrink-0 rounded-2xl bg-gradient-to-br from-primary to-accent hover:scale-110 disabled:opacity-50 disabled:hover:scale-100 transition-all h-10 w-10 shadow-lg"
                aria-label="Envoyer le message"
                title="Envoyer (Entrée)"
              >
                <Send className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Footer with suggestions - design organique */}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline">Appuyez sur Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne</span>
            <span className="sm:hidden">Entrée pour envoyer</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-[hsl(var(--pastel-feather))]/30">
            <Wand2 className="h-3 w-3" />
            <span className="hidden sm:inline">ORION peut faire des erreurs</span>
          </div>
        </div>
      </div>
    </div>
  );
};
