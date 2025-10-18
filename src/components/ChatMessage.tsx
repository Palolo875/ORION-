import { useState } from "react";
import { Copy, Check, ThumbsUp, ThumbsDown, MoreHorizontal, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "./ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { OrionLogo } from "./OrionLogo";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

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
  const isUser = role === "user";

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
          <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </p>
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
            <div className="prose prose-sm sm:prose-base prose-slate dark:prose-invert max-w-none">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>

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

            {/* Métadonnées et informations de débogage */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {timestamp && (
                <span>
                  {formatTime(timestamp)}
                </span>
              )}
              {confidence !== undefined && (
                <span className="message-meta-item">
                  🎯 Confiance: {Math.round(confidence * 100)}%
                </span>
              )}
              {debug?.inferenceTimeMs !== undefined && (
                <span className="message-meta-item">
                  ⏱️ Temps: {debug.inferenceTimeMs}ms
                </span>
              )}
              {debug?.totalRounds !== undefined && debug.totalRounds > 0 && (
                <span className="message-meta-item">
                  🔄 Rounds: {debug.totalRounds}
                </span>
              )}
              {provenance?.toolUsed && (
                <span className="message-meta-item">
                  🛠️ Outil: {provenance.toolUsed}
                </span>
              )}
              {provenance?.fromAgents && provenance.fromAgents.length > 0 && (
                <span className="message-meta-item">
                  🤖 Agents: {provenance.fromAgents.join(', ')}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};
