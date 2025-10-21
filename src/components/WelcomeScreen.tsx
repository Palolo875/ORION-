/**
 * WelcomeScreen Component
 * Écran d'accueil affiché quand aucun message n'est présent
 */
import React from 'react';
import { SuggestionChips } from "@/components/SuggestionChips";

interface WelcomeScreenProps {
  onSuggestionSelect: (suggestion: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSuggestionSelect }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4">
      <div className="text-center space-y-4 sm:space-y-8 mb-8 sm:mb-12 max-w-2xl">
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-light tracking-tight">
          Comment puis-je vous aider ?
        </h2>
        <p className="text-sm sm:text-lg text-muted-foreground font-light">
          Posez une question ou choisissez une suggestion ci-dessous
        </p>
      </div>
      <div className="w-full max-w-4xl mb-6 sm:mb-8">
        <SuggestionChips onSelect={onSuggestionSelect} />
      </div>
    </div>
  );
};
