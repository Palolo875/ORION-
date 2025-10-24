import { useState, useEffect } from "react";
import { 
  X, 
  Trash2, 
  Download, 
  Upload, 
  Activity, 
  Database, 
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  FileJson,
  Zap,
  Info,
  MessageSquare,
  Brain,
  Sparkles
} from "lucide-react";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DebateModeSelector, DebateMode } from "./DebateModeSelector";
import { AmbientContextManager } from "./AmbientContextManager";
import { CustomAgentManager } from "./CustomAgentManager";

interface ControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPurgeMemory?: () => void;
  onExportMemory?: () => void;
  onImportMemory?: (file: File) => void;
  onExportConversation?: () => void;
  onImportConversation?: (file: File) => void;
  onExportCache?: () => void;
  onImportCache?: (file: File) => void;
  onProfileChange?: (profile: 'full' | 'lite' | 'micro') => void;
  currentProfile?: 'full' | 'lite' | 'micro';
  onDebateModeChange?: (mode: DebateMode) => void;
  currentDebateMode?: DebateMode;
  onCustomAgentsChange?: (agents: string[]) => void;
  customAgents?: string[];
  currentModel?: string;
  onModelChange?: (modelId: string) => void;
  cacheStats?: {
    size: number;
    totalHits: number;
    hitRate: number;
  };
  memoryStats?: {
    totalMemories: number;
    avgInferenceTime: number;
    feedbackRatio: { likes: number; dislikes: number };
    totalTokensGenerated?: number;
    tokensPerSecond?: number;
  };
}

export const ControlPanel = ({ 
  isOpen, 
  onClose,
  onPurgeMemory,
  onExportMemory,
  onImportMemory,
  onExportConversation,
  onImportConversation,
  onExportCache,
  onImportCache,
  onProfileChange,
  currentProfile = 'micro',
  onDebateModeChange,
  currentDebateMode = 'balanced',
  onCustomAgentsChange,
  customAgents = ['synthesizer'],
  currentModel,
  onModelChange,
  cacheStats,
  memoryStats
}: ControlPanelProps) => {
  const [selectedProfile, setSelectedProfile] = useState(currentProfile);
  const [auditLog, setAuditLog] = useState<Array<{ time: string; action: string; status: string }>>([
    { time: new Date().toLocaleTimeString(), action: "Système initialisé", status: "success" },
  ]);

  useEffect(() => {
    setSelectedProfile(currentProfile);
  }, [currentProfile]);

  const handleProfileChange = (value: 'full' | 'lite' | 'micro') => {
    setSelectedProfile(value);
    onProfileChange?.(value);
    addAuditLog(`Profil changé vers: ${value}`, "success");
    toast({
      title: "Profil mis à jour",
      description: `Le profil de performance a été changé vers "${value}"`,
    });
  };

  const handlePurgeMemory = () => {
    if (window.confirm("Êtes-vous sûr de vouloir purger toute la mémoire ? Cette action est irréversible.")) {
      onPurgeMemory?.();
      addAuditLog("Mémoire purgée", "warning");
      toast({
        title: "Mémoire purgée",
        description: "Toutes les données de mémoire ont été supprimées",
        variant: "destructive",
      });
    }
  };

  const handleExportMemory = () => {
    onExportMemory?.();
    addAuditLog("Mémoire exportée", "success");
    toast({
      title: "Export réussi",
      description: "La mémoire a été exportée avec succès",
    });
  };

  const handleExportConversation = () => {
    onExportConversation?.();
    addAuditLog("Conversation exportée", "success");
    toast({
      title: "Export réussi",
      description: "La conversation a été exportée avec succès",
    });
  };

  const handleExportCache = () => {
    onExportCache?.();
    addAuditLog("Cache exporté", "success");
    toast({
      title: "Export réussi",
      description: "Le cache a été exporté avec succès",
    });
  };

  const handleImportMemory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportMemory?.(file);
      addAuditLog("Mémoire importée", "success");
      toast({
        title: "Import réussi",
        description: `Le fichier "${file.name}" a été importé avec succès`,
      });
    }
  };

  const handleImportConversation = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportConversation?.(file);
      addAuditLog("Conversation importée", "success");
      toast({
        title: "Import réussi",
        description: `La conversation "${file.name}" a été importée avec succès`,
      });
    }
  };

  const handleImportCache = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportCache?.(file);
      addAuditLog("Cache importé", "success");
      toast({
        title: "Import réussi",
        description: `Le cache "${file.name}" a été importé avec succès`,
      });
    }
  };

  const addAuditLog = (action: string, status: string) => {
    const newLog = {
      time: new Date().toLocaleTimeString(),
      action,
      status
    };
    setAuditLog(prev => [newLog, ...prev].slice(0, 20)); // Garder les 20 derniers
  };

  const totalFeedback = (memoryStats?.feedbackRatio.likes || 0) + (memoryStats?.feedbackRatio.dislikes || 0);
  const feedbackPercentage = totalFeedback > 0 
    ? Math.round((memoryStats?.feedbackRatio.likes || 0) / totalFeedback * 100) 
    : 0;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - Effet d'assombrissement doux */}
      <div
        className="fixed inset-0 bg-background/90 backdrop-blur-md z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel - Fenêtre flottante centrale */}
      <div className="fixed inset-4 sm:inset-8 md:inset-16 lg:inset-20 z-50 animate-scale-in">
        <div className="w-full h-full max-w-4xl mx-auto floating-panel glass border border-[hsl(var(--glass-border))] overflow-hidden flex flex-col">
          {/* Header - Design organique */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[hsl(var(--glass-border))] bg-gradient-to-r from-[hsl(var(--pastel-sage))]/10 via-[hsl(var(--pastel-feather))]/5 to-[hsl(var(--pastel-rose))]/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-[1rem] bg-gradient-to-br from-[hsl(var(--pastel-sage))]/20 to-[hsl(var(--pastel-mint))]/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-semibold">Panneau de Contrôle</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-[1.25rem] hover:bg-[hsl(var(--pastel-feather))]/50 h-10 w-10 smooth-interaction"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content - Avec scroll organique */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
            <Tabs defaultValue="performance" className="w-full">
              <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-2 glass rounded-[1.5rem] p-2 bg-gradient-to-br from-[hsl(var(--pastel-feather))]/50 to-transparent">
                <TabsTrigger value="performance" className="rounded-[1.25rem] text-xs sm:text-sm smooth-interaction data-[state=active]:bg-gradient-to-br data-[state=active]:from-[hsl(var(--pastel-sage))]/30 data-[state=active]:to-[hsl(var(--pastel-mint))]/20 data-[state=active]:shadow-sm">
                  <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline">Perf.</span>
                </TabsTrigger>
                <TabsTrigger value="context" className="rounded-[1.25rem] text-xs sm:text-sm smooth-interaction data-[state=active]:bg-gradient-to-br data-[state=active]:from-[hsl(var(--pastel-sage))]/30 data-[state=active]:to-[hsl(var(--pastel-mint))]/20 data-[state=active]:shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline">Ctx.</span>
                </TabsTrigger>
                <TabsTrigger value="agents" className="rounded-[1.25rem] text-xs sm:text-sm smooth-interaction data-[state=active]:bg-gradient-to-br data-[state=active]:from-[hsl(var(--pastel-sage))]/30 data-[state=active]:to-[hsl(var(--pastel-mint))]/20 data-[state=active]:shadow-sm">
                  <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline">Agents</span>
                </TabsTrigger>
                <TabsTrigger value="debate" className="rounded-[1.25rem] text-xs sm:text-sm smooth-interaction data-[state=active]:bg-gradient-to-br data-[state=active]:from-[hsl(var(--pastel-sage))]/30 data-[state=active]:to-[hsl(var(--pastel-mint))]/20 data-[state=active]:shadow-sm">
                  <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline">Débat</span>
                </TabsTrigger>
                <TabsTrigger value="memory" className="rounded-[1.25rem] text-xs sm:text-sm smooth-interaction data-[state=active]:bg-gradient-to-br data-[state=active]:from-[hsl(var(--pastel-sage))]/30 data-[state=active]:to-[hsl(var(--pastel-mint))]/20 data-[state=active]:shadow-sm">
                  <Database className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline">Mém.</span>
                </TabsTrigger>
                <TabsTrigger value="audit" className="rounded-[1.25rem] text-xs sm:text-sm smooth-interaction data-[state=active]:bg-gradient-to-br data-[state=active]:from-[hsl(var(--pastel-sage))]/30 data-[state=active]:to-[hsl(var(--pastel-mint))]/20 data-[state=active]:shadow-sm">
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline">Audit</span>
                </TabsTrigger>
              </TabsList>

              {/* Performance Tab */}
              <TabsContent value="performance" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Profil de Performance
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Choisissez le profil adapté à vos besoins et votre appareil.
                  </p>
                </div>

                <div className="glass rounded-[1.5rem] p-4 sm:p-6 space-y-4 border border-[hsl(var(--glass-border))]">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Profil Actif</Label>
                    <Select value={selectedProfile} onValueChange={handleProfileChange}>
                      <SelectTrigger className="w-full rounded-[1.25rem] smooth-interaction">
                        <SelectValue placeholder="Sélectionner un profil" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Full</span>
                            <span className="text-xs text-muted-foreground">- Toutes les fonctionnalités</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="lite">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Lite</span>
                            <span className="text-xs text-muted-foreground">- Optimisé</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="micro">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Micro</span>
                            <span className="text-xs text-muted-foreground">- Minimal</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Profil actuel: {selectedProfile.toUpperCase()}</AlertTitle>
                    <AlertDescription className="text-xs">
                      {selectedProfile === 'full' && "Utilise toutes les capacités de l'IA, incluant le LLM complet et tous les outils."}
                      {selectedProfile === 'lite' && "Mode optimisé avec LLM simplifié pour un bon équilibre performance/réactivité."}
                      {selectedProfile === 'micro' && "Mode minimal utilisant uniquement les outils locaux pour une réactivité maximale."}
                    </AlertDescription>
                  </Alert>
                </div>

                {/* Model Selection */}
                {currentModel && onModelChange && (
                  <div className="glass rounded-[1.5rem] p-4 sm:p-6 space-y-3 border border-[hsl(var(--glass-border))]">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold">Modèle d'IA Local</h4>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full rounded-[1.25rem] justify-between smooth-interaction"
                      onClick={() => {
                        // Open settings panel to change model
                        toast({
                          title: "Sélection de modèle",
                          description: "Accédez aux Paramètres > IA pour changer de modèle",
                        });
                      }}
                    >
                      <span className="text-sm">Modèle actuel</span>
                      <span className="text-xs text-muted-foreground">Voir dans Paramètres</span>
                    </Button>
                  </div>
                )}

                {/* Metrics */}
                <div className="glass rounded-[1.5rem] p-4 sm:p-6 space-y-4 border border-[hsl(var(--glass-border))]">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Métriques en Temps Réel
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Souvenirs */}
                    <div className="glass rounded-[1.25rem] p-3 border border-[hsl(var(--pastel-sage))]/20 bg-gradient-to-br from-[hsl(var(--pastel-sage))]/10 to-[hsl(var(--pastel-mint))]/5 smooth-interaction hover:shadow-md">
                      <div className="flex items-center gap-2 mb-1">
                        <Database className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs text-muted-foreground font-medium">Souvenirs</span>
                      </div>
                      <div className="text-xl font-bold text-primary">{memoryStats?.totalMemories || 0}</div>
                    </div>
                    
                    {/* Temps d'inférence */}
                    <div className="glass rounded-[1.25rem] p-3 border border-[hsl(var(--pastel-rose))]/20 bg-gradient-to-br from-[hsl(var(--pastel-rose))]/10 to-[hsl(var(--pastel-peach))]/5 smooth-interaction hover:shadow-md">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="h-3.5 w-3.5 text-[hsl(var(--pastel-rose))]" />
                        <span className="text-xs text-muted-foreground font-medium">Latence moy.</span>
                      </div>
                      <div className="text-xl font-bold">{memoryStats?.avgInferenceTime || 0}<span className="text-xs text-muted-foreground ml-1">ms</span></div>
                    </div>
                    
                    {/* Cache size */}
                    <div className="glass rounded-[1.25rem] p-3 border border-[hsl(var(--pastel-sky))]/20 bg-gradient-to-br from-[hsl(var(--pastel-sky))]/10 to-[hsl(var(--pastel-feather))]/5 smooth-interaction hover:shadow-md">
                      <div className="flex items-center gap-2 mb-1">
                        <Database className="h-3.5 w-3.5 text-[hsl(var(--pastel-sky))]" />
                        <span className="text-xs text-muted-foreground font-medium">Cache</span>
                      </div>
                      <div className="text-xl font-bold text-[hsl(var(--pastel-sky))]">{cacheStats?.size || 0}</div>
                    </div>
                    
                    {/* Cache hit rate */}
                    <div className="glass rounded-[1.25rem] p-3 border border-[hsl(var(--pastel-lavender))]/20 bg-gradient-to-br from-[hsl(var(--pastel-lavender))]/10 to-[hsl(var(--pastel-violet))]/5 smooth-interaction hover:shadow-md">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--pastel-lavender))]" />
                        <span className="text-xs text-muted-foreground font-medium">Hit Rate</span>
                      </div>
                      <div className="text-xl font-bold text-[hsl(var(--pastel-lavender))]">{cacheStats ? (cacheStats.hitRate * 100).toFixed(0) : 0}%</div>
                    </div>
                  </div>
                  
                  {/* Taux de satisfaction */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground font-medium">Taux de satisfaction global</span>
                      <span className="text-sm font-bold text-primary">{feedbackPercentage}%</span>
                    </div>
                    <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[hsl(var(--pastel-sage))] to-[hsl(var(--pastel-mint))] transition-all duration-500 smooth-interaction rounded-full" 
                        style={{ width: `${feedbackPercentage}%` }} 
                      />
                    </div>
                  </div>
                  
                  {/* Tokens générés (si disponible) */}
                  {memoryStats?.totalTokensGenerated && (
                    <Separator />
                  )}
                  {memoryStats?.totalTokensGenerated && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-muted-foreground">Tokens générés</span>
                      <span className="text-sm sm:text-base font-semibold font-mono">{memoryStats.totalTokensGenerated.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Context Tab */}
              <TabsContent value="context" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
                <AmbientContextManager />
              </TabsContent>

              {/* Agents Tab */}
              <TabsContent value="agents" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
                <CustomAgentManager />
              </TabsContent>

              {/* Debate Tab */}
              <TabsContent value="debate" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Configuration du Débat
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Choisissez le mode de débat et les agents à mobiliser.
                  </p>
                </div>

                <div className="glass rounded-[1.5rem] p-4 sm:p-6 border border-[hsl(var(--glass-border))]">
                  <DebateModeSelector
                    currentMode={currentDebateMode}
                    onModeChange={(mode) => {
                      onDebateModeChange?.(mode);
                      addAuditLog(`Mode débat changé vers: ${mode}`, "success");
                      toast({
                        title: "Mode débat mis à jour",
                        description: `Le mode a été changé vers "${mode}"`,
                      });
                    }}
                    customAgents={customAgents}
                    onCustomAgentsChange={onCustomAgentsChange}
                  />
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Conseil</AlertTitle>
                  <AlertDescription className="text-xs">
                    Le mode <strong>Équilibré</strong> offre le meilleur compromis entre qualité et rapidité pour la plupart des questions.
                    Utilisez le mode <strong>Approfondi</strong> pour des analyses complexes nécessitant plusieurs perspectives.
                  </AlertDescription>
                </Alert>
              </TabsContent>

              {/* Memory Tab */}
              <TabsContent value="memory" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Gestion de la Mémoire
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Gérez les données stockées localement par ORION.
                  </p>
                </div>

                <div className="glass rounded-[1.5rem] p-4 sm:p-6 space-y-4 border border-[hsl(var(--glass-border))]">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Statistiques</h4>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between p-2 rounded-lg bg-muted/30">
                        <span>Souvenirs stockés</span>
                        <span className="font-mono font-semibold">{memoryStats?.totalMemories || 0}</span>
                      </div>
                      <div className="flex justify-between p-2 rounded-lg bg-muted/30">
                        <span>Feedbacks positifs</span>
                        <span className="font-mono font-semibold text-green-600">{memoryStats?.feedbackRatio.likes || 0}</span>
                      </div>
                      <div className="flex justify-between p-2 rounded-lg bg-muted/30">
                        <span>Feedbacks négatifs</span>
                        <span className="font-mono font-semibold text-red-600">{memoryStats?.feedbackRatio.dislikes || 0}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Actions</h4>
                    
                    {/* Export Conversation */}
                    <Button 
                      variant="outline" 
                      className="w-full rounded-[1.25rem] justify-start gap-2 smooth-interaction"
                      onClick={handleExportConversation}
                    >
                      <FileJson className="h-4 w-4" />
                      Exporter la Conversation
                    </Button>

                    {/* Import Conversation */}
                    <div>
                      <input
                        type="file"
                        id="import-conversation"
                        accept=".json"
                        className="hidden"
                        onChange={handleImportConversation}
                      />
                      <Button 
                        variant="outline" 
                        className="w-full rounded-[1.25rem] justify-start gap-2 smooth-interaction"
                        onClick={() => document.getElementById('import-conversation')?.click()}
                      >
                        <Upload className="h-4 w-4" />
                        Importer une Conversation
                      </Button>
                    </div>

                    <Separator className="my-4" />

                    {/* Export Cache */}
                    <Button 
                      variant="outline" 
                      className="w-full rounded-[1.25rem] justify-start gap-2 smooth-interaction"
                      onClick={handleExportCache}
                    >
                      <Download className="h-4 w-4" />
                      Exporter le Cache
                    </Button>

                    {/* Import Cache */}
                    <div>
                      <input
                        type="file"
                        id="import-cache"
                        accept=".json"
                        className="hidden"
                        onChange={handleImportCache}
                      />
                      <Button 
                        variant="outline" 
                        className="w-full rounded-[1.25rem] justify-start gap-2 smooth-interaction"
                        onClick={() => document.getElementById('import-cache')?.click()}
                      >
                        <Upload className="h-4 w-4" />
                        Importer le Cache
                      </Button>
                    </div>

                    <Separator className="my-4" />

                    {/* Export Memory */}
                    <Button 
                      variant="outline" 
                      className="w-full rounded-[1.25rem] justify-start gap-2 smooth-interaction"
                      onClick={handleExportMemory}
                    >
                      <Download className="h-4 w-4" />
                      Exporter la Mémoire
                    </Button>

                    {/* Import Memory */}
                    <div>
                      <input
                        type="file"
                        id="import-memory"
                        accept=".json"
                        className="hidden"
                        onChange={handleImportMemory}
                      />
                      <Button 
                        variant="outline" 
                        className="w-full rounded-[1.25rem] justify-start gap-2 smooth-interaction"
                        onClick={() => document.getElementById('import-memory')?.click()}
                      >
                        <Upload className="h-4 w-4" />
                        Importer la Mémoire
                      </Button>
                    </div>

                    <Separator className="my-4" />

                    {/* Purge Memory - Danger zone */}
                    <Alert variant="destructive" className="bg-destructive/5 rounded-[1.25rem] border-destructive/20">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="font-semibold">Zone Dangereuse</AlertTitle>
                      <AlertDescription className="text-xs">
                        La purge supprime définitivement toutes les données.
                      </AlertDescription>
                    </Alert>

                    <Button 
                      variant="destructive" 
                      className="w-full rounded-[1.25rem] justify-start gap-2 smooth-interaction"
                      onClick={handlePurgeMemory}
                    >
                      <Trash2 className="h-4 w-4" />
                      Purger la Mémoire
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Audit Tab */}
              <TabsContent value="audit" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Journal d'Audit
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Historique des actions importantes du système.
                  </p>
                </div>

                <div className="glass rounded-[1.5rem] p-4 sm:p-6 border border-[hsl(var(--glass-border))]">
                  <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
                    {auditLog.map((log, index) => (
                      <div 
                        key={index} 
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-[1rem] border smooth-interaction",
                          log.status === "success" && "bg-[hsl(var(--pastel-sage))]/10 border-[hsl(var(--pastel-sage))]/20",
                          log.status === "warning" && "bg-[hsl(var(--pastel-peach))]/10 border-[hsl(var(--pastel-peach))]/20",
                          log.status === "error" && "bg-destructive/5 border-destructive/20"
                        )}
                      >
                        <div className="mt-0.5">
                          {log.status === "success" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                          {log.status === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                          {log.status === "error" && <X className="h-4 w-4 text-red-600" />}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-xs sm:text-sm font-medium">{log.action}</p>
                          <p className="text-xs text-muted-foreground">{log.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
};
