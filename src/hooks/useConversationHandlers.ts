/**
 * useConversationHandlers Hook
 * Gestion centralisée des handlers de conversation
 */
import { ProcessedFile } from "@/utils/fileProcessor";
import { toast } from "@/hooks/use-toast";
import { Message, Conversation } from "@/features/chat/types";
import { DeviceProfile } from "@/utils/performance/deviceProfiler";
import { FlowStep } from "@/types";

interface ConversationHandlersProps {
  messages: Message[];
  addUserMessage: (content: string, attachments?: ProcessedFile[]) => Message;
  removeAssistantMessages: () => void;
  getLastUserMessage: () => Message | null;
  getConversationHistory: () => { sender: 'user' | 'orion'; text: string; id?: string }[];
  updateConversationTitle: (id: string, title: string) => void;
  updateConversation: (id: string, message: Message) => void;
  sendQuery: (content: string, history: { sender: 'user' | 'orion'; text: string; id?: string }[], profile: DeviceProfile | null, attachments?: ProcessedFile[]) => void;
  sendFeedback: (messageId: string, type: 'good' | 'bad', query: string, response: string) => void;
  incrementLikes: () => void;
  incrementDislikes: () => void;
  setFlowState: (state: { currentStep: FlowStep; stepDetails: string }) => void;
}

export const useConversationHandlers = ({
  messages,
  addUserMessage,
  removeAssistantMessages,
  getLastUserMessage,
  getConversationHistory,
  updateConversationTitle,
  updateConversation,
  sendQuery,
  sendFeedback,
  incrementLikes,
  incrementDislikes,
  setFlowState,
}: ConversationHandlersProps) => {
  
  const handleSendMessage = (
    content: string, 
    currentConversationId: string,
    deviceProfile: DeviceProfile | null,
    attachments?: ProcessedFile[]
  ) => {
    const userMessage = addUserMessage(content, attachments);
    
    setFlowState({
      currentStep: 'query',
      stepDetails: 'Analyse de votre question en cours...'
    });

    if (messages.length === 0) {
      const title = content.length > 30 ? content.substring(0, 30) + "..." : content;
      updateConversationTitle(currentConversationId, title);
    }

    updateConversation(currentConversationId, userMessage);
    sendQuery(content, getConversationHistory(), deviceProfile, attachments);
  };

  const handleRegenerate = () => {
    const lastUserMessage = getLastUserMessage();
    if (lastUserMessage) {
      removeAssistantMessages();
      return lastUserMessage;
    }
    return null;
  };

  const handleLike = (messageId: string) => {
    console.log(`[UI] Feedback positif reçu pour le message ${messageId}`);
    
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex > 0) {
      const response = messages[messageIndex].content;
      const query = messages[messageIndex - 1].content;

      sendFeedback(messageId, 'good', query, response);
      incrementLikes();
    }
  };

  const handleDislike = (messageId: string) => {
    console.log(`[UI] Feedback négatif reçu pour le message ${messageId}`);
    
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex > 0) {
      const response = messages[messageIndex].content;
      const query = messages[messageIndex - 1].content;

      sendFeedback(messageId, 'bad', query, response);
      incrementDislikes();
    }
  };

  const handleExportConversation = (conversations: Conversation[], currentConversationId: string) => {
    const currentConversation = conversations.find(conv => conv.id === currentConversationId);
    const exportData = {
      conversation: currentConversation,
      messages: messages,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orion-conversation-${currentConversation?.title.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportConversation = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (!data.conversation || !data.messages || !Array.isArray(data.messages)) {
          throw new Error('Structure de fichier invalide');
        }
        
        toast({
          title: "Import réussi",
          description: `Conversation "${data.conversation.title}" importée avec ${data.messages.length} messages`,
        });
      } catch (error) {
        console.error('[UI] Erreur lors de l\'import de conversation:', error);
        toast({
          title: "Erreur d'import",
          description: error instanceof Error ? error.message : "Le fichier n'est pas valide",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  return {
    handleSendMessage,
    handleRegenerate,
    handleLike,
    handleDislike,
    handleExportConversation,
    handleImportConversation,
  };
};
