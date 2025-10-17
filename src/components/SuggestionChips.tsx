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
    <div className="flex flex-wrap gap-2 justify-center px-4 mb-6">
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion.label}
          variant="outline"
          onClick={() => onSelect(suggestion.prompt)}
          className="glass rounded-full gap-2 glass-hover border-[hsl(var(--glass-border))] hover:bg-accent/30"
        >
          <suggestion.icon className="h-4 w-4" />
          <span className="text-sm font-medium">{suggestion.label}</span>
        </Button>
      ))}
    </div>
  );
};
