import { useState, useEffect } from "react";
import { Settings, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/ChatInput";
import { SuggestionChips } from "@/components/SuggestionChips";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ChatMessage } from "@/components/ChatMessage";
import { Sidebar } from "@/components/Sidebar";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  isActive: boolean;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize with a default conversation
  useEffect(() => {
    if (conversations.length === 0) {
      const defaultConv: Conversation = {
        id: "default",
        title: "Nouvelle conversation",
        lastMessage: "",
        timestamp: new Date(),
        isActive: true,
      };
      setConversations([defaultConv]);
      setCurrentConversationId("default");
    }
  }, [conversations.length]);

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsGenerating(true);

    // Update conversation title if it's the first message
    if (messages.length === 0) {
      const title = content.length > 30 ? content.substring(0, 30) + "..." : content;
      setConversations(prev => 
        prev.map(conv => 
          conv.id === currentConversationId 
            ? { ...conv, title, lastMessage: content, timestamp: new Date() }
            : conv
        )
      );
    }

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Je suis votre assistant IA EIAM. Cette interface moderne s'inspire des meilleures pratiques de ChatGPT, Claude et Manus. Comment puis-je vous aider aujourd'hui ?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsGenerating(false);

      // Update conversation with AI response
      setConversations(prev => 
        prev.map(conv => 
          conv.id === currentConversationId 
            ? { ...conv, lastMessage: aiMessage.content, timestamp: new Date() }
            : conv
        )
      );
    }, 2000);
  };

  const handleNewConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: "Nouvelle conversation",
      lastMessage: "",
      timestamp: new Date(),
      isActive: true,
    };
    
    setConversations(prev => 
      prev.map(conv => ({ ...conv, isActive: false })).concat(newConv)
    );
    setCurrentConversationId(newConv.id);
    setMessages([]);
    setIsSidebarOpen(false);
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    setConversations(prev => 
      prev.map(conv => ({ ...conv, isActive: conv.id === id }))
    );
    setIsSidebarOpen(false);
  };

  const handleDeleteConversation = (id: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
    if (currentConversationId === id) {
      const remaining = conversations.filter(conv => conv.id !== id);
      if (remaining.length > 0) {
        setCurrentConversationId(remaining[0].id);
        setMessages([]);
      } else {
        handleNewConversation();
      }
    }
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === id ? { ...conv, title: newTitle } : conv
      )
    );
  };

  const handleRegenerate = () => {
    if (messages.length > 0) {
      const lastUserMessage = messages.filter(m => m.role === "user").pop();
      if (lastUserMessage) {
        setMessages(prev => prev.filter(m => m.role === "assistant"));
        handleSendMessage(lastUserMessage.content);
      }
    }
  };

  const handleStopGeneration = () => {
    setIsGenerating(false);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const showWelcome = messages.length === 0;

  return (
    <div className="min-h-screen flex relative">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 glass border-b border-[hsl(var(--glass-border))]">
          <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden rounded-full hover:bg-accent/50 h-8 w-8 sm:h-10 sm:w-10"
              >
                <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <h1 className="text-lg sm:text-xl font-semibold">EIAM</h1>
            </div>
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

        {/* Main Content */}
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
                    timestamp={message.timestamp}
                    isTyping={message.isTyping}
                    onRegenerate={message.role === "assistant" ? handleRegenerate : undefined}
                  />
                ))}
                {isGenerating && (
                  <ChatMessage 
                    role="assistant" 
                    content="" 
                    timestamp={new Date()}
                    isTyping={true}
                  />
                )}
              </div>
            </div>
          )}

          {/* Chat Input - Fixed at bottom */}
          <div className="sticky bottom-0 pt-2 sm:pt-4 pb-safe glass-subtle">
            <ChatInput 
              onSend={handleSendMessage}
              isGenerating={isGenerating}
              onStopGeneration={handleStopGeneration}
            />
            {!showWelcome && messages.length < 3 && (
              <div className="mt-2 sm:mt-4">
                <SuggestionChips onSelect={handleSuggestionSelect} />
              </div>
            )}
          </div>
        </main>
      </div>

        {/* Settings Panel */}
        <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    </div>
  );
};

export default Index;
