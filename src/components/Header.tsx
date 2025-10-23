/**
 * Header Component
 * Composant d'en-tête principal avec menu, sélecteur de modèle et thème
 */
import React from 'react';
import { Settings, Menu, Brain, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { QuickModelSwitcher } from "@/components/QuickModelSwitcher";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onMenuClick: () => void;
  onCognitiveFlowToggle: () => void;
  onSettingsClick: () => void;
  showCognitiveFlow: boolean;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  modelInfo: { name: string } | null;
  deviceProfile: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  onCognitiveFlowToggle,
  onSettingsClick,
  showCognitiveFlow,
  selectedModel,
  onModelChange,
  modelInfo,
  deviceProfile
}) => {
  return (
    <header className="sticky top-0 z-30 glass border-b border-[hsl(var(--glass-border))] backdrop-blur-xl">
      <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden rounded-full hover:bg-accent/50 h-8 w-8 sm:h-10 sm:w-10"
            aria-label="Ouvrir le menu"
            title="Menu"
          >
            <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Logo avec effet glass */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md" />
              <div className="relative p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20">
                <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            </div>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              ORION
            </h1>
            {modelInfo && (
              <button 
                className="hidden sm:flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-all hover:scale-105 border border-primary/20"
                onClick={onSettingsClick}
                title="Cliquer pour changer de modèle"
              >
                <Sparkles className="h-3 w-3" />
                <span className="font-medium">{modelInfo.name}</span>
              </button>
            )}
            {deviceProfile && (
              <span className="device-profile text-xs px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-accent/20 to-muted/20 text-accent-foreground font-medium border border-accent/20">
                {deviceProfile}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <QuickModelSwitcher 
            currentModel={selectedModel}
            onModelChange={onModelChange}
            className="hidden md:flex"
          />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={onCognitiveFlowToggle}
            className={cn(
              "rounded-full hover:bg-accent/50 h-8 w-8 sm:h-10 sm:w-10 transition-all",
              showCognitiveFlow && "bg-primary/10 text-primary hover:bg-primary/20"
            )}
            aria-label={showCognitiveFlow ? "Masquer le flux cognitif" : "Afficher le flux cognitif"}
            aria-pressed={showCognitiveFlow}
            title="Afficher le flux cognitif"
          >
            <Brain className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            className="rounded-full hover:bg-accent/50 h-8 w-8 sm:h-10 sm:w-10 hover:scale-110 transition-all"
            aria-label="Ouvrir le panneau de contrôle"
            title="Panneau de contrôle"
          >
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
