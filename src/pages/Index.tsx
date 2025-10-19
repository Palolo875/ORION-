import { useState, useEffect } from "react";
import { Settings, Menu, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/ChatInput";
import { SuggestionChips } from "@/components/SuggestionChips";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ChatMessage } from "@/components/ChatMessage";
import { Sidebar } from "@/components/Sidebar";
import { CognitiveFlow, FlowStep } from "@/components/CognitiveFlow";
import { ControlPanel } from "@/components/ControlPanel";
import { ModelSelector } from "@/components/ModelSelector";
import { ModelLoader } from "@/components/ModelLoader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FinalResponsePayload } from "@/types";
import { detectDeviceProfile, DeviceProfile } from "@/utils/performance";
import { DEFAULT_MODEL } from "@/config/models";
import { BrowserCompatibilityBanner } from "@/components/BrowserCompatibilityBanner";
import { ProcessedFile } from "@/utils/fileProcessor";
import { toast } from "@/hooks/use-toast";
import { 
  useConversations, 
  useModelManagement, 
  useOrchestratorWorker, 
  useMigrationWorker,
  useChatMessages,
  useMemoryStats
} from "@/features/chat/hooks";
import { Message } from "@/features/chat/types";
import { useSemanticCache } from "@/hooks/useSemanticCache";

const Index = () => {
  // UI state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [deviceProfile, setDeviceProfile] = useState<DeviceProfile | null>(null);
  const [flowState, setFlowState] = useState<{ currentStep: FlowStep; stepDetails: string }>({
    currentStep: 'idle',
    stepDetails: 'Prêt à recevoir une requête.'
  });
  const [showCognitiveFlow, setShowCognitiveFlow] = useState(false);
  
  // Debate configuration state
  const [debateMode, setDebateMode] = useState<'fast' | 'balanced' | 'thorough' | 'custom'>('balanced');
  const [customAgents, setCustomAgents] = useState<string[]>(['logical', 'synthesizer']);
  
  // Custom hooks for feature management
  const { 
    messages, 
    isGenerating, 
    addUserMessage, 
    addAssistantMessage, 
    clearMessages,
    getLastUserMessage,
    removeAssistantMessages,
    getConversationHistory,
    stopGeneration: handleStopGeneration
  } = useChatMessages();
  
  const {
    conversations,
    currentConversationId,
    handleNewConversation: createNewConversation,
    handleSelectConversation,
    handleDeleteConversation: deleteConversation,
    handleRenameConversation,
    updateConversation,
    updateConversationTitle,
  } = useConversations();
  
  const {
    selectedModel,
    isModelLoading,
    modelLoadProgress,
    handleModelSelect: selectModel,
    updateLoadProgress,
    getCurrentModelInfo,
  } = useModelManagement();
  
  const {
    memoryStats,
    addInferenceTime,
    incrementLikes,
    incrementDislikes,
    resetStats,
  } = useMemoryStats();

  // Initialize semantic cache
  const { 
    getCacheStats,
    exportCache,
    importCache
  } = useSemanticCache();

  // Initialize orchestrator worker with callbacks
  const { 
    sendQuery, 
    sendFeedback, 
    purgeMemory,
    exportMemory,
    importMemory,
    setModel: workerSetModel
  } = useOrchestratorWorker({
    onStatusUpdate: (step, details) => {
      setFlowState({ currentStep: step, stepDetails: details });
    },
    onLoadProgress: (progress) => {
      updateLoadProgress(progress);
    },
    onFinalResponse: (finalPayload, traceId) => {
      console.log(`[UI] Réponse reçue (traceId: ${traceId})`);
      
      // Update flow to final response
      setFlowState({
        currentStep: 'final_response',
        stepDetails: 'Réponse générée avec succès'
      });
      
      // Reset flow to idle after delay
      setTimeout(() => {
        setFlowState({
          currentStep: 'idle',
          stepDetails: 'Prêt à recevoir une requête.'
        });
      }, 2000);
      
      // Add assistant message
      const aiMessage = addAssistantMessage(
        finalPayload.response,
        finalPayload.confidence,
        finalPayload.provenance,
        finalPayload.debug
      );
      
      // Update inference statistics
      if (finalPayload.debug?.inferenceTimeMs) {
        addInferenceTime(finalPayload.debug.inferenceTimeMs);
      }

      // Update conversation with AI response
      updateConversation(currentConversationId, aiMessage);
    },
    onExportComplete: () => {
      console.log('[UI] Export de la mémoire terminé.');
    },
    onImportComplete: () => {
      console.log('[UI] Import de la mémoire terminé.');
    },
    onPurgeComplete: () => {
      console.log('[UI] Purge de la mémoire terminée.');
    },
  });

  // Initialize migration worker
  useMigrationWorker();

  // Detect device profile on mount
  useEffect(() => {
    async function initialize() {
      const profile = await detectDeviceProfile();
      setDeviceProfile(profile);
    }
    initialize();
  }, []);

  const handleSendMessage = (content: string, attachments?: ProcessedFile[]) => {
    // Add user message to UI
    const userMessage = addUserMessage(content, attachments);
    
    // Update cognitive flow
    setFlowState({
      currentStep: 'query',
      stepDetails: 'Analyse de votre question en cours...'
    });

    // Update conversation title if it's the first message
    if (messages.length === 0) {
      const title = content.length > 30 ? content.substring(0, 30) + "..." : content;
      updateConversationTitle(currentConversationId, title);
    }

    // Update conversation with user message
    updateConversation(currentConversationId, userMessage);

    // Send query to worker
    sendQuery(
      content, 
      getConversationHistory(), 
      deviceProfile,
      attachments
    );
  };

  const handleNewConversation = () => {
    createNewConversation();
    clearMessages();
    setIsSidebarOpen(false);
  };

  const handleSelectConversationWrapper = (id: string) => {
    handleSelectConversation(id);
    clearMessages(); // Clear messages when switching conversations
    setIsSidebarOpen(false);
  };

  const handleDeleteConversationWrapper = (id: string) => {
    const newActiveId = deleteConversation(id);
    if (newActiveId) {
      clearMessages();
    }
  };

  const handleRegenerate = () => {
    const lastUserMessage = getLastUserMessage();
    if (lastUserMessage) {
      removeAssistantMessages();
      handleSendMessage(lastUserMessage.content, lastUserMessage.attachments);
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    handleSendMessage(suggestion);
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

  const handlePurgeMemory = () => {
    purgeMemory();
    resetStats();
  };

  const handleExportMemory = () => {
    exportMemory();
  };

  const handleExportConversation = () => {
    // Exporter la conversation actuelle en JSON
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

  const handleImportMemory = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        importMemory(data);
      } catch (error) {
        console.error('[UI] Erreur lors de l\'import:', error);
        toast({
          title: "Erreur d'import",
          description: "Le fichier n'est pas valide",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleImportConversation = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Valider la structure du fichier
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

  const handleExportCache = () => {
    try {
      const cacheData = exportCache();
      const dataBlob = new Blob([cacheData], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `orion-cache-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[UI] Erreur lors de l\'export du cache:', error);
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter le cache",
        variant: "destructive",
      });
    }
  };

  const handleImportCache = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        importCache(content);
        toast({
          title: "Import réussi",
          description: "Le cache a été importé avec succès",
        });
      } catch (error) {
        console.error('[UI] Erreur lors de l\'import du cache:', error);
        toast({
          title: "Erreur d'import",
          description: "Le fichier n'est pas valide",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleProfileChange = (profile: 'full' | 'lite' | 'micro') => {
    setDeviceProfile(profile);
  };

  const handleDebateModeChange = (mode: 'fast' | 'balanced' | 'thorough' | 'custom') => {
    setDebateMode(mode);
  };

  const handleCustomAgentsChange = (agents: string[]) => {
    setCustomAgents(agents);
  };

  const handleModelSelect = (modelId: string) => {
    selectModel(modelId);
    workerSetModel(modelId);
  };

  const showWelcome = messages.length === 0;
  
  // Afficher le sélecteur de modèle si aucun modèle n'est sélectionné
  if (!selectedModel) {
    type ModelType = 'demo' | 'standard' | 'advanced';
    return <ModelSelector onSelect={handleModelSelect} defaultModel={DEFAULT_MODEL as ModelType} />;
  }
  
  // Afficher le loader pendant le chargement du modèle
  const modelInfo = getCurrentModelInfo();
  if (isModelLoading && modelInfo) {
    return (
      <ModelLoader 
        modelName={modelInfo.name}
        modelSize={modelInfo.size}
        onProgress={(state) => {
          // Optionnel: mise à jour de l'état si nécessaire
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex relative">
      {/* Browser Compatibility Banner */}
      <BrowserCompatibilityBanner />
      
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversationWrapper}
        onDeleteConversation={handleDeleteConversationWrapper}
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
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-semibold">ORION</h1>
                {deviceProfile && (
                  <span className="device-profile text-xs px-2 py-1 rounded-full bg-accent/30 text-accent-foreground">
                    {deviceProfile}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCognitiveFlow(!showCognitiveFlow)}
                className="rounded-full hover:bg-accent/50 h-8 w-8 sm:h-10 sm:w-10"
                title="Afficher le flux cognitif"
              >
                <Brain className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsControlPanelOpen(true)}
                className="rounded-full hover:bg-accent/50 h-8 w-8 sm:h-10 sm:w-10"
                title="Panneau de contrôle"
              >
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {/* Cognitive Flow Panel - visible when enabled */}
          {showCognitiveFlow && (
            <div className="container mx-auto px-3 sm:px-4 pt-4">
              <CognitiveFlow 
                currentStep={flowState.currentStep}
                stepDetails={flowState.stepDetails}
              />
            </div>
          )}

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
                    onLike={message.role === "assistant" ? () => handleLike(message.id) : undefined}
                    onDislike={message.role === "assistant" ? () => handleDislike(message.id) : undefined}
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
      <SettingsPanel 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        currentModel={selectedModel}
        onModelChange={handleModelSelect}
      />
      
      {/* Control Panel */}
      <ControlPanel 
        isOpen={isControlPanelOpen} 
        onClose={() => setIsControlPanelOpen(false)}
        onPurgeMemory={handlePurgeMemory}
        onExportMemory={handleExportMemory}
        onExportConversation={handleExportConversation}
        onImportMemory={handleImportMemory}
        onImportConversation={handleImportConversation}
        onExportCache={handleExportCache}
        onImportCache={handleImportCache}
        onProfileChange={handleProfileChange}
        currentProfile={deviceProfile || 'micro'}
        onDebateModeChange={handleDebateModeChange}
        currentDebateMode={debateMode}
        onCustomAgentsChange={handleCustomAgentsChange}
        customAgents={customAgents}
        currentModel={selectedModel}
        onModelChange={handleModelSelect}
        cacheStats={getCacheStats()}
        memoryStats={memoryStats}
      />
    </div>
  );
};

export default Index;
