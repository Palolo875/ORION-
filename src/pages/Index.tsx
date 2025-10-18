import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/ChatInput";
import { SuggestionChips } from "@/components/SuggestionChips";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ChatMessage } from "@/components/ChatMessage";
import { ConversationSidebar } from "@/components/ConversationSidebar";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  timestamp: Date;
  preview: string;
  messages: Message[];
}

const STORAGE_KEY = "eiam_conversations";

const Index = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load conversations from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Array<Omit<Conversation, "timestamp"> & { timestamp: string }>;
      const conversationsWithDates = parsed.map((conv) => ({
        ...conv,
        timestamp: new Date(conv.timestamp),
      }));
      setConversations(conversationsWithDates);
      if (conversationsWithDates.length > 0) {
        setCurrentConversationId(conversationsWithDates[0].id);
      }
    }
  }, []);

  // Save conversations to localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    }
  }, [conversations]);

  const currentConversation = conversations.find((c) => c.id === currentConversationId);
  const messages = currentConversation?.messages || [];

  const generateTitle = (firstMessage: string) => {
    return firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
  };

  const handleSendMessage = (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
    };

    if (!currentConversationId) {
      // Create new conversation
      const newConversation: Conversation = {
        id: Date.now().toString(),
        title: generateTitle(content),
        timestamp: new Date(),
        preview: content,
        messages: [userMessage],
      };
      setConversations((prev) => [newConversation, ...prev]);
      setCurrentConversationId(newConversation.id);
    } else {
      // Add to existing conversation
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === currentConversationId
            ? {
                ...conv,
                messages: [...conv.messages, userMessage],
                preview: content,
                timestamp: new Date(),
              }
            : conv
        )
      );
    }

    // Simulate AI response with streaming
    setTimeout(() => {
      const aiResponses = [
        "Voici un exemple de réponse avec **Markdown**:\n\n## Code Example\n\n```javascript\nconst greeting = 'Bonjour monde!';\nconsole.log(greeting);\n```\n\nLe markdown est maintenant parfaitement supporté! 🎉",
        "Je peux vous aider avec:\n\n1. **Analyse de code** - Je peux examiner et expliquer du code\n2. **Debug** - Identifier et corriger des bugs\n3. **Architecture** - Conseiller sur la structure d'un projet\n4. **Optimisation** - Améliorer les performances\n\nQue souhaitez-vous faire?",
        "```python\n# Exemple de fonction Python\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n\nprint(fibonacci(10))\n```\n\nVoici un exemple de code Python avec la suite de Fibonacci.",
        "L'interface actuelle s'inspire de plusieurs assistants IA modernes:\n\n- **ChatGPT** : Sidebar avec historique\n- **Claude** : Design minimaliste et élégant\n- **Manus AI** : Effets visuels modernes\n\nToutes ces fonctionnalités sont maintenant intégrées!",
      ];

      const randomResponse =
        aiResponses[Math.floor(Math.random() * aiResponses.length)];

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: randomResponse,
        isStreaming: true,
      };

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === currentConversationId
            ? { ...conv, messages: [...conv.messages, aiMessage] }
            : conv
        )
      );
    }, 500);
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((conv) => conv.id !== id));
    if (currentConversationId === id) {
      const remaining = conversations.filter((conv) => conv.id !== id);
      setCurrentConversationId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const showWelcome = messages.length === 0;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="sticky top-0 z-30 glass border-b border-[hsl(var(--glass-border))]">
          <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
            <h1 className="text-lg sm:text-xl font-semibold lg:ml-0 ml-10">EIAM</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-full hover:bg-accent/50 h-8 w-8 sm:h-10 sm:w-10"
            >
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 flex flex-col">
          {showWelcome ? (
            <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4">
              <div className="text-center space-y-4 sm:space-y-8 mb-8 sm:mb-12 max-w-2xl">
                <h2 className="text-2xl sm:text-4xl md:text-5xl font-light tracking-tight">
                  Comment puis-je vous aider ?
                </h2>
                <p className="text-sm sm:text-lg text-muted-foreground font-light">
                  Posez une question ou choisissez une suggestion ci-dessous
                </p>
              </div>
              <div className="w-full max-w-4xl mb-6 sm:mb-8">
                <SuggestionChips onSelect={handleSuggestionSelect} />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-4xl">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    isStreaming={message.isStreaming}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Chat Input - Fixed at bottom */}
          <div className="sticky bottom-0 pt-2 sm:pt-4 pb-safe glass-subtle">
            <ChatInput onSend={handleSendMessage} />
            {!showWelcome && messages.length < 3 && (
              <div className="mt-2 sm:mt-4">
                <SuggestionChips onSelect={handleSuggestionSelect} />
              </div>
            )}
          </div>
        </main>

        {/* Settings Panel */}
        <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    </div>
  );
};

export default Index;
