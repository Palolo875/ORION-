import { useState, useRef, useEffect } from "react";
import { Plus, Send, Mic, Paperclip, X, Wand2, StopCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { UploadPopover } from "./UploadPopover";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
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
  const [attachments, setAttachments] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled && !isGenerating) {
      onSend(message);
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

  const handleMicClick = () => {
    toast({
      title: "Reconnaissance vocale",
      description: "Cette fonctionnalité sera bientôt disponible",
    });
  };

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      setAttachments(prev => [...prev, ...newFiles]);
      toast({
        title: "Fichiers ajoutés",
        description: `${newFiles.length} fichier(s) ajouté(s)`,
      });
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setAttachments(prev => [...prev, file]);
          toast({
            title: "Image collée",
            description: "L'image a été ajoutée aux pièces jointes",
          });
        }
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
              className="flex items-center gap-2 glass rounded-xl px-3 py-2 border border-[hsl(var(--glass-border))]"
            >
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium truncate max-w-32">
                {file.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeAttachment(index)}
                className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Input container */}
      <div className="glass rounded-2xl sm:rounded-3xl p-2 sm:p-3 glass-hover shadow-2xl border border-[hsl(var(--glass-border))]">
        <div className="flex items-end gap-2 sm:gap-3">
          {/* Attachment button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-xl hover:bg-accent/50 transition-colors h-9 w-9"
                disabled={disabled || isGenerating}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="glass rounded-2xl border-[hsl(var(--glass-border))] p-2 w-64"
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
            />
            
            {/* Character count */}
            {message.length > 100 && (
              <div className="absolute bottom-1 right-12 text-xs text-muted-foreground">
                {message.length}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Voice input */}
            <Button
              onClick={handleMicClick}
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-xl hover:bg-accent/50 transition-colors h-9 w-9"
              disabled={disabled || isGenerating}
            >
              <Mic className="h-4 w-4" />
            </Button>

            {/* Send/Stop button */}
            {isGenerating ? (
              <Button
                onClick={onStopGeneration}
                size="icon"
                className="shrink-0 rounded-xl bg-destructive hover:bg-destructive/90 transition-all h-9 w-9"
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                disabled={!message.trim() || disabled}
                size="icon"
                className="shrink-0 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all h-9 w-9"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Footer with suggestions */}
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Appuyez sur Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne</span>
          </div>
          <div className="flex items-center gap-2">
            <Wand2 className="h-3 w-3" />
            <span>ORION peut faire des erreurs</span>
          </div>
        </div>
      </div>
    </div>
  );
};
