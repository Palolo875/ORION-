/**
 * ChatMessages Component
 * Affiche la liste des messages de conversation
 */
import React from 'react';
import { ChatMessage } from "@/components/ChatMessage";
import { Message } from "@/features/chat/types";

interface ChatMessagesProps {
  messages: Message[];
  isGenerating: boolean;
  onRegenerate: () => void;
  onLike: (messageId: string) => void;
  onDislike: (messageId: string) => void;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ 
  messages, 
  isGenerating,
  onRegenerate,
  onLike,
  onDislike
}) => {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-4xl">
        {messages.map((message) => (
          <ChatMessage 
            key={message.id} 
            role={message.role} 
            content={message.content}
            timestamp={message.timestamp}
            isTyping={message.isTyping}
            onRegenerate={message.role === "assistant" ? onRegenerate : undefined}
            onLike={message.role === "assistant" ? () => onLike(message.id) : undefined}
            onDislike={message.role === "assistant" ? () => onDislike(message.id) : undefined}
            confidence={message.confidence}
            debug={message.debug}
            provenance={message.provenance}
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
  );
};
