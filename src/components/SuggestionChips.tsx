import { Clock, FileText, Sparkles, Image, Zap, Brain, Scale, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface SuggestionChipsProps {
  onSelect: (suggestion: string) => void;
}

const suggestions = [
  {
    icon: Clock,
    label: "Quelle heure est-il ?",
    prompt: "Quelle heure est-il actuellement ?",
    color: "from-[hsl(var(--pastel-sky))]/30 to-[hsl(var(--pastel-feather))]/20",
    iconColor: "text-blue-600",
  },
  {
    icon: FileText,
    label: "Résumer",
    prompt: "Résume le contenu du presse-papiers",
    color: "from-[hsl(var(--pastel-linen))]/30 to-[hsl(var(--pastel-peach))]/20",
    iconColor: "text-orange-600",
  },
  {
    icon: Sparkles,
    label: "Idées créatives",
    prompt: "Donne-moi 5 idées créatives pour...",
    color: "from-[hsl(var(--pastel-violet))]/30 to-[hsl(var(--pastel-lavender))]/20",
    iconColor: "text-purple-600",
  },
  {
    icon: Image,
    label: "Analyser image",
    prompt: "Analyse cette image en détail",
    color: "from-[hsl(var(--pastel-rose))]/30 to-[hsl(var(--pastel-peach))]/20",
    iconColor: "text-pink-600",
  },
  {
    icon: Brain,
    label: "Brainstorming",
    prompt: "Aide-moi à faire un brainstorming sur...",
    color: "from-[hsl(var(--pastel-mint))]/30 to-[hsl(var(--pastel-sky))]/20",
    iconColor: "text-green-600",
  },
  {
    icon: Zap,
    label: "Résolution rapide",
    prompt: "Aide-moi à résoudre rapidement...",
    color: "from-[hsl(var(--pastel-peach))]/30 to-[hsl(var(--pastel-rose))]/20",
    iconColor: "text-yellow-600",
  },
];

export const SuggestionChips = ({ onSelect }: SuggestionChipsProps) => {
  return (
    <div className="flex flex-wrap gap-3 justify-center px-2 sm:px-4 mb-4 sm:mb-6">
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion.label}
          variant="outline"
          onClick={() => onSelect(suggestion.prompt)}
          className={cn(
            "rounded-full gap-2 px-5 py-6 h-auto transition-all duration-200",
            "border-2 border-transparent hover:border-primary/30",
            "hover:scale-105 active:scale-95",
            "bg-gradient-to-br shadow-md hover:shadow-lg",
            suggestion.color
          )}
        >
          <div className={cn("p-2 rounded-full bg-white/50 dark:bg-black/20", suggestion.iconColor)}>
            <suggestion.icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <span className="text-sm sm:text-base font-medium">{suggestion.label}</span>
        </Button>
      ))}
    </div>
  );
};
