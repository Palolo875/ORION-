import { Clock, FileText, Sparkles, Image } from "lucide-react";
import { Button } from "./ui/button";

interface SuggestionChipsProps {
  onSelect: (suggestion: string) => void;
}

const suggestions = [
  {
    icon: Clock,
    label: "Quelle heure est-il ?",
    prompt: "Quelle heure est-il actuellement ?",
  },
  {
    icon: FileText,
    label: "Résumer",
    prompt: "Résume le contenu du presse-papiers",
  },
  {
    icon: Sparkles,
    label: "Idées créatives",
    prompt: "Donne-moi 5 idées créatives pour...",
  },
  {
    icon: Image,
    label: "Analyser image",
    prompt: "Analyse cette image en détail",
  },
];

export const SuggestionChips = ({ onSelect }: SuggestionChipsProps) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center px-2 sm:px-4 mb-4 sm:mb-6">
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion.label}
          variant="outline"
          onClick={() => onSelect(suggestion.prompt)}
          className="glass rounded-full gap-1.5 sm:gap-2 glass-hover border-[hsl(var(--glass-border))] hover:bg-accent/30 h-8 sm:h-10 px-3 sm:px-4"
        >
          <suggestion.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="text-xs sm:text-sm font-medium">{suggestion.label}</span>
        </Button>
      ))}
    </div>
  );
};
