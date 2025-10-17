import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/ChatInput";
import { SuggestionChips } from "@/components/SuggestionChips";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ChatMessage } from "@/components/ChatMessage";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
    };

    setMessages((prev) => [...prev, newMessage]);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Je suis votre assistant IA. Cette interface est un exemple d'implémentation avec un design minimaliste et élégant inspiré de ChatGPT, Claude et Manus.",
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const showWelcome = messages.length === 0;

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-[hsl(var(--glass-border))]">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-semibold">EIAM</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            className="rounded-full hover:bg-accent/50"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {showWelcome ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="text-center space-y-8 mb-12 max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-light tracking-tight">
                Comment puis-je vous aider ?
              </h2>
              <p className="text-lg text-muted-foreground font-light">
                Posez une question ou choisissez une suggestion ci-dessous
              </p>
            </div>
            <div className="w-full max-w-4xl mb-8">
              <SuggestionChips onSelect={handleSuggestionSelect} />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
              {messages.map((message) => (
                <ChatMessage key={message.id} role={message.role} content={message.content} />
              ))}
            </div>
          </div>
        )}

        {/* Chat Input - Fixed at bottom */}
        <div className="sticky bottom-0 pt-4 pb-safe glass-subtle">
          <ChatInput onSend={handleSendMessage} />
          {!showWelcome && messages.length < 3 && (
            <div className="mt-4">
              <SuggestionChips onSelect={handleSuggestionSelect} />
            </div>
          )}
        </div>
      </main>

      {/* Settings Panel */}
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

export default Index;
