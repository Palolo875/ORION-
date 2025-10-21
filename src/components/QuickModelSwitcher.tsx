import { Brain, Check, ChevronDown, Eye, Download, Zap } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { MODELS, formatBytes } from "@/config/models";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Progress } from "./ui/progress";

interface QuickModelSwitcherProps {
  currentModel?: string;
  onModelChange: (modelId: string) => void;
  className?: string;
  loadingProgress?: { modelId: string; progress: number };
}

export const QuickModelSwitcher = ({ currentModel, onModelChange, className, loadingProgress }: QuickModelSwitcherProps) => {
  const [selectedModelInfo, setSelectedModelInfo] = useState<{ key: string; model: typeof MODELS[keyof typeof MODELS] } | null>(null);

  useEffect(() => {
    if (currentModel) {
      const entry = Object.entries(MODELS).find(([_, m]) => m.id === currentModel);
      if (entry) {
        setSelectedModelInfo({ key: entry[0], model: entry[1] });
      }
    }
  }, [currentModel]);

  const handleModelSelect = (modelKey: string) => {
    const model = MODELS[modelKey];
    if (model) {
      onModelChange(model.id);
    }
  };

  if (!selectedModelInfo) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={cn("gap-2 rounded-xl", className)}
          size="sm"
        >
          <Brain className="h-4 w-4" />
          <span className="hidden sm:inline">{selectedModelInfo.model.name}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Brain className="h-4 w-4" />
          Changer de modèle
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.entries(MODELS).map(([key, model]) => {
          const isSelected = selectedModelInfo.key === key;
          const isVisionModel = model.capabilities?.includes('vision') || model.capabilities?.includes('multimodal');
          const isLoading = loadingProgress && loadingProgress.modelId === model.id;
          
          return (
            <DropdownMenuItem
              key={key}
              onClick={() => !isLoading && handleModelSelect(key)}
              className={cn(
                "flex items-start gap-3 p-3 cursor-pointer transition-all",
                isSelected && "bg-primary/10",
                isLoading && "opacity-75 cursor-wait"
              )}
              disabled={isLoading}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-medium">{model.name}</span>
                  {model.recommended && (
                    <Badge variant="secondary" className="text-xs px-1 py-0 bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0">
                      Rec.
                    </Badge>
                  )}
                  {isVisionModel && (
                    <Badge variant="outline" className="text-xs px-1 py-0 border-purple-500/50 text-purple-600 dark:text-purple-400">
                      <Eye className="h-2.5 w-2.5" />
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Download className="h-3 w-3" />
                  <span>{formatBytes(model.size)}</span>
                  <span>•</span>
                  <span>{model.maxTokens.toLocaleString()} tokens</span>
                  <span>•</span>
                  <span>
                    {model.quality === 'basic' && '⭐'}
                    {model.quality === 'high' && '⭐⭐'}
                    {model.quality === 'very-high' && '⭐⭐⭐'}
                    {model.quality === 'ultra' && '⭐⭐⭐⭐'}
                  </span>
                </div>
                {isLoading && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-primary">
                      <Zap className="h-3 w-3 animate-pulse" />
                      <span>Téléchargement... {loadingProgress.progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={loadingProgress.progress} className="h-1" />
                  </div>
                )}
              </div>
              {isSelected && !isLoading && (
                <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
