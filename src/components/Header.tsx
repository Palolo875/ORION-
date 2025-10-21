/**
 * Header Component
 * Composant d'en-tête principal avec menu, sélecteur de modèle et thème
 */
import React from 'react';
import { Settings, Menu, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { QuickModelSwitcher } from "@/components/QuickModelSwitcher";

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
    <header className="sticky top-0 z-30 glass border-b border-[hsl(var(--glass-border))]">
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
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-semibold">ORION</h1>
            {modelInfo && (
              <span 
                className="hidden sm:flex text-xs px-2 py-1 rounded-full bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={onSettingsClick}
                title="Cliquer pour changer de modèle"
              >
                {modelInfo.name}
              </span>
            )}
            {deviceProfile && (
              <span className="device-profile text-xs px-2 py-1 rounded-full bg-accent/30 text-accent-foreground">
                {deviceProfile}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            className="rounded-full hover:bg-accent/50 h-8 w-8 sm:h-10 sm:w-10"
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
            className="rounded-full hover:bg-accent/50 h-8 w-8 sm:h-10 sm:w-10"
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
