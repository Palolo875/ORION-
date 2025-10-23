import { useState, useEffect } from "react";
import { ChatInput } from "@/components/ChatInput";
import { SuggestionChips } from "@/components/SuggestionChips";
import { SettingsPanel } from "@/components/SettingsPanel";
import { Sidebar } from "@/components/Sidebar";
import { CognitiveFlow } from "@/components/CognitiveFlow";
import { FlowStep } from "@/utils/cognitiveFlowConstants";
import { ControlPanel } from "@/components/ControlPanel";
import { ModelSelector } from "@/components/ModelSelector";
import { ModelLoader } from "@/components/ModelLoader";
import { Header } from "@/components/Header";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ChatMessages } from "@/components/ChatMessages";
import { FinalResponsePayload } from "@/types";
import { detectDeviceProfile, DeviceProfile } from "@/utils/performance";
import { DEFAULT_MODEL } from "@/config/models";
import { BrowserCompatibilityBanner } from "@/components/BrowserCompatibilityBanner";
import { ProcessedFile } from "@/utils/fileProcessor";
import { 
  useConversations, 
  useModelManagement, 
  useOrchestratorWorker, 
  useMigrationWorker,
  useChatMessages,
  useMemoryStats
} from "@/features/chat/hooks";
import { useSemanticCache } from "@/hooks/useSemanticCache";
import { useConversationHandlers } from "@/hooks/useConversationHandlers";
import { useMemoryHandlers } from "@/hooks/useMemoryHandlers";

const Index = () => {
  // UI state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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
        finalPayload.debug,
        finalPayload.reasoningSteps
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

  // Initialize conversation handlers
  const conversationHandlers = useConversationHandlers({
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
  });

  const handleSendMessage = (content: string, attachments?: ProcessedFile[]) => {
    conversationHandlers.handleSendMessage(
      content,
      currentConversationId,
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
    const lastUserMessage = conversationHandlers.handleRegenerate();
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage.content, lastUserMessage.attachments);
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  // Initialize memory handlers
  const memoryHandlers = useMemoryHandlers({
    purgeMemory,
    exportMemory,
    importMemory,
    exportCache,
    importCache,
    resetStats,
  });

  const handleExportConversation = () => {
    conversationHandlers.handleExportConversation(conversations, currentConversationId);
  };

  const handleImportConversation = (file: File) => {
    conversationHandlers.handleImportConversation(file);
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
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header
          onMenuClick={() => setIsSidebarOpen(true)}
          onCognitiveFlowToggle={() => setShowCognitiveFlow(!showCognitiveFlow)}
          onSettingsClick={() => setIsControlPanelOpen(true)}
          showCognitiveFlow={showCognitiveFlow}
          selectedModel={selectedModel}
          onModelChange={handleModelSelect}
          modelInfo={modelInfo}
          deviceProfile={deviceProfile}
        />

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
            <WelcomeScreen onSuggestionSelect={handleSuggestionSelect} />
          ) : (
            <ChatMessages
              messages={messages}
              isGenerating={isGenerating}
              onRegenerate={handleRegenerate}
              onLike={conversationHandlers.handleLike}
              onDislike={conversationHandlers.handleDislike}
            />
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
        onPurgeMemory={memoryHandlers.handlePurgeMemory}
        onExportMemory={memoryHandlers.handleExportMemory}
        onExportConversation={handleExportConversation}
        onImportMemory={memoryHandlers.handleImportMemory}
        onImportConversation={handleImportConversation}
        onExportCache={memoryHandlers.handleExportCache}
        onImportCache={memoryHandlers.handleImportCache}
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
