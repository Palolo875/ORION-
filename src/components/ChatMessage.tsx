import { useState, useEffect } from "react";
import { Copy, Check, ThumbsUp, ThumbsDown, MoreHorizontal, RotateCcw, Wrench, Database, Brain, Target, Clock, Users, Volume2, VolumeX, Pause } from "lucide-react";
import { Button } from "./ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { OrionLogo } from "./OrionLogo";
import { motion } from "framer-motion";
import { getTTSInstance, isTTSSupported } from "@/utils/textToSpeech";
import { SafeMessage } from "./SafeMessage";
import { DebateMetrics } from "./DebateMetrics";
import { DebateQuality } from "@/utils/debateQuality";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  isTyping?: boolean;
  onRegenerate?: () => void;
  onLike?: () => void;
  onDislike?: () => void;
  confidence?: number;
  debug?: {
    totalRounds?: number;
    inferenceTimeMs?: number;
    debateQuality?: DebateQuality;
  };
  provenance?: {
    fromAgents?: string[];
    memoryHits?: string[];
    toolUsed?: string;
  };
}

export const ChatMessage = ({ 
  role, 
  content, 
  timestamp, 
  isTyping = false,
  onRegenerate,
  onLike,
  onDislike,
  confidence,
  debug,
  provenance
}: ChatMessageProps) => {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isUser = role === "user";
  const ttsSupported = isTTSSupported();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast({
        title: "Copié",
        description: "Le message a été copié dans le presse-papiers",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le message",
        variant: "destructive",
      });
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    if (disliked) setDisliked(false);
    onLike?.();
  };

  const handleDislike = () => {
    setDisliked(!disliked);
    if (liked) setLiked(false);
    onDislike?.();
  };

  const handleSpeak = () => {
    if (!ttsSupported) {
      toast({
        title: "Non supporté",
        description: "La synthèse vocale n'est pas disponible dans ce navigateur",
        variant: "destructive",
      });
      return;
    }

    try {
      const tts = getTTSInstance();

      if (isSpeaking && !isPaused) {
        // Arrêter la lecture
        tts.stop();
        setIsSpeaking(false);
        setIsPaused(false);
      } else if (isPaused) {
        // Reprendre la lecture
        tts.resume();
        setIsPaused(false);
      } else {
        // Démarrer la lecture
        // Nettoyer le markdown pour obtenir le texte brut
        const plainText = content
          .replace(/```[\s\S]*?```/g, '') // Retirer les blocs de code
          .replace(/`[^`]*`/g, '') // Retirer le code inline
          .replace(/[*_~#]/g, '') // Retirer les marqueurs markdown
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convertir les liens
          .trim();

        tts.speak(plainText, {
          lang: 'fr-FR',
          rate: 1.0,
          pitch: 1.0,
          volume: 1.0,
        }, {
          onStart: () => {
            setIsSpeaking(true);
            setIsPaused(false);
          },
          onEnd: () => {
            setIsSpeaking(false);
            setIsPaused(false);
          },
          onError: (error) => {
            console.error('[TTS] Erreur:', error);
            setIsSpeaking(false);
            setIsPaused(false);
            toast({
              title: "Erreur TTS",
              description: "Impossible de lire le texte",
              variant: "destructive",
            });
          },
        });
      }
    } catch (error) {
      console.error('[TTS] Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'initialiser la synthèse vocale",
        variant: "destructive",
      });
    }
  };

  const handlePauseTTS = () => {
    if (!isSpeaking || isPaused) return;
    
    try {
      const tts = getTTSInstance();
      tts.pause();
      setIsPaused(true);
    } catch (error) {
      console.error('[TTS] Erreur pause:', error);
    }
  };

  // Cleanup TTS when component unmounts
  useEffect(() => {
    return () => {
      if (isSpeaking) {
        try {
          const tts = getTTSInstance();
          tts.stop();
        } catch (error) {
          console.error('[TTS] Erreur cleanup:', error);
        }
      }
    };
  }, [isSpeaking]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const animationProps = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
  };

  if (isUser) {
    // Message de l'utilisateur - Bulle à droite
    return (
      <motion.div {...animationProps} className="w-full flex justify-end mb-6 sm:mb-8">
        <div className="max-w-[85%] sm:max-w-[70%] px-4 sm:px-6 py-3 sm:py-4 rounded-3xl bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-lg">
          <SafeMessage 
            content={content} 
            sender="user"
            allowMarkdown={false}
          />
          {timestamp && (
            <div className="mt-2 text-right">
              <span className="text-xs opacity-80">
                {formatTime(timestamp)}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Message de l'IA - Sans bulle, à gauche
  return (
    <motion.div {...animationProps} className="w-full mb-6 sm:mb-8 group">
      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
        <OrionLogo className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
        <span className="text-sm sm:text-base font-semibold">ORION</span>
      </div>
      
      <div className="relative pl-0 sm:pl-0">
        {isTyping ? (
          <div className="flex items-center gap-1">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
            </div>
            <span className="text-sm text-muted-foreground ml-2">L'IA écrit...</span>
          </div>
        ) : (
          <>
            <SafeMessage 
              content={content} 
              sender="assistant"
              allowMarkdown={true}
            />

            {/* Actions du message */}
            <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1">
                {onRegenerate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRegenerate}
                    className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-accent/50 rounded-full"
                  >
                    <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-accent/50 rounded-full"
                >
                  {copied ? (
                    <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                </Button>

                {ttsSupported && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSpeak}
                      className={cn(
                        "h-7 w-7 sm:h-8 sm:w-8 hover:bg-accent/50 rounded-full",
                        isSpeaking && !isPaused && "text-primary"
                      )}
                      title={isSpeaking && !isPaused ? "Arrêter la lecture" : isPaused ? "Reprendre" : "Lire à voix haute"}
                    >
                      {isSpeaking && !isPaused ? (
                        <VolumeX className="h-3 w-3 sm:h-4 sm:w-4" />
                      ) : (
                        <Volume2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                    </Button>
                    
                    {isSpeaking && !isPaused && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePauseTTS}
                        className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-accent/50 rounded-full"
                        title="Mettre en pause"
                      >
                        <Pause className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    )}
                  </>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLike}
                  className={cn(
                    "h-7 w-7 sm:h-8 sm:w-8 hover:bg-accent/50 rounded-full",
                    liked && "text-green-500"
                  )}
                >
                  <ThumbsUp className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDislike}
                  className={cn(
                    "h-7 w-7 sm:h-8 sm:w-8 hover:bg-accent/50 rounded-full",
                    disliked && "text-red-500"
                  )}
                >
                  <ThumbsDown className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-accent/50 rounded-full"
                    >
                      <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={handleCopy}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copier
                    </DropdownMenuItem>
                    {onRegenerate && (
                      <DropdownMenuItem onClick={onRegenerate}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Régénérer
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      Signaler
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Provenance - Sources utilisées */}
            {(provenance?.toolUsed || provenance?.memoryHits || provenance?.fromAgents) && (
              <div className="mt-4 glass rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-foreground">Sources utilisées</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TooltipProvider>
                    {provenance?.toolUsed && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <Wrench className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">Outil Local</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Outil utilisé: {provenance.toolUsed}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    
                    {provenance?.memoryHits && provenance.memoryHits.length > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            <Database className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">{provenance.memoryHits.length} Souvenir(s)</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs font-semibold mb-1">Souvenirs utilisés:</p>
                          {provenance.memoryHits.slice(0, 3).map((hit, i) => (
                            <p key={i} className="text-xs truncate">{hit}</p>
                          ))}
                          {provenance.memoryHits.length > 3 && (
                            <p className="text-xs italic">et {provenance.memoryHits.length - 3} de plus...</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    
                    {provenance?.fromAgents?.includes('LLMAgent') && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                            <Brain className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">Raisonnement LLM</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Réponse générée par le modèle de langage</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {provenance?.fromAgents && provenance.fromAgents.length > 1 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                            <Users className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">Multi-agents</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Agents: {provenance.fromAgents.join(', ')}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TooltipProvider>
                </div>
              </div>
            )}

            {/* Métriques de Qualité du Débat */}
            {debug?.debateQuality && (
              <DebateMetrics metrics={debug.debateQuality} className="mt-4" />
            )}

            {/* Métadonnées et informations de débogage */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {timestamp && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(timestamp)}
                </span>
              )}
              {confidence !== undefined && (
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Confiance: {Math.round(confidence * 100)}%
                </span>
              )}
              {debug?.inferenceTimeMs !== undefined && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {debug.inferenceTimeMs}ms
                </span>
              )}
              {debug?.totalRounds !== undefined && debug.totalRounds > 0 && (
                <span className="flex items-center gap-1">
                  Rounds: {debug.totalRounds}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};
