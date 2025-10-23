/**
 * WelcomeScreen Component
 * Écran d'accueil affiché quand aucun message n'est présent
 */
import React from 'react';
import { SuggestionChips } from "@/components/SuggestionChips";
import { Brain, Sparkles, Zap, Lock, Rocket, Globe } from "lucide-react";

interface WelcomeScreenProps {
  onSuggestionSelect: (suggestion: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSuggestionSelect }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4 py-8">
      <div className="text-center space-y-6 sm:space-y-10 mb-8 sm:mb-12 max-w-3xl">
        {/* Logo animé avec effet glass */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 rounded-full blur-3xl animate-pulse" />
            <div className="relative glass rounded-3xl p-6 border-2 border-primary/20">
              <Brain className="h-16 w-16 sm:h-20 sm:w-20 text-primary" />
            </div>
          </div>
        </div>

        {/* Titre principal */}
        <div className="space-y-3">
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Comment puis-je vous aider aujourd'hui ?
          </h2>
          <p className="text-base sm:text-xl text-muted-foreground font-light">
            Posez une question ou choisissez une suggestion ci-dessous
          </p>
        </div>

        {/* Cards de fonctionnalités avec icônes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-8">
          <div className="glass rounded-2xl p-4 hover:scale-105 transition-transform cursor-default">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
              </div>
              <span className="text-xs sm:text-sm font-medium">IA Avancée</span>
            </div>
          </div>
          
          <div className="glass rounded-2xl p-4 hover:scale-105 transition-transform cursor-default">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="p-3 rounded-xl bg-green-500/10">
                <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
              </div>
              <span className="text-xs sm:text-sm font-medium">100% Privé</span>
            </div>
          </div>
          
          <div className="glass rounded-2xl p-4 hover:scale-105 transition-transform cursor-default">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="p-3 rounded-xl bg-purple-500/10">
                <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
              </div>
              <span className="text-xs sm:text-sm font-medium">Ultra Rapide</span>
            </div>
          </div>
          
          <div className="glass rounded-2xl p-4 hover:scale-105 transition-transform cursor-default">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="p-3 rounded-xl bg-orange-500/10">
                <Rocket className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
              </div>
              <span className="text-xs sm:text-sm font-medium">Performant</span>
            </div>
          </div>
          
          <div className="glass rounded-2xl p-4 hover:scale-105 transition-transform cursor-default">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="p-3 rounded-xl bg-pink-500/10">
                <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-pink-500" />
              </div>
              <span className="text-xs sm:text-sm font-medium">Multi-langues</span>
            </div>
          </div>
          
          <div className="glass rounded-2xl p-4 hover:scale-105 transition-transform cursor-default">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="p-3 rounded-xl bg-cyan-500/10">
                <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-500" />
              </div>
              <span className="text-xs sm:text-sm font-medium">Local</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="w-full max-w-4xl mb-6 sm:mb-8">
        <SuggestionChips onSelect={onSuggestionSelect} />
      </div>
    </div>
  );
};
