// src/components/ModelComparison.tsx

import { useState } from 'react';
import { Check, X, Info, Zap, Brain, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { MODELS, formatBytes, ModelConfig } from '@/config/models';
import { cn } from '@/lib/utils';

interface ModelComparisonProps {
  onSelectModel?: (modelId: string) => void;
}

export const ModelComparison = ({ onSelectModel }: ModelComparisonProps) => {
  const [selectedModels, setSelectedModels] = useState<string[]>(['demo', 'standard', 'advanced']);

  const toggleModelSelection = (modelKey: string) => {
    if (selectedModels.includes(modelKey)) {
      if (selectedModels.length > 1) {
        setSelectedModels(selectedModels.filter(k => k !== modelKey));
      }
    } else {
      if (selectedModels.length < 4) {
        setSelectedModels([...selectedModels, modelKey]);
      }
    }
  };

  const getQualityScore = (quality: ModelConfig['quality']): number => {
    const scores = { 'basic': 1, 'high': 2, 'very-high': 3, 'ultra': 4 };
    return scores[quality];
  };

  const getSpeedScore = (speed: ModelConfig['speed']): number => {
    const scores = { 'slow': 1, 'moderate': 2, 'fast': 3, 'very-fast': 4 };
    return scores[speed];
  };

  const getCapabilityIcon = (capability: string) => {
    if (capability.includes('code')) return '💻';
    if (capability.includes('reasoning')) return '🧠';
    if (capability.includes('chat')) return '💬';
    if (capability.includes('multilingual')) return '🌍';
    if (capability.includes('context')) return '📚';
    return '✨';
  };

  const compareFeature = (feature: keyof ModelConfig, modelKey: string) => {
    const model = MODELS[modelKey];
    const allModels = Object.values(MODELS);
    
    switch (feature) {
      case 'quality':
        const maxQuality = Math.max(...allModels.map(m => getQualityScore(m.quality)));
        return getQualityScore(model.quality) === maxQuality ? 'best' : 'normal';
      case 'speed':
        const maxSpeed = Math.max(...allModels.map(m => getSpeedScore(m.speed)));
        return getSpeedScore(model.speed) === maxSpeed ? 'best' : 'normal';
      case 'size':
        const minSize = Math.min(...allModels.map(m => m.size));
        return model.size === minSize ? 'best' : 'normal';
      default:
        return 'normal';
    }
  };

  return (
    <div className="space-y-6">
      {/* Model Selection Pills */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(MODELS).map((modelKey) => {
          const model = MODELS[modelKey];
          const isSelected = selectedModels.includes(modelKey);
          
          return (
            <Button
              key={modelKey}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => toggleModelSelection(modelKey)}
              className="rounded-full"
            >
              {isSelected && <Check className="h-3 w-3 mr-1" />}
              {model.name}
            </Button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        <Info className="inline h-3 w-3 mr-1" />
        Sélectionnez jusqu'à 4 modèles pour comparer leurs caractéristiques
      </p>

      {/* Comparison Table */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedModels.length}, minmax(0, 1fr))` }}>
        {selectedModels.map((modelKey) => {
          const model = MODELS[modelKey];
          
          return (
            <Card key={modelKey} className={cn(
              "relative overflow-hidden",
              model.recommended && "border-primary shadow-lg"
            )}>
              {model.recommended && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl-lg">
                  <Sparkles className="inline h-3 w-3 mr-1" />
                  Recommandé
                </div>
              )}
              
              <CardHeader className="space-y-3">
                <CardTitle className="text-lg">{model.name}</CardTitle>
                <CardDescription className="text-xs min-h-[2.5rem]">
                  {model.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Taille */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Taille</span>
                    {compareFeature('size', modelKey) === 'best' && (
                      <Badge variant="outline" className="text-xs">Optimal</Badge>
                    )}
                  </div>
                  <p className="text-sm font-semibold">{formatBytes(model.size)}</p>
                </div>

                {/* Vitesse */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Vitesse</span>
                    {compareFeature('speed', modelKey) === 'best' && (
                      <Badge variant="outline" className="text-xs">Plus rapide</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Zap
                        key={i}
                        className={cn(
                          "h-4 w-4",
                          i < getSpeedScore(model.speed) ? "text-yellow-500 fill-yellow-500" : "text-muted opacity-20"
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Qualité */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Qualité</span>
                    {compareFeature('quality', modelKey) === 'best' && (
                      <Badge variant="outline" className="text-xs">Meilleure</Badge>
                    )}
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <span key={i} className={cn(
                        "text-lg",
                        i < getQualityScore(model.quality) ? "opacity-100" : "opacity-20"
                      )}>
                        ⭐
                      </span>
                    ))}
                  </div>
                </div>

                {/* Contexte */}
                <div>
                  <span className="text-xs text-muted-foreground">Contexte max</span>
                  <p className="text-sm font-semibold">{model.maxTokens.toLocaleString()} tokens</p>
                </div>

                {/* RAM requise */}
                <div>
                  <span className="text-xs text-muted-foreground">RAM minimale</span>
                  <p className="text-sm font-semibold">{model.minRAM} GB</p>
                </div>

                {/* Capacités */}
                <div>
                  <span className="text-xs text-muted-foreground mb-2 block">Capacités</span>
                  <div className="flex flex-wrap gap-1">
                    {model.capabilities?.map((cap) => (
                      <Badge key={cap} variant="secondary" className="text-xs">
                        {getCapabilityIcon(cap)} {cap.replace(/-/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* GPU requis (si applicable) */}
                {model.minGPU && (
                  <div className="pt-2 border-t">
                    <span className="text-xs text-muted-foreground">GPU recommandé</span>
                    <p className="text-xs font-medium mt-1">{model.minGPU}</p>
                  </div>
                )}

                {/* Action button */}
                {onSelectModel && (
                  <Button
                    onClick={() => onSelectModel(model.id)}
                    className="w-full mt-4"
                    variant={model.recommended ? "default" : "outline"}
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Utiliser ce modèle
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Légende */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <div className="font-semibold mb-1 flex items-center gap-1">
                <Zap className="h-3 w-3" /> Vitesse
              </div>
              <p className="text-muted-foreground">Temps de génération des réponses</p>
            </div>
            <div>
              <div className="font-semibold mb-1 flex items-center gap-1">
                ⭐ Qualité
              </div>
              <p className="text-muted-foreground">Précision et cohérence des réponses</p>
            </div>
            <div>
              <div className="font-semibold mb-1 flex items-center gap-1">
                📦 Taille
              </div>
              <p className="text-muted-foreground">Espace disque requis</p>
            </div>
            <div>
              <div className="font-semibold mb-1 flex items-center gap-1">
                <Brain className="h-3 w-3" /> RAM
              </div>
              <p className="text-muted-foreground">Mémoire système nécessaire</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
