import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { DebateQuality } from '@/utils/debateQuality';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DebateMetricsProps {
  metrics: DebateQuality;
  showDetails?: boolean;
  className?: string;
}

interface MetricBarProps {
  label: string;
  value: number;
  tooltip: string;
}

const MetricBar: React.FC<MetricBarProps> = ({ label, value, tooltip }) => {
  const getColorForScore = (score: number): string => {
    if (score >= 0.8) return 'text-green-500';
    if (score >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium">{label}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className={cn("text-xs font-mono font-semibold", getColorForScore(value))}>
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      <Progress 
        value={value * 100} 
        className={cn(
          "h-2",
          value >= 0.8 && "[&>*]:bg-green-500",
          value >= 0.6 && value < 0.8 && "[&>*]:bg-yellow-500",
          value < 0.6 && "[&>*]:bg-red-500"
        )} 
      />
    </div>
  );
};

export const DebateMetrics: React.FC<DebateMetricsProps> = ({ 
  metrics, 
  showDetails: initialShowDetails = false,
  className 
}) => {
  const [isExpanded, setIsExpanded] = useState(initialShowDetails);

  const getColorForScore = (score: number): string => {
    if (score >= 0.8) return 'text-green-500';
    if (score >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  const getInterpretation = (score: number): string => {
    if (score >= 0.9) return 'Excellent';
    if (score >= 0.8) return 'Très bon';
    if (score >= 0.7) return 'Bon';
    if (score >= 0.6) return 'Acceptable';
    return 'À améliorer';
  };

  const getBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'outline';
  };
  
  return (
    <Card className={cn("p-4 mt-4", className)}>
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">📊 Qualité du Débat</h4>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
        <Badge 
          variant={getBadgeVariant(metrics.overallScore)}
          className={cn(
            "text-base font-bold",
            getColorForScore(metrics.overallScore)
          )}
        >
          {(metrics.overallScore * 100).toFixed(0)}%
        </Badge>
      </div>
      
      {isExpanded && (
        <div className="mt-4 space-y-3">
          <MetricBar 
            label="Cohérence" 
            value={metrics.coherence}
            tooltip="Les agents se répondent de manière logique et cohérente entre eux"
          />
          <MetricBar 
            label="Couverture" 
            value={metrics.coverage}
            tooltip={`Tous les aspects du sujet sont abordés (${metrics.details?.coverageCount || 0} concepts détectés)`}
          />
          <MetricBar 
            label="Originalité" 
            value={metrics.novelty}
            tooltip="Des idées nouvelles et créatives ont été proposées"
          />
          <MetricBar 
            label="Rigueur" 
            value={metrics.rigor}
            tooltip="L'analyse est structurée, logique et factuelle"
          />
          <MetricBar 
            label="Équilibre" 
            value={metrics.balance}
            tooltip="Aucun agent ne domine excessivement le débat"
          />
        </div>
      )}
      
      <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
        <span className="font-medium">Interprétation :</span> {getInterpretation(metrics.overallScore)}
        {metrics.overallScore < 0.6 && (
          <span className="block mt-1 text-yellow-600 dark:text-yellow-500">
            💡 Astuce : Reformulez votre question de manière plus précise pour améliorer la qualité.
          </span>
        )}
      </p>
    </Card>
  );
};
