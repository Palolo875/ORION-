/**
 * WelcomeScreen Component - Design Organique & Intuitif
 * Écran d'accueil avec message dynamique selon l'heure du jour
 */
import React, { useState, useEffect } from 'react';
import { SuggestionChips } from "@/components/SuggestionChips";
import { Brain, Sparkles } from "lucide-react";

interface WelcomeScreenProps {
  onSuggestionSelect: (suggestion: string) => void;
}

interface TimeBasedGreeting {
  greeting: string;
  subtitle: string;
  emoji: string;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSuggestionSelect }) => {
  const [greeting, setGreeting] = useState<TimeBasedGreeting>({
    greeting: "Bonjour",
    subtitle: "Comment puis-je vous aider aujourd'hui ?",
    emoji: "☀️"
  });

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      
      if (hour >= 5 && hour < 12) {
        setGreeting({
          greeting: "Bonjour",
          subtitle: "Prêt à démarrer une nouvelle journée de découvertes ?",
          emoji: "🌅"
        });
      } else if (hour >= 12 && hour < 18) {
        setGreeting({
          greeting: "Bon après-midi",
          subtitle: "Comment puis-je vous accompagner aujourd'hui ?",
          emoji: "☀️"
        });
      } else if (hour >= 18 && hour < 22) {
        setGreeting({
          greeting: "Bonsoir",
          subtitle: "Que puis-je faire pour vous ce soir ?",
          emoji: "🌆"
        });
      } else {
        setGreeting({
          greeting: "Bonne soirée",
          subtitle: "Je suis là pour vous aider, même tard dans la nuit",
          emoji: "🌙"
        });
      }
    };

    updateGreeting();
    // Mettre à jour toutes les heures
    const interval = setInterval(updateGreeting, 3600000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4 py-8 animate-fade-in">
      <div className="text-center space-y-6 sm:space-y-10 mb-8 sm:mb-12 max-w-3xl">
        {/* Logo animé avec effet organique flottant */}
        <div className="flex justify-center mb-8 sm:mb-12">
          <div className="relative animate-float-gentle">
            {/* Glow effect pulsant */}
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--pastel-sage))]/40 via-[hsl(var(--pastel-rose))]/40 to-[hsl(var(--pastel-lavender))]/40 rounded-full blur-3xl animate-glow-pulse" />
            
            {/* Logo container avec effet glass */}
            <div className="relative glass floating-panel p-8 sm:p-12 border border-[hsl(var(--pastel-sage))]/30">
              <Brain className="h-20 w-20 sm:h-28 sm:w-28 text-primary drop-shadow-lg" />
              
              {/* Sparkles decoratifs */}
              <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-[hsl(var(--pastel-rose))] animate-pulse" />
              <Sparkles className="absolute -bottom-2 -left-2 h-5 w-5 text-[hsl(var(--pastel-lavender))] animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>
        </div>

        {/* Message d'accueil dynamique avec typographie Serif */}
        <div className="space-y-4 sm:space-y-6 animate-slide-up">
          {/* Emoji et salutation */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <span className="text-4xl sm:text-5xl animate-scale-in">{greeting.emoji}</span>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-semibold tracking-tight text-foreground">
              {greeting.greeting}
            </h1>
          </div>
          
          {/* Sous-titre avec effet gradient doux */}
          <h2 className="text-xl sm:text-3xl md:text-4xl font-serif font-normal text-foreground/80 leading-relaxed px-4">
            {greeting.subtitle}
          </h2>
          
          {/* Description avec typographie légère */}
          <p className="text-sm sm:text-lg text-muted-foreground font-light mt-4 sm:mt-6 max-w-2xl mx-auto px-4 leading-relaxed">
            Posez-moi une question, explorez les suggestions ci-dessous, ou commencez simplement à taper...
          </p>
        </div>

        {/* Séparateur décoratif organique */}
        <div className="flex items-center justify-center gap-2 my-6 sm:my-8">
          <div className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent via-[hsl(var(--pastel-sage))]/30 to-transparent"></div>
          <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--pastel-rose))]/40"></div>
          <div className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent via-[hsl(var(--pastel-sage))]/30 to-transparent"></div>
        </div>
      </div>
      
      {/* Suggestions en pilules organiques */}
      <div className="w-full max-w-4xl mb-6 sm:mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <SuggestionChips onSelect={onSuggestionSelect} />
      </div>
    </div>
  );
};
