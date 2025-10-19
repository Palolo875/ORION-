import { useState, useEffect } from "react";
import { Conversation, Message } from "../types";

/**
 * Custom hook to manage conversations and their state
 */
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

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
    
    return newConv;
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    setConversations(prev => 
      prev.map(conv => ({ ...conv, isActive: conv.id === id }))
    );
  };

  const handleDeleteConversation = (id: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
    
    if (currentConversationId === id) {
      const remaining = conversations.filter(conv => conv.id !== id);
      if (remaining.length > 0) {
        return remaining[0].id;
      } else {
        const newConv = handleNewConversation();
        return newConv.id;
      }
    }
    return null;
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === id ? { ...conv, title: newTitle } : conv
      )
    );
  };

  const updateConversation = (id: string | null, message: Message) => {
    if (!id) return;
    
    setConversations(prev => 
      prev.map(conv => 
        conv.id === id 
          ? { ...conv, lastMessage: message.content, timestamp: new Date() }
          : conv
      )
    );
  };

  const updateConversationTitle = (id: string | null, title: string) => {
    if (!id) return;
    
    setConversations(prev => 
      prev.map(conv => 
        conv.id === id 
          ? { ...conv, title }
          : conv
      )
    );
  };

  return {
    conversations,
    currentConversationId,
    handleNewConversation,
    handleSelectConversation,
    handleDeleteConversation,
    handleRenameConversation,
    updateConversation,
    updateConversationTitle,
  };
}
