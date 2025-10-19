import { X, User, Settings, BarChart3, Moon, Sun, Globe, Bell, Keyboard, Download, Info, Zap, Brain, Shield, Palette, Check, Sparkles, Rocket, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { useState, useEffect } from "react";
import { MODELS, formatBytes, ModelConfig, detectDeviceCapabilities, DeviceCapabilities } from "@/config/models";
import { cn } from "@/lib/utils";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel?: string;
  onModelChange?: (modelId: string) => void;
}

export const SettingsPanel = ({ isOpen, onClose, currentModel, onModelChange }: SettingsPanelProps) => {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [selectedModelKey, setSelectedModelKey] = useState<string>("standard");
  const [deviceCapabilities, setDeviceCapabilities] = useState<DeviceCapabilities | null>(null);
  const [temperature, setTemperature] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState([2000]);
  const [language, setLanguage] = useState("fr");
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

  // Detect device capabilities on mount
  useEffect(() => {
    async function loadCapabilities() {
      const caps = await detectDeviceCapabilities();
      setDeviceCapabilities(caps);
    }
    loadCapabilities();
  }, []);

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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-full sm:max-w-md z-50 glass border-l border-[hsl(var(--glass-border))] animate-slide-in-right">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
            <h2 className="text-xl sm:text-2xl font-semibold">Paramètres</h2>
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
            <Tabs defaultValue="ai" className="w-full">
              <TabsList className="grid w-full grid-cols-4 glass rounded-xl sm:rounded-2xl p-1">
                <TabsTrigger value="ai" className="rounded-lg sm:rounded-xl gap-1 sm:gap-2 text-xs sm:text-sm">
                  <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">IA</span>
                </TabsTrigger>
                <TabsTrigger value="appearance" className="rounded-lg sm:rounded-xl gap-1 sm:gap-2 text-xs sm:text-sm">
                  <Palette className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Apparence</span>
                </TabsTrigger>
                <TabsTrigger value="account" className="rounded-lg sm:rounded-xl gap-1 sm:gap-2 text-xs sm:text-sm">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Compte</span>
                </TabsTrigger>
                <TabsTrigger value="advanced" className="rounded-lg sm:rounded-xl gap-1 sm:gap-2 text-xs sm:text-sm">
                  <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Avancé</span>
                </TabsTrigger>
              </TabsList>

              {/* AI Settings Tab */}
              <TabsContent value="ai" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
                <div className="space-y-1 sm:space-y-2">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Configuration de l'IA
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Personnalisez le comportement et les performances de l'assistant IA.
                  </p>
                </div>

                <div className="space-y-5 sm:space-y-6">
                  {/* Model Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs sm:text-sm font-medium">Modèle d'IA Local</Label>
                      {deviceCapabilities && (
                        <Badge variant="outline" className="text-xs">
                          RAM: {deviceCapabilities.ram}GB
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {Object.entries(MODELS).map(([key, model]) => {
                        const isSelected = selectedModelKey === key;
                        const isCompatible = !deviceCapabilities || deviceCapabilities.compatibleModels.includes(key);
                        const isRecommended = deviceCapabilities?.recommendedModel === key;
                        
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
                              "w-full glass rounded-xl p-4 text-left transition-all",
                              "hover:scale-[1.02] hover:shadow-md",
                              isSelected && "border-2 border-primary shadow-lg shadow-primary/20",
                              !isCompatible && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-sm font-semibold truncate">{model.name}</h4>
                                  {model.recommended && (
                                    <Badge className="text-xs px-1.5 py-0">
                                      <Sparkles className="h-3 w-3" />
                                    </Badge>
                                  )}
                                  {isRecommended && (
                                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                      Optimal
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                  {model.description}
                                </p>
                                <div className="flex flex-wrap gap-2 text-xs">
                                  <span className="px-2 py-0.5 bg-accent/30 rounded">
                                    {formatBytes(model.size)}
                                  </span>
                                  <span className="px-2 py-0.5 bg-accent/30 rounded">
                                    {model.maxTokens} tokens
                                  </span>
                                  <span className="px-2 py-0.5 bg-accent/30 rounded">
                                    {model.quality === 'basic' && '⭐'}
                                    {model.quality === 'high' && '⭐⭐'}
                                    {model.quality === 'very-high' && '⭐⭐⭐'}
                                    {model.quality === 'ultra' && '⭐⭐⭐⭐'}
                                  </span>
                                  <span className="px-2 py-0.5 bg-accent/30 rounded">
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
                                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      💡 Tous les modèles fonctionnent 100% localement. Les modèles incompatibles sont grisés.
                    </p>
                  </div>

                  <Separator />

                  {/* Temperature */}
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs sm:text-sm font-medium">Température</Label>
                      <span className="text-xs sm:text-sm text-muted-foreground font-mono">
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

                  <Separator />

                  {/* Max Tokens */}
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs sm:text-sm font-medium">Longueur maximale</Label>
                      <span className="text-xs sm:text-sm text-muted-foreground font-mono">
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
              </TabsContent>

              {/* Appearance Tab */}
              <TabsContent value="appearance" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
                <div className="space-y-1 sm:space-y-2">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Apparence et Interface
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Personnalisez l'apparence de l'interface selon vos préférences.
                  </p>
                </div>

                <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-5 sm:space-y-6">
                  {/* Theme */}
                  <div className="space-y-2 sm:space-y-3">
                    <Label className="text-xs sm:text-sm font-medium">Thème</Label>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <Button
                        variant={theme === "light" ? "default" : "outline"}
                        onClick={() => toggleTheme("light")}
                        className="h-20 sm:h-24 flex-col gap-2 rounded-xl sm:rounded-2xl"
                      >
                        <Sun className="h-6 w-6 sm:h-7 sm:w-7" />
                        <span className="text-xs sm:text-sm font-medium">Clair</span>
                      </Button>
                      <Button
                        variant={theme === "dark" ? "default" : "outline"}
                        onClick={() => toggleTheme("dark")}
                        className="h-20 sm:h-24 flex-col gap-2 rounded-xl sm:rounded-2xl"
                      >
                        <Moon className="h-6 w-6 sm:h-7 sm:w-7" />
                        <span className="text-xs sm:text-sm font-medium">Sombre</span>
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Language */}
                  <div className="space-y-2 sm:space-y-3">
                    <Label className="text-xs sm:text-sm font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Langue
                    </Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="w-full rounded-xl">
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

                  <Separator />

                  {/* Sound Effects */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs sm:text-sm font-medium">Effets sonores</Label>
                      <p className="text-xs text-muted-foreground">
                        Sons pour les notifications et interactions
                      </p>
                    </div>
                    <Switch checked={soundEffects} onCheckedChange={setSoundEffects} />
                  </div>
                </div>
              </TabsContent>

              {/* Account Tab */}
              <TabsContent value="account" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
                <div className="space-y-1 sm:space-y-2">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informations du compte
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Gérez vos informations personnelles et votre abonnement.
                  </p>
                </div>

                <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 sm:space-y-5">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-sm sm:text-base font-medium">utilisateur@example.com</p>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Abonnement</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm sm:text-base font-medium">Plan Premium</p>
                      <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                        Pro
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Usage Stats */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">Utilisation ce mois</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="font-medium">Messages</span>
                        <span className="text-muted-foreground">847 / 5000</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: "17%" }} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="font-medium">Tokens utilisés</span>
                        <span className="text-muted-foreground">124K / 1M</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: "12%" }} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <Button variant="outline" className="w-full rounded-xl">
                    Mettre à niveau
                  </Button>
                </div>
              </TabsContent>

              {/* Advanced Tab */}
              <TabsContent value="advanced" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
                <div className="space-y-1 sm:space-y-2">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Paramètres avancés
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Options avancées et fonctionnalités expérimentales.
                  </p>
                </div>

                <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-5 sm:space-y-6">
                  {/* Notifications */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs sm:text-sm font-medium flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Notifications
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Recevoir des notifications pour les réponses
                      </p>
                    </div>
                    <Switch checked={notifications} onCheckedChange={setNotifications} />
                  </div>

                  <Separator />

                  {/* Auto-save */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs sm:text-sm font-medium flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Sauvegarde automatique
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Enregistrer automatiquement les conversations
                      </p>
                    </div>
                    <Switch checked={autoSave} onCheckedChange={setAutoSave} />
                  </div>

                  <Separator />

                  {/* Shortcuts */}
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-medium flex items-center gap-2">
                      <Keyboard className="h-4 w-4" />
                      Raccourcis clavier
                    </Label>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                        <span>Nouvelle conversation</span>
                        <kbd className="px-2 py-1 bg-background rounded border">Ctrl + N</kbd>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                        <span>Rechercher</span>
                        <kbd className="px-2 py-1 bg-background rounded border">Ctrl + K</kbd>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                        <span>Paramètres</span>
                        <kbd className="px-2 py-1 bg-background rounded border">Ctrl + ,</kbd>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Export Data */}
                  <Button variant="outline" className="w-full rounded-xl justify-start gap-2">
                    <Download className="h-4 w-4" />
                    Exporter mes données
                  </Button>

                  <Separator />

                  {/* App Info */}
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-medium flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Informations
                    </Label>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Version</span>
                        <span className="font-mono">1.0.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dernière mise à jour</span>
                        <span>Il y a 2 jours</span>
                      </div>
                    </div>
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
