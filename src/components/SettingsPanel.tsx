import { X, User, Settings, BarChart3, Moon, Sun, Globe, Bell, Keyboard, Download, Info, Zap, Brain, Shield, Palette, Rocket, Check, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useState } from "react";
import { MODELS, formatBytes, ModelConfig } from "@/config/models";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel?: string;
  onModelChange?: (modelId: string) => void;
}

export const SettingsPanel = ({ isOpen, onClose, currentModel, onModelChange }: SettingsPanelProps) => {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [selectedModelKey, setSelectedModelKey] = useState<string>(() => {
    // Find the key for the current model
    if (currentModel) {
      const entry = Object.entries(MODELS).find(([_, model]) => model.id === currentModel);
      return entry ? entry[0] : 'standard';
    }
    return 'standard';
  });
  const [temperature, setTemperature] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState([2000]);
  const [language, setLanguage] = useState("fr");
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

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

                <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-5 sm:space-y-6">
                  {/* Model Selection */}
                  <div className="space-y-3">
                    <Label className="text-xs sm:text-sm font-medium">Modèle d'IA Local</Label>
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle className="text-xs sm:text-sm">Modèle actuel</AlertTitle>
                      <AlertDescription className="text-xs">
                        {MODELS[selectedModelKey]?.name || 'Standard'} - {formatBytes(MODELS[selectedModelKey]?.size || 0)}
                      </AlertDescription>
                    </Alert>
                    
                    <div className="grid grid-cols-1 gap-2">
                      {Object.entries(MODELS).map(([key, model]) => {
                        const isSelected = selectedModelKey === key;
                        const isCurrentlyLoaded = currentModel === model.id;
                        
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              if (window.confirm(`Voulez-vous changer de modèle vers "${model.name}" ? L'application va se recharger.`)) {
                                setSelectedModelKey(key);
                                onModelChange?.(model.id);
                                toast({
                                  title: "Modèle changé",
                                  description: `Le modèle a été changé vers "${model.name}". Chargement en cours...`,
                                });
                                onClose();
                              }
                            }}
                            disabled={isCurrentlyLoaded}
                            className={cn(
                              "relative glass rounded-xl p-3 border text-left transition-all duration-200",
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
                    
                    <p className="text-xs text-muted-foreground">
                      🔒 Tous les modèles fonctionnent 100% localement. Le changement nécessite le téléchargement et le chargement du nouveau modèle.
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
