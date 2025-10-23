// src/components/ModelSelector.tsx

import { useState } from 'react';
import { Brain, Check, Sparkles, Zap, Rocket } from 'lucide-react';
import { Button } from './ui/button';
import { MODELS, formatBytes, ModelConfig } from '@/config/models';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  onSelect: (modelId: string) => void;
  defaultModel?: 'demo' | 'standard' | 'advanced';
}

export const ModelSelector = ({ onSelect, defaultModel = 'standard' }: ModelSelectorProps) => {
  const [selectedModel, setSelectedModel] = useState<'demo' | 'standard' | 'advanced'>(defaultModel);

  const handleSelect = () => {
    onSelect(MODELS[selectedModel].id);
  };

  const getModelIcon = (modelKey: 'demo' | 'standard' | 'advanced') => {
    switch (modelKey) {
      case 'demo':
        return <Zap className="h-6 w-6" />;
      case 'standard':
        return <Brain className="h-6 w-6" />;
      case 'advanced':
        return <Rocket className="h-6 w-6" />;
    }
  };

  const getQualityColor = (quality: ModelConfig['quality']) => {
    switch (quality) {
      case 'basic':
        return 'text-yellow-600';
      case 'high':
        return 'text-green-600';
      case 'very-high':
        return 'text-blue-600';
    }
  };

  const getSpeedLabel = (speed: ModelConfig['speed']) => {
    switch (speed) {
      case 'very-fast':
        return '⚡⚡⚡';
      case 'fast':
        return '⚡⚡';
      case 'moderate':
        return '⚡';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 glass-subtle">
      <div className="max-w-6xl w-full space-y-8">
        {/* Header avec logo amélioré */}
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 rounded-full blur-2xl animate-pulse" />
              <div className="relative bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 rounded-3xl p-8 glass border-2 border-primary/20">
                <Brain className="h-20 w-20 text-primary" />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Bienvenue dans ORION
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Intelligence Artificielle 100% locale et privée
            </p>
            <p className="text-base text-muted-foreground/80 max-w-2xl mx-auto">
              Choisissez votre modèle d'IA pour commencer. Vous pourrez le changer à tout moment dans les paramètres.
            </p>
          </div>
        </div>

        {/* Grille de modèles améliorée */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(Object.keys(MODELS) as Array<'demo' | 'standard' | 'advanced'>).map((modelKey) => {
            const model = MODELS[modelKey];
            const isSelected = selectedModel === modelKey;
            
            return (
              <button
                key={modelKey}
                onClick={() => setSelectedModel(modelKey)}
                className={cn(
                  "relative glass rounded-3xl p-8 border-2 transition-all duration-300",
                  "hover:scale-105 hover:shadow-2xl text-left group",
                  isSelected 
                    ? "border-primary shadow-2xl shadow-primary/30 bg-gradient-to-br from-primary/10 to-accent/5" 
                    : "border-transparent hover:border-primary/30"
                )}
              >
                {/* Effet de brillance au hover */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Badge recommandé */}
                {model.recommended && (
                  <div className="absolute -top-3 -right-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5 shadow-lg animate-pulse">
                    <Sparkles className="h-3.5 w-3.5" />
                    Recommandé
                  </div>
                )}

                {/* Checkmark si sélectionné */}
                {isSelected && (
                  <div className="absolute top-6 right-6 bg-primary text-primary-foreground rounded-full p-2 shadow-lg animate-scale-in">
                    <Check className="h-5 w-5" />
                  </div>
                )}

                {/* Icon du modèle avec gradient */}
                <div className={cn(
                  "rounded-2xl p-4 mb-6 inline-flex relative overflow-hidden",
                  isSelected ? "bg-gradient-to-br from-primary/20 to-accent/20" : "bg-gradient-to-br from-accent/10 to-muted/10"
                )}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  {getModelIcon(modelKey)}
                </div>

                {/* Nom et description */}
                <h3 className="text-2xl font-bold mb-3 flex items-center gap-2">
                  {model.name}
                  {isSelected && <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Sélectionné</span>}
                </h3>
                <p className="text-sm text-muted-foreground mb-6 min-h-[4rem] leading-relaxed">
                  {model.description}
                </p>

                {/* Specs avec design amélioré */}
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                    <span className="text-muted-foreground font-medium">💾 Taille</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{formatBytes(model.size)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                    <span className="text-muted-foreground font-medium">⚡ Vitesse</span>
                    <span className="font-bold">{getSpeedLabel(model.speed)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                    <span className="text-muted-foreground font-medium">✨ Qualité</span>
                    <span className={cn("font-bold text-lg", getQualityColor(model.quality))}>
                      {model.quality === 'basic' && '⭐'}
                      {model.quality === 'high' && '⭐⭐'}
                      {model.quality === 'very-high' && '⭐⭐⭐'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                    <span className="text-muted-foreground font-medium">🧠 Contexte</span>
                    <span className="font-bold text-green-600 dark:text-green-400">{model.maxTokens.toLocaleString()} tokens</span>
                  </div>
                  {model.minRAM && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                      <span className="text-muted-foreground font-medium">💻 RAM min</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">{model.minRAM}GB</span>
                    </div>
                  )}
                </div>

                {/* Indicateur de sélection en bas */}
                {isSelected && (
                  <div className="mt-6 pt-4 border-t border-primary/20">
                    <div className="flex items-center justify-center gap-2 text-primary text-sm font-medium">
                      <Check className="h-4 w-4" />
                      <span>Modèle actif</span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Info et bouton de confirmation améliorés */}
        <div className="space-y-6">
          {/* Cards d'information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <Sparkles className="h-5 w-5 text-blue-500" />
                </div>
                <h3 className="font-semibold">Intelligence locale</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Tous les modèles fonctionnent 100% localement. Vos données restent privées et ne quittent jamais votre appareil.
              </p>
            </div>
            
            <div className="glass rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-500/10">
                  <Rocket className="h-5 w-5 text-green-500" />
                </div>
                <h3 className="font-semibold">Mise en cache</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Les modèles sont mis en cache après le premier chargement pour un accès instantané par la suite.
              </p>
            </div>
          </div>

          {/* Bouton de confirmation avec effet */}
          <div className="flex justify-center">
            <Button 
              size="lg" 
              onClick={handleSelect}
              className="px-12 py-7 text-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-primary to-accent hover:scale-105"
            >
              <Rocket className="h-6 w-6 mr-3" />
              Charger {MODELS[selectedModel].name}
            </Button>
          </div>

          {/* Note de bas de page */}
          <p className="text-center text-xs text-muted-foreground">
            💡 Vous pourrez changer de modèle à tout moment dans les paramètres
          </p>
        </div>
      </div>
    </div>
  );
};
