import { useState } from "react";
import { Bot, User, Copy, Check, ThumbsUp, ThumbsDown, MoreHorizontal, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "./ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  isTyping?: boolean;
  onRegenerate?: () => void;
  onLike?: () => void;
  onDislike?: () => void;
}

export const ChatMessage = ({ 
  role, 
  content, 
  timestamp, 
  isTyping = false,
  onRegenerate,
  onLike,
  onDislike
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

  return (
    <div className={`group flex gap-3 sm:gap-4 mb-6 sm:mb-8 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
          <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        </div>
      )}
      
      <div className={`flex flex-col max-w-[85%] sm:max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Message content */}
        <div
          className={cn(
            "relative glass rounded-2xl sm:rounded-3xl px-4 py-3 sm:px-6 sm:py-4 group/message",
            isUser 
              ? "bg-primary text-primary-foreground rounded-br-md" 
              : "bg-card/50 backdrop-blur-sm border border-border/50 rounded-bl-md"
          )}
        >
          {isTyping ? (
            <div className="flex items-center gap-1">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
              </div>
              <span className="text-sm text-muted-foreground ml-2">L'IA écrit...</span>
            </div>
          ) : (
            <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
              {content}
            </p>
          )}

          {/* Message actions */}
          {!isTyping && (
            <div className="absolute -bottom-2 right-2 opacity-0 group-hover/message:opacity-100 transition-opacity">
              <div className="flex items-center gap-1 glass rounded-full px-2 py-1 border border-border/50">
                {!isUser && onRegenerate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRegenerate}
                    className="h-6 w-6 hover:bg-accent/50"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="h-6 w-6 hover:bg-accent/50"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>

                {!isUser && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLike}
                      className={cn(
                        "h-6 w-6 hover:bg-accent/50",
                        liked && "text-green-500"
                      )}
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDislike}
                      className={cn(
                        "h-6 w-6 hover:bg-accent/50",
                        disliked && "text-red-500"
                      )}
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                  </>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-accent/50"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleCopy}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copier
                    </DropdownMenuItem>
                    {!isUser && onRegenerate && (
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
          )}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <div className="mt-2 px-2">
            <span className="text-xs text-muted-foreground">
              {formatTime(timestamp)}
            </span>
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/50 border border-border/50">
          <User className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
};
