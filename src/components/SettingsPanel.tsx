import { X, User, Settings, BarChart3, Moon, Sun, Globe, Bell, Keyboard, Download, Info, Zap, Brain, Shield, Palette, Check, Sparkles, Rocket, ChevronRight, Database, Trash2, RefreshCw, Eye, Image as ImageIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { useState, useEffect } from "react";
import { MODELS, formatBytes, ModelConfig, detectDeviceCapabilities, DeviceCapabilities } from "@/config/models";
import { cn } from "@/lib/utils";
import { useStorageMonitor } from "@/hooks/useStorageMonitor";
import { StorageIndicator } from "./StorageAlert";
import { isEncryptionSupported, secureStorage } from "@/utils/security";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel?: string;
  onModelChange?: (modelId: string) => void;
}

type SettingsSection = 'ai' | 'appearance' | 'account' | 'advanced';

const navigationItems: Array<{
  id: SettingsSection;
  label: string;
  icon: React.ElementType;
}> = [
  { id: 'ai', label: 'IA', icon: Brain },
  { id: 'appearance', label: 'Apparence', icon: Palette },
  { id: 'account', label: 'Compte', icon: User },
  { id: 'advanced', label: 'Avancé', icon: Settings },
];

export const SettingsPanel = ({ isOpen, onClose, currentModel, onModelChange }: SettingsPanelProps) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('ai');
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [selectedModelKey, setSelectedModelKey] = useState<string>("standard");
  const [deviceCapabilities, setDeviceCapabilities] = useState<DeviceCapabilities | null>(null);
  const [temperature, setTemperature] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState([2000]);
  const [language, setLanguage] = useState("fr");
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isClearing, setIsClearing] = useState(false);
  const [encryptionSupported, setEncryptionSupported] = useState<boolean>(false);
  const [encryptionActive, setEncryptionActive] = useState<boolean>(false);
  const [isEnablingEncryption, setIsEnablingEncryption] = useState<boolean>(false);

  // Hook de monitoring du stockage
  const {
    storageInfo,
    storageWarning,
    clearCaches,
    getRecommendations,
    checkStorage,
    formatBytes: formatStorageBytes,
  } = useStorageMonitor();

  // Detect device capabilities on mount
  useEffect(() => {
    async function loadCapabilities() {
      const caps = await detectDeviceCapabilities();
      setDeviceCapabilities(caps);
    }
    loadCapabilities();
  }, []);

  // Detect encryption capability and status on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setEncryptionSupported(isEncryptionSupported());
      const stored = localStorage.getItem('orion_encryption_enabled');
      setEncryptionActive(stored === 'true');
    } catch {
      setEncryptionSupported(false);
    }
  }, []);

  // Load storage recommendations
  useEffect(() => {
    async function loadRecommendations() {
      const recs = await getRecommendations();
      setRecommendations(recs);
    }
    loadRecommendations();
  }, [getRecommendations]);

  // Handle cache clearing
  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      const freedSpace = await clearCaches();
      console.log(`Cache vidé : ${formatStorageBytes(freedSpace)} libérés`);
      // Refresh recommendations
      const recs = await getRecommendations();
      setRecommendations(recs);
    } catch (error) {
      console.error('Erreur lors du nettoyage du cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleEnableEncryption = async () => {
    if (!encryptionSupported || encryptionActive) return;
    setIsEnablingEncryption(true);
    try {
      await secureStorage.initialize();
      if (typeof window !== 'undefined') {
        localStorage.setItem('orion_encryption_enabled', 'true');
      }
      setEncryptionActive(true);
    } catch (error) {
      console.error('Erreur lors de l\'activation du chiffrement:', error);
    } finally {
      setIsEnablingEncryption(false);
    }
  };

  // Sync with current model
  useEffect(() => {
    if (currentModel) {
      const modelEntry = Object.entries(MODELS).find(([_, m]) => m.id === currentModel);
      if (modelEntry) {
        setSelectedModelKey(modelEntry[0]);
      }
    }
  }, [currentModel]);

  const toggleTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop avec effet de flou */}
      <div
        className="fixed inset-0 bg-background/60 backdrop-blur-md z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panneau modal centré - Style moderne avec navigation verticale */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pointer-events-none">
        <div className="w-full max-w-5xl max-h-[90vh] sm:max-h-[85vh] glass rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-[hsl(var(--glass-border))] pointer-events-auto animate-scale-in overflow-hidden flex flex-col sm:flex-row">
          {/* Navigation verticale à gauche - cachée sur mobile, remplacée par des tabs en haut */}
          <div className="hidden sm:flex sm:w-64 bg-gradient-to-b from-[hsl(var(--pastel-feather))]/30 to-[hsl(var(--pastel-linen))]/20 border-r border-border/50 p-6 flex-col">
            {/* Header avec icône de fermeture */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[hsl(var(--pastel-violet))]/40 to-[hsl(var(--pastel-rose))]/40">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Paramètres</h2>
              </div>
            </div>

            {/* Navigation items */}
            <nav className="flex-1 space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200",
                      "hover:scale-[1.02] active:scale-[0.98]",
                      isActive
                        ? "bg-gradient-to-r from-primary/15 to-accent/15 text-primary shadow-md border border-primary/20"
                        : "hover:bg-[hsl(var(--pastel-feather))]/40 text-muted-foreground"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                    <span className="font-medium">{item.label}</span>
                    {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                  </button>
                );
              })}
            </nav>

            {/* Footer avec bouton fermer */}
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full mt-4 rounded-2xl hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-4 w-4 mr-2" />
              Fermer
            </Button>
          </div>

          {/* Navigation mobile en haut */}
          <div className="sm:hidden border-b border-border/50 bg-gradient-to-r from-[hsl(var(--pastel-feather))]/30 to-[hsl(var(--pastel-linen))]/20">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-2xl bg-gradient-to-br from-[hsl(var(--pastel-violet))]/40 to-[hsl(var(--pastel-rose))]/40">
                  <Settings className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Paramètres</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-2xl hover:bg-destructive/10 hover:text-destructive h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex overflow-x-auto px-4 pb-3 gap-2 scrollbar-thin">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 whitespace-nowrap",
                      isActive
                        ? "bg-gradient-to-r from-primary/15 to-accent/15 text-primary border border-primary/20"
                        : "bg-[hsl(var(--pastel-feather))]/40 text-muted-foreground"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contenu à droite */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Contenu scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 scrollbar-thin">
              {/* IA Section */}
              {activeSection === 'ai' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-[hsl(var(--pastel-sky))]/30">
                        <Brain className="h-6 w-6 text-blue-600" />
                      </div>
                      Configuration de l'IA
                    </h3>
                    <p className="text-sm text-muted-foreground pl-14">
                      Personnalisez le comportement et les performances de l'assistant IA.
                    </p>
                  </div>

                  <Separator className="my-6" />

                  {/* Model Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Modèle d'IA Local</Label>
                      {deviceCapabilities && (
                        <Badge variant="outline" className="text-xs rounded-full bg-[hsl(var(--pastel-mint))]/30 border-green-500/30">
                          RAM: {deviceCapabilities.ram}GB
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      {Object.entries(MODELS).map(([key, model]) => {
                        const isSelected = selectedModelKey === key;
                        const isCompatible = !deviceCapabilities || deviceCapabilities.compatibleModels.includes(key);
                        const isRecommended = deviceCapabilities?.recommendedModel === key;
                        const isVisionModel = model.capabilities?.includes('vision') || model.capabilities?.includes('multimodal');
                        
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              if (isCompatible) {
                                setSelectedModelKey(key);
                                onModelChange?.(model.id);
                              }
                            }}
                            disabled={!isCompatible}
                            className={cn(
                              "w-full rounded-3xl p-5 text-left transition-all relative overflow-hidden",
                              "hover:scale-[1.01] active:scale-[0.99]",
                              "bg-gradient-to-br",
                              isSelected 
                                ? "from-[hsl(var(--pastel-violet))]/20 to-[hsl(var(--pastel-rose))]/20 border-2 border-primary shadow-lg shadow-primary/10" 
                                : "from-[hsl(var(--pastel-feather))]/30 to-[hsl(var(--pastel-linen))]/20 border border-border/30 hover:border-primary/30",
                              !isCompatible && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {isVisionModel && (
                              <div className="absolute top-3 right-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                <Eye className="h-3 w-3" />
                                Vision
                              </div>
                            )}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <h4 className="text-base font-semibold">{model.name}</h4>
                                  {model.recommended && (
                                    <Badge className="text-xs px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-400 border-0 rounded-full">
                                      <Sparkles className="h-3 w-3" />
                                    </Badge>
                                  )}
                                  {isRecommended && (
                                    <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-green-500/20 text-green-700 dark:text-green-300 rounded-full">
                                      Optimal
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                  {model.description}
                                </p>
                                <div className="flex flex-wrap gap-2 text-xs">
                                  <span className="px-3 py-1.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded-full font-medium border border-blue-500/20">
                                    {formatBytes(model.size)}
                                  </span>
                                  <span className="px-3 py-1.5 bg-green-500/10 text-green-700 dark:text-green-300 rounded-full font-medium border border-green-500/20">
                                    {model.maxTokens.toLocaleString()} tokens
                                  </span>
                                  <span className="px-3 py-1.5 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 rounded-full font-medium border border-yellow-500/20">
                                    {model.quality === 'basic' && '⭐'}
                                    {model.quality === 'high' && '⭐⭐'}
                                    {model.quality === 'very-high' && '⭐⭐⭐'}
                                    {model.quality === 'ultra' && '⭐⭐⭐⭐'}
                                  </span>
                                  <span className="px-3 py-1.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 rounded-full font-medium border border-purple-500/20">
                                    {model.speed === 'very-fast' && '⚡⚡⚡'}
                                    {model.speed === 'fast' && '⚡⚡'}
                                    {model.speed === 'moderate' && '⚡'}
                                    {model.speed === 'slow' && '🐌'}
                                  </span>
                                </div>
                                {!isCompatible && (
                                  <p className="text-xs text-destructive mt-2">
                                    ⚠️ RAM insuffisante (min. {model.minRAM}GB)
                                  </p>
                                )}
                              </div>
                              {isSelected && (
                                <div className="p-2 rounded-full bg-primary/20">
                                  <Check className="h-5 w-5 text-primary" />
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Temperature */}
                  <div className="space-y-3 p-5 rounded-3xl bg-gradient-to-br from-[hsl(var(--pastel-peach))]/20 to-[hsl(var(--pastel-rose))]/10">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Température</Label>
                      <span className="text-sm text-muted-foreground font-mono px-3 py-1 bg-background/50 rounded-full">
                        {temperature[0].toFixed(1)}
                      </span>
                    </div>
                    <Slider
                      value={temperature}
                      onValueChange={setTemperature}
                      min={0}
                      max={2}
                      step={0.1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Plus élevé = plus créatif, plus bas = plus précis
                    </p>
                  </div>

                  {/* Max Tokens */}
                  <div className="space-y-3 p-5 rounded-3xl bg-gradient-to-br from-[hsl(var(--pastel-lavender))]/20 to-[hsl(var(--pastel-violet))]/10">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Longueur maximale</Label>
                      <span className="text-sm text-muted-foreground font-mono px-3 py-1 bg-background/50 rounded-full">
                        {maxTokens[0]} tokens
                      </span>
                    </div>
                    <Slider
                      value={maxTokens}
                      onValueChange={setMaxTokens}
                      min={500}
                      max={4000}
                      step={100}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Limite la longueur des réponses générées
                    </p>
                  </div>
                </div>
              )}

              {/* Appearance Section */}
              {activeSection === 'appearance' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-[hsl(var(--pastel-violet))]/30">
                        <Palette className="h-6 w-6 text-purple-600" />
                      </div>
                      Apparence et Interface
                    </h3>
                    <p className="text-sm text-muted-foreground pl-14">
                      Personnalisez l'apparence de l'interface selon vos préférences.
                    </p>
                  </div>

                  <Separator className="my-6" />

                  {/* Theme */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Thème</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant={theme === "light" ? "default" : "outline"}
                        onClick={() => toggleTheme("light")}
                        className="h-32 flex-col gap-3 rounded-3xl bg-gradient-to-br from-[hsl(var(--pastel-feather))]/40 to-white hover:scale-105 transition-all"
                      >
                        <Sun className="h-8 w-8" />
                        <span className="text-base font-medium">Clair</span>
                      </Button>
                      <Button
                        variant={theme === "dark" ? "default" : "outline"}
                        onClick={() => toggleTheme("dark")}
                        className="h-32 flex-col gap-3 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 hover:scale-105 transition-all"
                      >
                        <Moon className="h-8 w-8" />
                        <span className="text-base font-medium">Sombre</span>
                      </Button>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Language */}
                  <div className="space-y-3 p-5 rounded-3xl bg-gradient-to-br from-[hsl(var(--pastel-sky))]/20 to-[hsl(var(--pastel-feather))]/20">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Langue
                    </Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="w-full rounded-2xl">
                        <SelectValue placeholder="Sélectionner une langue" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="it">Italiano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sound Effects */}
                  <div className="flex items-center justify-between p-5 rounded-3xl bg-gradient-to-br from-[hsl(var(--pastel-mint))]/20 to-[hsl(var(--pastel-sky))]/10">
                    <div className="space-y-1">
                      <Label className="text-base font-semibold">Effets sonores</Label>
                      <p className="text-sm text-muted-foreground">
                        Sons pour les notifications et interactions
                      </p>
                    </div>
                    <Switch checked={soundEffects} onCheckedChange={setSoundEffects} />
                  </div>
                </div>
              )}

              {/* Account Section */}
              {activeSection === 'account' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-[hsl(var(--pastel-rose))]/30">
                        <User className="h-6 w-6 text-pink-600" />
                      </div>
                      Informations du compte
                    </h3>
                    <p className="text-sm text-muted-foreground pl-14">
                      Gérez vos informations personnelles et votre abonnement.
                    </p>
                  </div>

                  <Separator className="my-6" />

                  <div className="rounded-3xl bg-gradient-to-br from-[hsl(var(--pastel-linen))]/30 to-[hsl(var(--pastel-feather))]/20 p-6 space-y-5">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="text-base font-semibold">utilisateur@example.com</p>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Abonnement</p>
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold">Plan Premium</p>
                        <Badge className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-primary/20 to-accent/20 text-primary rounded-full border-primary/20">
                          Pro
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    {/* Usage Stats */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-muted-foreground" />
                        <p className="text-sm font-medium text-muted-foreground">Utilisation ce mois</p>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Messages</span>
                          <span className="text-muted-foreground">847 / 5000</span>
                        </div>
                        <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all" style={{ width: "17%" }} />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Tokens utilisés</span>
                          <span className="text-muted-foreground">124K / 1M</span>
                        </div>
                        <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all" style={{ width: "12%" }} />
                        </div>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full rounded-2xl hover:scale-105 transition-all">
                      Mettre à niveau
                    </Button>
                  </div>
                </div>
              )}

              {/* Advanced Section */}
              {activeSection === 'advanced' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-[hsl(var(--pastel-peach))]/30">
                        <Settings className="h-6 w-6 text-orange-600" />
                      </div>
                      Paramètres avancés
                    </h3>
                    <p className="text-sm text-muted-foreground pl-14">
                      Options avancées et fonctionnalités expérimentales.
                    </p>
                  </div>

                  <Separator className="my-6" />

                  {/* Security & Encryption */}
                  <div className="rounded-3xl bg-gradient-to-br from-[hsl(var(--pastel-mint))]/20 to-[hsl(var(--pastel-sky))]/10 p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-green-600" />
                      <Label className="text-base font-semibold">Sécurité et chiffrement</Label>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <div className="flex justify-between p-3 bg-background/30 rounded-xl">
                        <span>Support du chiffrement</span>
                        <span className={cn("font-medium", encryptionSupported ? "text-green-600 dark:text-green-400" : "text-destructive")}>{encryptionSupported ? 'Oui' : 'Non'}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-background/30 rounded-xl">
                        <span>Statut</span>
                        <span className="font-medium">{encryptionActive ? 'Activé' : 'Désactivé (par défaut)'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground pt-2">
                        Le chiffrement n'est pas activé par défaut. Il dépend des capacités de sécurité du navigateur.
                      </p>
                    </div>
                    <Button
                      variant={encryptionActive ? "outline" : "default"}
                      className="rounded-2xl w-full hover:scale-105 transition-all"
                      onClick={handleEnableEncryption}
                      disabled={!encryptionSupported || encryptionActive || isEnablingEncryption}
                    >
                      {isEnablingEncryption ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          Activation...
                        </>
                      ) : encryptionActive ? (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          Chiffrement activé
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          Activer le chiffrement
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Storage Status Section */}
                  {storageInfo && (
                    <div className="rounded-3xl bg-gradient-to-br from-[hsl(var(--pastel-lavender))]/20 to-[hsl(var(--pastel-violet))]/10 p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Database className="h-5 w-5 text-purple-600" />
                          <Label className="text-base font-semibold">Gestion du stockage</Label>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={checkStorage}
                          className="gap-2 rounded-xl"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <StorageIndicator
                        percentage={storageInfo.percentage}
                        usage={storageInfo.usage}
                        quota={storageInfo.quota}
                        formatBytes={formatStorageBytes}
                      />

                      {storageWarning && storageWarning.level !== 'info' && (
                        <div className={cn(
                          "p-4 rounded-2xl text-sm",
                          storageWarning.level === 'critical' && "bg-destructive/10 text-destructive border border-destructive/20",
                          storageWarning.level === 'warning' && "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20"
                        )}>
                          <p className="font-medium mb-1">{storageWarning.message}</p>
                          <p className="opacity-90 text-xs">{storageWarning.recommendation}</p>
                        </div>
                      )}

                      {recommendations.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Recommandations :</p>
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            {recommendations.map((rec, idx) => (
                              <li key={idx} className="flex items-start gap-2 p-2 bg-background/30 rounded-xl">
                                <span className="text-primary mt-0.5">•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        className="w-full gap-2 rounded-2xl hover:scale-105 transition-all"
                        onClick={handleClearCache}
                        disabled={isClearing}
                      >
                        {isClearing ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Nettoyage en cours...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" />
                            Vider le cache
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Other settings */}
                  <div className="space-y-4">
                    {/* Notifications */}
                    <div className="flex items-center justify-between p-5 rounded-3xl bg-gradient-to-br from-[hsl(var(--pastel-rose))]/20 to-[hsl(var(--pastel-peach))]/10">
                      <div className="space-y-1">
                        <Label className="text-base font-semibold flex items-center gap-2">
                          <Bell className="h-5 w-5" />
                          Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Recevoir des notifications pour les réponses
                        </p>
                      </div>
                      <Switch checked={notifications} onCheckedChange={setNotifications} />
                    </div>

                    {/* Auto-save */}
                    <div className="flex items-center justify-between p-5 rounded-3xl bg-gradient-to-br from-[hsl(var(--pastel-sky))]/20 to-[hsl(var(--pastel-feather))]/10">
                      <div className="space-y-1">
                        <Label className="text-base font-semibold flex items-center gap-2">
                          <Zap className="h-5 w-5" />
                          Sauvegarde automatique
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Enregistrer automatiquement les conversations
                        </p>
                      </div>
                      <Switch checked={autoSave} onCheckedChange={setAutoSave} />
                    </div>

                    {/* Shortcuts */}
                    <div className="space-y-3 p-5 rounded-3xl bg-gradient-to-br from-[hsl(var(--pastel-linen))]/30 to-[hsl(var(--pastel-feather))]/20">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <Keyboard className="h-5 w-5" />
                        Raccourcis clavier
                      </Label>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center p-3 rounded-2xl bg-background/40">
                          <span>Nouvelle conversation</span>
                          <kbd className="px-3 py-1.5 bg-muted rounded-xl border text-xs font-medium">Ctrl + N</kbd>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-2xl bg-background/40">
                          <span>Rechercher</span>
                          <kbd className="px-3 py-1.5 bg-muted rounded-xl border text-xs font-medium">Ctrl + K</kbd>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-2xl bg-background/40">
                          <span>Paramètres</span>
                          <kbd className="px-3 py-1.5 bg-muted rounded-xl border text-xs font-medium">Ctrl + ,</kbd>
                        </div>
                      </div>
                    </div>

                    {/* Export Data */}
                    <Button variant="outline" className="w-full rounded-2xl justify-start gap-2 hover:scale-105 transition-all">
                      <Download className="h-5 w-5" />
                      Exporter mes données
                    </Button>

                    {/* App Info */}
                    <div className="space-y-3 p-5 rounded-3xl bg-gradient-to-br from-[hsl(var(--pastel-violet))]/20 to-[hsl(var(--pastel-lavender))]/10">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        Informations
                      </Label>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-3 bg-background/30 rounded-xl">
                          <span>Version</span>
                          <span className="font-mono font-medium">1.0.0</span>
                        </div>
                        <div className="flex justify-between p-3 bg-background/30 rounded-xl">
                          <span>Dernière mise à jour</span>
                          <span className="font-medium">Il y a 2 jours</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
