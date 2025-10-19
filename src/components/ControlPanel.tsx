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
  Rocket,
  Check,
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
import { MODELS, formatBytes } from "@/config/models";

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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-full sm:max-w-md z-50 glass border-l border-[hsl(var(--glass-border))] animate-slide-in-right overflow-y-auto">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border sticky top-0 glass z-10">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="text-xl sm:text-2xl font-semibold">Panneau de Contrôle</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full hover:bg-accent/50 h-8 w-8 sm:h-10 sm:w-10"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <Tabs defaultValue="model" className="w-full">
              <TabsList className="grid w-full grid-cols-5 glass rounded-xl p-1">
                <TabsTrigger value="model" className="rounded-lg text-xs sm:text-sm">
                  <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  Modèle
                </TabsTrigger>
                <TabsTrigger value="performance" className="rounded-lg text-xs sm:text-sm">
                  <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  Perf.
                </TabsTrigger>
                <TabsTrigger value="debate" className="rounded-lg text-xs sm:text-sm">
                  <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  Débat
                </TabsTrigger>
                <TabsTrigger value="memory" className="rounded-lg text-xs sm:text-sm">
                  <Database className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  Mém.
                </TabsTrigger>
                <TabsTrigger value="audit" className="rounded-lg text-xs sm:text-sm">
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  Audit
                </TabsTrigger>
              </TabsList>

              {/* Model Tab */}
              <TabsContent value="model" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Sélection du Modèle LLM
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Choisissez le modèle d'IA local qui correspond le mieux à vos besoins.
                  </p>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Modèle actuel</AlertTitle>
                  <AlertDescription className="text-xs">
                    {currentModel ? (
                      <>
                        {Object.values(MODELS).find(m => m.id === currentModel)?.name || 'Standard'} 
                        {' - '}
                        {formatBytes(Object.values(MODELS).find(m => m.id === currentModel)?.size || 0)}
                      </>
                    ) : (
                      'Aucun modèle sélectionné'
                    )}
                  </AlertDescription>
                </Alert>

                <div className="glass rounded-2xl p-4 sm:p-6">
                  <div className="space-y-2">
                    {Object.entries(MODELS).map(([key, model]) => {
                      const isCurrentlyLoaded = currentModel === model.id;
                      
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            if (window.confirm(`Voulez-vous changer de modèle vers "${model.name}" ? L'application va se recharger.`)) {
                              onModelChange?.(model.id);
                              addAuditLog(`Modèle changé vers: ${model.name}`, "success");
                              toast({
                                title: "Modèle changé",
                                description: `Le modèle a été changé vers "${model.name}". Chargement en cours...`,
                              });
                              onClose();
                            }
                          }}
                          disabled={isCurrentlyLoaded}
                          className={cn(
                            "relative glass rounded-xl p-3 border text-left transition-all duration-200 w-full",
                            "hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed",
                            isCurrentlyLoaded 
                              ? "border-primary shadow-md shadow-primary/20 bg-primary/5" 
                              : "border-transparent hover:border-primary/30"
                          )}
                        >
                          {/* Badge recommandé */}
                          {model.recommended && (
                            <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              Recommandé
                            </div>
                          )}

                          {/* Checkmark si actuellement chargé */}
                          {isCurrentlyLoaded && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                              <Check className="h-3 w-3" />
                            </div>
                          )}

                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className={cn(
                              "rounded-lg p-2 mt-0.5",
                              isCurrentlyLoaded ? "bg-primary/20" : "bg-accent/20"
                            )}>
                              {key === 'demo' && <Zap className="h-4 w-4" />}
                              {key === 'standard' && <Brain className="h-4 w-4" />}
                              {key === 'advanced' && <Rocket className="h-4 w-4" />}
                              {!['demo', 'standard', 'advanced'].includes(key) && <Brain className="h-4 w-4" />}
                            </div>

                            {/* Content */}
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold">{model.name}</h4>
                                {isCurrentlyLoaded && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                                    Actif
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {model.description}
                              </p>
                              
                              {/* Specs */}
                              <div className="flex items-center gap-3 text-xs">
                                <span className="text-muted-foreground">
                                  {formatBytes(model.size)}
                                </span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">
                                  {model.quality === 'basic' && '⭐'}
                                  {model.quality === 'high' && '⭐⭐'}
                                  {model.quality === 'very-high' && '⭐⭐⭐'}
                                  {model.quality === 'ultra' && '⭐⭐⭐⭐'}
                                </span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">
                                  {model.speed === 'very-fast' && '⚡⚡⚡'}
                                  {model.speed === 'fast' && '⚡⚡'}
                                  {model.speed === 'moderate' && '⚡'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <Separator className="my-4" />

                  <p className="text-xs text-muted-foreground text-center">
                    🔒 Tous les modèles fonctionnent 100% localement et sont mis en cache. Le changement nécessite le téléchargement du nouveau modèle.
                  </p>
                </div>
              </TabsContent>

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

                <div className="glass rounded-2xl p-4 sm:p-6 space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Profil Actif</Label>
                    <Select value={selectedProfile} onValueChange={handleProfileChange}>
                      <SelectTrigger className="w-full rounded-xl">
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

                {/* Metrics */}
                <div className="glass rounded-2xl p-4 sm:p-6 space-y-4">
                  <h4 className="text-sm font-semibold">Métriques en Temps Réel</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Souvenirs */}
                    <div className="glass-subtle rounded-xl p-3 border border-primary/10">
                      <div className="flex items-center gap-2 mb-1">
                        <Database className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs text-muted-foreground">Souvenirs</span>
                      </div>
                      <div className="text-xl font-bold">{memoryStats?.totalMemories || 0}</div>
                    </div>
                    
                    {/* Temps d'inférence */}
                    <div className="glass-subtle rounded-xl p-3 border border-accent/10">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="h-3.5 w-3.5 text-accent" />
                        <span className="text-xs text-muted-foreground">Latence moy.</span>
                      </div>
                      <div className="text-xl font-bold">{memoryStats?.avgInferenceTime || 0}<span className="text-xs text-muted-foreground ml-1">ms</span></div>
                    </div>
                    
                    {/* Cache size */}
                    <div className="glass-subtle rounded-xl p-3 border border-blue-500/10">
                      <div className="flex items-center gap-2 mb-1">
                        <Database className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-xs text-muted-foreground">Cache</span>
                      </div>
                      <div className="text-xl font-bold text-blue-600">{cacheStats?.size || 0}</div>
                    </div>
                    
                    {/* Cache hit rate */}
                    <div className="glass-subtle rounded-xl p-3 border border-purple-500/10">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-purple-600" />
                        <span className="text-xs text-muted-foreground">Hit Rate</span>
                      </div>
                      <div className="text-xl font-bold text-purple-600">{cacheStats ? (cacheStats.hitRate * 100).toFixed(0) : 0}%</div>
                    </div>
                  </div>
                  
                  {/* Taux de satisfaction */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Taux de satisfaction global</span>
                      <span className="text-sm font-semibold">{feedbackPercentage}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all" 
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

                <div className="glass rounded-2xl p-4 sm:p-6">
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

                <div className="glass rounded-2xl p-4 sm:p-6 space-y-4">
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
                      className="w-full rounded-xl justify-start gap-2"
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
                        className="w-full rounded-xl justify-start gap-2"
                        onClick={() => document.getElementById('import-conversation')?.click()}
                      >
                        <Upload className="h-4 w-4" />
                        Importer une Conversation
                      </Button>
                    </div>

                    <Separator />

                    {/* Export Cache */}
                    <Button 
                      variant="outline" 
                      className="w-full rounded-xl justify-start gap-2"
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
                        className="w-full rounded-xl justify-start gap-2"
                        onClick={() => document.getElementById('import-cache')?.click()}
                      >
                        <Upload className="h-4 w-4" />
                        Importer le Cache
                      </Button>
                    </div>

                    <Separator />

                    {/* Export Memory */}
                    <Button 
                      variant="outline" 
                      className="w-full rounded-xl justify-start gap-2"
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
                        className="w-full rounded-xl justify-start gap-2"
                        onClick={() => document.getElementById('import-memory')?.click()}
                      >
                        <Upload className="h-4 w-4" />
                        Importer la Mémoire
                      </Button>
                    </div>

                    <Separator />

                    {/* Purge Memory - Danger zone */}
                    <Alert variant="destructive" className="bg-destructive/5">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Zone Dangereuse</AlertTitle>
                      <AlertDescription className="text-xs">
                        La purge supprime définitivement toutes les données.
                      </AlertDescription>
                    </Alert>

                    <Button 
                      variant="destructive" 
                      className="w-full rounded-xl justify-start gap-2"
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

                <div className="glass rounded-2xl p-4 sm:p-6">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {auditLog.map((log, index) => (
                      <div 
                        key={index} 
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border",
                          log.status === "success" && "bg-green-500/5 border-green-500/20",
                          log.status === "warning" && "bg-yellow-500/5 border-yellow-500/20",
                          log.status === "error" && "bg-red-500/5 border-red-500/20"
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
