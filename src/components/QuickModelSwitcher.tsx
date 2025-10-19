import { Brain, Check, ChevronDown } from "lucide-react";
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

interface QuickModelSwitcherProps {
  currentModel?: string;
  onModelChange: (modelId: string) => void;
  className?: string;
}

export const QuickModelSwitcher = ({ currentModel, onModelChange, className }: QuickModelSwitcherProps) => {
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
          
          return (
            <DropdownMenuItem
              key={key}
              onClick={() => handleModelSelect(key)}
              className="flex items-start gap-3 p-3 cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{model.name}</span>
                  {model.recommended && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      Rec.
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatBytes(model.size)}</span>
                  <span>•</span>
                  <span>{model.maxTokens} tokens</span>
                  <span>•</span>
                  <span>
                    {model.quality === 'basic' && '⭐'}
                    {model.quality === 'high' && '⭐⭐'}
                    {model.quality === 'very-high' && '⭐⭐⭐'}
                    {model.quality === 'ultra' && '⭐⭐⭐⭐'}
                  </span>
                </div>
              </div>
              {isSelected && (
                <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
