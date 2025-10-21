import { useState, useCallback } from "react";
import { Message } from "../types";
import { ProcessedFile } from "@/utils/fileProcessor";

/**
 * Custom hook to manage chat messages
 */
export function useChatMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const addUserMessage = useCallback((content: string, attachments?: ProcessedFile[]): Message => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
      attachments,
    };

    setMessages(prev => [...prev, newMessage]);
    setIsGenerating(true);
    
    return newMessage;
  }, []);

  const addAssistantMessage = useCallback((
    content: string,
    confidence?: number,
    provenance?: Message['provenance'],
    debug?: Message['debug'],
    reasoningSteps?: Message['reasoningSteps']
  ): Message => {
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content,
      timestamp: new Date(),
      confidence,
      provenance,
      debug,
      reasoningSteps,
    };
    
    setMessages(prev => [...prev, aiMessage]);
    setIsGenerating(false);
    
    return aiMessage;
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const getLastUserMessage = useCallback(() => {
    return messages.filter(m => m.role === "user").pop();
  }, [messages]);

  const removeAssistantMessages = useCallback(() => {
    setMessages(prev => prev.filter(m => m.role === "user"));
  }, []);

  const getConversationHistory = useCallback(() => {
    return messages.map(msg => ({
      sender: msg.role === 'user' ? 'user' as const : 'orion' as const,
      text: msg.content,
      id: msg.id
    }));
  }, [messages]);

  const stopGeneration = useCallback(() => {
    setIsGenerating(false);
  }, []);

  return {
    messages,
    isGenerating,
    addUserMessage,
    addAssistantMessage,
    clearMessages,
    getLastUserMessage,
    removeAssistantMessages,
    getConversationHistory,
    stopGeneration,
    setIsGenerating,
  };
}
