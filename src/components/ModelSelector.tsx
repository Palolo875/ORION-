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
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <div className="relative bg-gradient-to-br from-primary/20 to-accent/20 rounded-full p-6">
                <Brain className="h-16 w-16 text-primary" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Bienvenue dans ORION</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choisissez votre modèle d'IA pour commencer. Vous pourrez le changer à tout moment dans les paramètres.
          </p>
        </div>

        {/* Grille de modèles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.keys(MODELS) as Array<'demo' | 'standard' | 'advanced'>).map((modelKey) => {
            const model = MODELS[modelKey];
            const isSelected = selectedModel === modelKey;
            
            return (
              <button
                key={modelKey}
                onClick={() => setSelectedModel(modelKey)}
                className={cn(
                  "relative glass rounded-2xl p-6 border-2 transition-all duration-200",
                  "hover:scale-105 hover:shadow-xl text-left",
                  isSelected 
                    ? "border-primary shadow-lg shadow-primary/20 bg-primary/5" 
                    : "border-transparent hover:border-primary/30"
                )}
              >
                {/* Badge recommandé */}
                {model.recommended && (
                  <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                    <Sparkles className="h-3 w-3" />
                    Recommandé
                  </div>
                )}

                {/* Checkmark si sélectionné */}
                {isSelected && (
                  <div className="absolute top-4 right-4 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-4 w-4" />
                  </div>
                )}

                {/* Icon du modèle */}
                <div className={cn(
                  "rounded-xl p-3 mb-4 inline-flex",
                  isSelected ? "bg-primary/20" : "bg-accent/20"
                )}>
                  {getModelIcon(modelKey)}
                </div>

                {/* Nom et description */}
                <h3 className="text-xl font-semibold mb-2">{model.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 min-h-[3rem]">
                  {model.description}
                </p>

                {/* Specs */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Taille</span>
                    <span className="font-semibold">{formatBytes(model.size)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Vitesse</span>
                    <span className="font-semibold">{getSpeedLabel(model.speed)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Qualité</span>
                    <span className={cn("font-semibold", getQualityColor(model.quality))}>
                      {model.quality === 'basic' && '⭐'}
                      {model.quality === 'high' && '⭐⭐'}
                      {model.quality === 'very-high' && '⭐⭐⭐'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Contexte</span>
                    <span className="font-semibold">{model.maxTokens} tokens</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Info et bouton de confirmation */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Astuce :</strong> Commencez avec "Démo Rapide" pour tester instantanément, 
              puis passez à "Standard" pour une expérience complète.
            </p>
            <p className="text-xs text-muted-foreground">
              🔒 Tous les modèles fonctionnent 100% localement et sont mis en cache pour les prochaines utilisations.
            </p>
          </div>

          <div className="flex justify-center">
            <Button 
              size="lg" 
              onClick={handleSelect}
              className="px-8 py-6 text-lg rounded-2xl"
            >
              Charger {MODELS[selectedModel].name}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
