import { useState, useEffect, useRef } from "react";
import { Settings, Menu, X, Brain } from "lucide-react";
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
import { WorkerMessage, QueryPayload, FinalResponsePayload, StatusUpdatePayload } from "@/types";
import { detectDeviceProfile, DeviceProfile } from "@/utils/deviceProfiler";
import { MODELS, DEFAULT_MODEL } from "@/config/models";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  confidence?: number;
  provenance?: {
    fromAgents?: string[];
    memoryHits?: string[];
    toolUsed?: string;
  };
  debug?: {
    totalRounds?: number;
    inferenceTimeMs?: number;
  };
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
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deviceProfile, setDeviceProfile] = useState<DeviceProfile | null>(null);
  const [flowState, setFlowState] = useState<{ currentStep: FlowStep; stepDetails: string }>({
    currentStep: 'idle',
    stepDetails: 'Prêt à recevoir une requête.'
  });
  const [showCognitiveFlow, setShowCognitiveFlow] = useState(false);
  const [memoryStats, setMemoryStats] = useState({
    totalMemories: 0,
    avgInferenceTime: 0,
    feedbackRatio: { likes: 0, dislikes: 0 },
    totalTokensGenerated: 0,
    tokensPerSecond: 0
  });
  const [inferenceHistory, setInferenceHistory] = useState<number[]>([]);
  
  // États pour la gestion des modèles
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState({ progress: 0, text: '', loaded: 0, total: 0 });
  
  // Référence au worker orchestrateur
  const orchestratorWorker = useRef<Worker | null>(null);
  // Référence au migration worker pour la migration d'embeddings
  const migrationWorker = useRef<Worker | null>(null);
  // Référence à l'ID de conversation actuel pour éviter les stale closures
  const currentConversationIdRef = useRef<string | null>(currentConversationId);
  
  // Garder la ref à jour
  useEffect(() => {
    currentConversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

  // Détecter le profil de l'appareil au chargement
  useEffect(() => {
    async function initialize() {
      // Détecter le profil
      const profile = await detectDeviceProfile();
      setDeviceProfile(profile);
      
      // Vérifier si un modèle est déjà en cache
      const cachedModel = localStorage.getItem('orion_selected_model');
      if (cachedModel) {
        setSelectedModel(cachedModel);
      }
    }
    initialize();
  }, []);

  // Initialiser le worker au chargement
  useEffect(() => {
    // Le `type: 'module'` est crucial pour que le worker puisse utiliser la syntaxe import/export
    orchestratorWorker.current = new Worker(
      new URL('../workers/orchestrator.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Définir ce qu'il faut faire quand on reçoit un message DU worker
    orchestratorWorker.current.onmessage = (event: MessageEvent<WorkerMessage<FinalResponsePayload | StatusUpdatePayload>>) => {
      const { type, payload, meta } = event.data;

      // Écouter les mises à jour de statut pour le flux cognitif
      if (type === 'status_update') {
        const statusPayload = payload as StatusUpdatePayload;
        setFlowState({
          currentStep: statusPayload.step,
          stepDetails: statusPayload.details
        });
      }
      // Gérer la progression du chargement du modèle
      else if (type === 'llm_load_progress') {
        setIsModelLoading(true);
        setModelLoadProgress({
          progress: payload.progress || 0,
          text: payload.text || '',
          loaded: payload.loaded || 0,
          total: payload.total || 0,
        });
        
        // Si le chargement est terminé
        if (payload.progress >= 100) {
          setTimeout(() => {
            setIsModelLoading(false);
          }, 1000);
        }
      }
      // Gérer l'export de mémoire
      else if (type === 'export_complete') {
        console.log('[UI] Export de la mémoire terminé.');
      }
      // Gérer l'import de mémoire
      else if (type === 'import_complete') {
        console.log('[UI] Import de la mémoire terminé.');
      }
      // Gérer la purge de mémoire
      else if (type === 'purge_complete') {
        console.log('[UI] Purge de la mémoire terminée.');
      }
      // Nous écoutons aussi les messages de type 'final_response'
      else if (type === 'final_response') {
        console.log(`[UI] Réponse reçue (traceId: ${meta?.traceId})`);
        
        // Mettre à jour le flux vers l'état final
        setFlowState({
          currentStep: 'final_response',
          stepDetails: 'Réponse générée avec succès'
        });
        
        // Après un délai, remettre le flux en idle
        setTimeout(() => {
          setFlowState({
            currentStep: 'idle',
            stepDetails: 'Prêt à recevoir une requête.'
          });
        }, 2000);
        
        const finalPayload = payload as FinalResponsePayload;
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: finalPayload.response,
          timestamp: new Date(),
          confidence: finalPayload.confidence,
          provenance: finalPayload.provenance,
          debug: finalPayload.debug,
        };
        
        setMessages((prev) => [...prev, aiMessage]);
        setIsGenerating(false);
        
        // Mettre à jour les statistiques d'inférence
        if (finalPayload.debug?.inferenceTimeMs) {
          setInferenceHistory(prev => [...prev, finalPayload.debug!.inferenceTimeMs!].slice(-5));
        }

        // Update conversation with AI response
        setConversations(prev => 
          prev.map(conv => 
            conv.id === currentConversationIdRef.current 
              ? { ...conv, lastMessage: aiMessage.content, timestamp: new Date() }
              : conv
          )
        );
      }
    };

    // Log en cas d'erreur du worker
    orchestratorWorker.current.onerror = (error) => {
      console.error('[UI] Erreur du worker:', error);
      setIsGenerating(false);
    };

    console.log('[UI] Orchestrator Worker initialisé');

    // Initialiser le Migration Worker pour la migration d'embeddings
    migrationWorker.current = new Worker(
      new URL('../workers/migration.worker.ts', import.meta.url),
      { type: 'module' }
    );

    migrationWorker.current.onmessage = (event: MessageEvent) => {
      const { type } = event.data;
      if (type === 'init_complete') {
        console.log('[UI] Migration Worker initialisé.');
      } else if (type === 'migration_complete') {
        console.log('[UI] Cycle de migration terminé.');
      }
    };

    migrationWorker.current.onerror = (error) => {
      console.error('[UI] Erreur du Migration Worker:', error);
    };

    console.log('[UI] Migration Worker lancé en arrière-plan.');

    // Nettoyer en terminant les workers quand le composant est détruit
    return () => {
      orchestratorWorker.current?.terminate();
      migrationWorker.current?.terminate();
      console.log('[UI] Workers terminés.');
    };
  }, []); // Le tableau vide `[]` assure que cet effet ne s'exécute qu'une seule fois

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
    // Vérifier que le worker est prêt
    if (!orchestratorWorker.current) {
      console.error('[UI] Worker non initialisé');
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsGenerating(true);
    
    // Mettre à jour le flux cognitif - Requête utilisateur
    setFlowState({
      currentStep: 'query',
      stepDetails: 'Analyse de votre question en cours...'
    });

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

    // Créer un ID de suivi unique pour cette requête
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Convertir l'historique de messages au format attendu par le worker
    const conversationHistory = messages.map(msg => ({
      sender: msg.role === 'user' ? 'user' as const : 'orion' as const,
      text: msg.content,
      id: msg.id
    }));

    // Préparer et envoyer le message AU worker
    const queryPayload: QueryPayload = {
      query: content,
      conversationHistory,
      deviceProfile: deviceProfile || 'micro', // 'micro' par défaut si la détection n'est pas finie
    };
    
    const message: WorkerMessage<QueryPayload> = {
      type: 'query',
      payload: queryPayload,
      meta: {
        traceId,
        timestamp: Date.now(),
      },
    };

    console.log(`[UI] Envoi de la requête avec traceId: ${traceId}`);
    orchestratorWorker.current.postMessage(message);
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

  const handleLike = (messageId: string) => {
    console.log(`[UI] Feedback positif reçu pour le message ${messageId}`);
    
    // Trouver le message et la requête qui le précède
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex > 0) {
      const failedResponse = messages[messageIndex].content;
      const originalQuery = messages[messageIndex - 1].content;

      if (orchestratorWorker.current) {
        const traceId = `trace_feedback_${Date.now()}`;
        const message: WorkerMessage = {
          type: 'feedback',
          payload: { 
            messageId, 
            feedback: 'good', 
            query: originalQuery, 
            response: failedResponse 
          },
          meta: { traceId, timestamp: Date.now() }
        };
        orchestratorWorker.current.postMessage(message);
        
        // Mettre à jour les stats
        setMemoryStats(prev => ({
          ...prev,
          feedbackRatio: {
            ...prev.feedbackRatio,
            likes: prev.feedbackRatio.likes + 1
          }
        }));
      }
    }
  };

  const handleDislike = (messageId: string) => {
    console.log(`[UI] Feedback négatif reçu pour le message ${messageId}`);
    
    // Trouver le message et la requête qui le précède
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex > 0) {
      const failedResponse = messages[messageIndex].content;
      const originalQuery = messages[messageIndex - 1].content;

      if (orchestratorWorker.current) {
        const traceId = `trace_feedback_${Date.now()}`;
        const message: WorkerMessage = {
          type: 'feedback',
          payload: { 
            messageId, 
            feedback: 'bad', 
            query: originalQuery, 
            response: failedResponse 
          },
          meta: { traceId, timestamp: Date.now() }
        };
        orchestratorWorker.current.postMessage(message);
        
        // Mettre à jour les stats
        setMemoryStats(prev => ({
          ...prev,
          feedbackRatio: {
            ...prev.feedbackRatio,
            dislikes: prev.feedbackRatio.dislikes + 1
          }
        }));
      }
    }
  };

  const handlePurgeMemory = () => {
    // Envoyer un message au worker pour purger la mémoire
    if (orchestratorWorker.current) {
      const traceId = `trace_purge_${Date.now()}`;
      orchestratorWorker.current.postMessage({
        type: 'purge_memory',
        payload: {},
        meta: { traceId, timestamp: Date.now() }
      });
      
      // Réinitialiser les stats
      setMemoryStats({
        totalMemories: 0,
        avgInferenceTime: 0,
        feedbackRatio: { likes: 0, dislikes: 0 }
      });
    }
  };

  const handleExportMemory = () => {
    // Envoyer un message au worker pour exporter la mémoire
    if (orchestratorWorker.current) {
      const traceId = `trace_export_${Date.now()}`;
      orchestratorWorker.current.postMessage({
        type: 'export_memory',
        payload: {},
        meta: { traceId, timestamp: Date.now() }
      });
    }
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
        
        if (orchestratorWorker.current) {
          const traceId = `trace_import_${Date.now()}`;
          orchestratorWorker.current.postMessage({
            type: 'import_memory',
            payload: { data },
            meta: { traceId, timestamp: Date.now() }
          });
        }
      } catch (error) {
        console.error('[UI] Erreur lors de l\'import:', error);
      }
    };
    reader.readAsText(file);
  };

  const handleProfileChange = (profile: 'full' | 'lite' | 'micro') => {
    setDeviceProfile(profile);
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('orion_selected_model', modelId);
    
    // Informer le worker LLM du nouveau modèle
    if (orchestratorWorker.current) {
      orchestratorWorker.current.postMessage({
        type: 'set_model',
        payload: { modelId },
        meta: { traceId: `trace_model_${Date.now()}`, timestamp: Date.now() }
      });
    }
  };

  // Obtenir les informations du modèle actuel
  const getCurrentModelInfo = () => {
    if (!selectedModel) return null;
    for (const [key, model] of Object.entries(MODELS)) {
      if (model.id === selectedModel) {
        return { key, ...model };
      }
    }
    return null;
  };

  // Calculer les statistiques
  useEffect(() => {
    const avgTime = inferenceHistory.length > 0 
      ? Math.round(inferenceHistory.reduce((a, b) => a + b, 0) / inferenceHistory.length)
      : 0;
    
    setMemoryStats(prev => ({
      ...prev,
      avgInferenceTime: avgTime
    }));
  }, [inferenceHistory]);

  const showWelcome = messages.length === 0;
  
  // Afficher le sélecteur de modèle si aucun modèle n'est sélectionné
  if (!selectedModel) {
    return <ModelSelector onSelect={handleModelSelect} defaultModel={DEFAULT_MODEL as 'demo' | 'standard' | 'advanced'} />;
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
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
      {/* Control Panel */}
      <ControlPanel 
        isOpen={isControlPanelOpen} 
        onClose={() => setIsControlPanelOpen(false)}
        onPurgeMemory={handlePurgeMemory}
        onExportMemory={handleExportMemory}
        onExportConversation={handleExportConversation}
        onImportMemory={handleImportMemory}
        onProfileChange={handleProfileChange}
        currentProfile={deviceProfile || 'micro'}
        memoryStats={memoryStats}
      />
    </div>
  );
};

export default Index;
