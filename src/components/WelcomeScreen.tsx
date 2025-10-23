/**
 * WelcomeScreen Component
 * Écran d'accueil affiché quand aucun message n'est présent
 */
import React from 'react';
import { SuggestionChips } from "@/components/SuggestionChips";
import { Brain } from "lucide-react";

interface WelcomeScreenProps {
  onSuggestionSelect: (suggestion: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSuggestionSelect }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4 py-8">
      <div className="text-center space-y-6 sm:space-y-10 mb-8 sm:mb-12 max-w-3xl">
        {/* Logo animé avec effet organique */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--pastel-violet))]/40 via-[hsl(var(--pastel-rose))]/40 to-[hsl(var(--pastel-lavender))]/40 rounded-full blur-3xl animate-pulse" />
            <div className="relative glass rounded-[2.5rem] p-8 sm:p-10 border-2 border-[hsl(var(--pastel-violet))]/30 shadow-2xl">
              <Brain className="h-20 w-20 sm:h-24 sm:w-24 text-primary" />
            </div>
          </div>
        </div>

        {/* Titre principal avec design organique */}
        <div className="space-y-4">
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-primary via-[hsl(var(--pastel-violet))] to-accent bg-clip-text text-transparent leading-tight">
            Comment puis-je vous aider aujourd'hui ?
          </h2>
          <p className="text-base sm:text-xl text-muted-foreground font-light">
            Posez une question ou choisissez une suggestion ci-dessous
          </p>
        </div>
      </div>
      
      {/* Suggestions en pilules organiques */}
      <div className="w-full max-w-4xl mb-6 sm:mb-8">
        <SuggestionChips onSelect={onSuggestionSelect} />
      </div>
    </div>
  );
};
