import { useState } from "react";
import { Plus, Send, Mic } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { UploadPopover } from "./UploadPopover";
import { toast } from "@/hooks/use-toast";

interface ChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
}

export const ChatInput = ({ onSend, placeholder = "Comment puis-je vous aider ?" }: ChatInputProps) => {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim()) {
      onSend(message);
      setMessage("");
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

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-8">
      <div className="glass rounded-full p-2 flex items-end gap-2 glass-hover shadow-2xl border border-[hsl(var(--glass-border))]">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full hover:bg-accent/50 transition-colors"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="start"
            className="glass rounded-3xl border-[hsl(var(--glass-border))] p-1 w-64"
          >
            <UploadPopover />
          </PopoverContent>
        </Popover>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[44px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base px-2"
          rows={1}
        />

        <Button
          onClick={handleMicClick}
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-full hover:bg-accent/50 transition-colors"
        >
          <Mic className="h-5 w-5" />
        </Button>

        <Button
          onClick={handleSend}
          disabled={!message.trim()}
          size="icon"
          className="shrink-0 rounded-full bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
