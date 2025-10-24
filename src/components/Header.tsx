/**
 * Header Component
 * Composant d'en-tête principal avec menu, sélecteur de modèle et thème
 */
import React from 'react';
import { Settings, Menu, Brain, Sparkles, Zap } from "lucide-react";
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
    <header className="sticky top-0 z-30 glass border-b border-[hsl(var(--glass-border))] backdrop-blur-xl bg-gradient-to-r from-[hsl(var(--pastel-feather))]/20 to-transparent smooth-interaction">
      <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden rounded-[1.25rem] hover:bg-gradient-to-br hover:from-[hsl(var(--pastel-sage))]/20 hover:to-[hsl(var(--pastel-mint))]/10 h-9 w-9 sm:h-10 sm:w-10 smooth-interaction"
            aria-label="Ouvrir le menu"
            title="Menu"
          >
            <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Logo avec effet organique flottant */}
            <div className="relative animate-float-gentle" style={{ animationDuration: '4s' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--pastel-sage))]/30 to-[hsl(var(--pastel-rose))]/30 rounded-[1.25rem] blur-lg animate-glow-pulse" />
              <div className="relative p-2 rounded-[1.25rem] bg-gradient-to-br from-[hsl(var(--pastel-sage))]/20 to-[hsl(var(--pastel-mint))]/10 border border-[hsl(var(--pastel-sage))]/30 shadow-sm">
                <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
            </div>
            <h1 className="text-lg sm:text-2xl font-serif font-bold bg-gradient-to-r from-primary via-[hsl(var(--pastel-sage))] to-[hsl(var(--pastel-mint))] bg-clip-text text-transparent">
              ORION
            </h1>
            {modelInfo && (
              <button 
                className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-2 rounded-[1.25rem] glass bg-gradient-to-r from-[hsl(var(--pastel-sage))]/20 to-[hsl(var(--pastel-mint))]/10 text-primary cursor-pointer smooth-interaction border border-[hsl(var(--pastel-sage))]/20"
                onClick={onSettingsClick}
                title="Cliquer pour changer de modèle"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="font-medium">{modelInfo.name}</span>
              </button>
            )}
            {deviceProfile && (
              <span className="hidden md:inline-flex device-profile text-xs px-3 py-2 rounded-[1.25rem] glass bg-gradient-to-r from-[hsl(var(--pastel-sky))]/20 to-[hsl(var(--pastel-feather))]/10 text-foreground font-medium border border-[hsl(var(--pastel-sky))]/20">
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
            className={cn(
              "rounded-[1.25rem] smooth-interaction h-9 w-9 sm:h-10 sm:w-10",
              showCognitiveFlow 
                ? "bg-gradient-to-br from-[hsl(var(--pastel-sage))]/30 to-[hsl(var(--pastel-mint))]/20 text-primary border border-[hsl(var(--pastel-sage))]/30 shadow-sm" 
                : "hover:bg-gradient-to-br hover:from-[hsl(var(--pastel-sage))]/20 hover:to-[hsl(var(--pastel-mint))]/10"
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
            className="rounded-[1.25rem] hover:bg-gradient-to-br hover:from-[hsl(var(--pastel-rose))]/20 hover:to-[hsl(var(--pastel-peach))]/10 h-9 w-9 sm:h-10 sm:w-10 smooth-interaction"
            aria-label="Ouvrir le panneau de contrôle"
            title="Panneau de contrôle"
          >
            <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
