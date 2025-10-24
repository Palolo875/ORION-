/**
 * Composant d'indicateur de confiance pour les réponses IA
 * 
 * Affiche visuellement le niveau de confiance d'une réponse,
 * avec des alertes pour les hallucinations potentielles.
 */

import { Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ConfidenceScore } from '@/utils/humanBehavior';

export interface ConfidenceIndicatorProps {
  confidence: ConfidenceScore;
  showDetails?: boolean;
  compact?: boolean;
  hallucinationWarnings?: string[];
}

/**
 * Détermine la couleur et l'icône selon le score de confiance
 */
function getConfidenceDisplay(score: number) {
  if (score >= 0.8) {
    return {
      color: 'bg-green-500',
      textColor: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: '🟢',
      label: 'Confiance élevée',
      Icon: CheckCircle,
    };
  }
  
  if (score >= 0.6) {
    return {
      color: 'bg-yellow-500',
      textColor: 'text-yellow-700',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      icon: '🟡',
      label: 'Confiance moyenne',
      Icon: Info,
    };
  }
  
  return {
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: '🔴',
    label: 'Incertitude',
    Icon: AlertTriangle,
  };
}

/**
 * Composant principal
 */
export function ConfidenceIndicator({
  confidence,
  showDetails = true,
  compact = false,
  hallucinationWarnings = [],
}: ConfidenceIndicatorProps) {
  const display = getConfidenceDisplay(confidence.score);
  const percentage = Math.round(confidence.score * 100);
  
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`${display.textColor} ${display.borderColor} cursor-help`}>
              {display.icon} {percentage}%
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1">
              <p className="font-semibold">{display.label}</p>
              <p className="text-sm">{confidence.reasoning}</p>
              {hallucinationWarnings.length > 0 && (
                <p className="text-sm text-red-600 mt-2">
                  ⚠️ {hallucinationWarnings[0]}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <div className="space-y-3">
      {/* Barre de progression */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <display.Icon className="w-4 h-4" />
            {display.label}
          </span>
          <span className={`text-sm font-semibold ${display.textColor}`}>
            {percentage}%
          </span>
        </div>
        
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${display.color} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      
      {/* Détails */}
      {showDetails && (
        <div className={`p-3 rounded-md ${display.bgColor} ${display.borderColor} border`}>
          <p className="text-sm text-gray-700 mb-2">
            {confidence.reasoning}
          </p>
          
          {/* Facteurs détaillés */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-medium">Bases factuelles :</span>
              <span className="ml-1">{Math.round(confidence.factors.factualBasis * 100)}%</span>
            </div>
            <div>
              <span className="font-medium">Cohérence :</span>
              <span className="ml-1">{Math.round(confidence.factors.logicalConsistency * 100)}%</span>
            </div>
            <div>
              <span className="font-medium">Expertise :</span>
              <span className="ml-1">{Math.round(confidence.factors.domainExpertise * 100)}%</span>
            </div>
            <div>
              <span className="font-medium">Certitude :</span>
              <span className="ml-1">{Math.round((1 - confidence.factors.uncertaintyLevel) * 100)}%</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Alertes d'hallucination */}
      {hallucinationWarnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-semibold">Attention :</span>
            <ul className="mt-1 ml-4 list-disc space-y-1">
              {hallucinationWarnings.map((warning, idx) => (
                <li key={idx} className="text-sm">{warning}</li>
              ))}
            </ul>
            <p className="text-xs mt-2">
              Cette réponse pourrait contenir des informations incorrectes. Vérifiez les faits importants.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * Version mini pour affichage inline
 */
export function ConfidenceBadge({ confidence }: { confidence: ConfidenceScore }) {
  const display = getConfidenceDisplay(confidence.score);
  const percentage = Math.round(confidence.score * 100);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-xs cursor-help">
            <span>{display.icon}</span>
            <span className={display.textColor}>{percentage}%</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{confidence.reasoning}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
