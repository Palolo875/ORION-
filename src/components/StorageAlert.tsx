/**
 * Composant d'alerte pour le stockage
 * 
 * Affiche des alertes lorsque le quota de stockage est dépassé
 * ou approche des limites.
 */

import { AlertTriangle, AlertCircle, Info, Trash2, Database } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { StorageWarning } from '@/utils/browser/storageManager';

interface StorageAlertProps {
  warning: StorageWarning;
  onClearCache?: () => void;
  onDismiss?: () => void;
  showActions?: boolean;
}

export function StorageAlert({ 
  warning, 
  onClearCache, 
  onDismiss,
  showActions = true 
}: StorageAlertProps) {
  const getIcon = () => {
    switch (warning.level) {
      case 'critical':
        return <AlertCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getVariant = () => {
    switch (warning.level) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'default';
      default:
        return 'default';
    }
  };

  const getTitle = () => {
    switch (warning.level) {
      case 'critical':
        return '⚠️ Stockage Critique';
      case 'warning':
        return '⚡ Avertissement Stockage';
      default:
        return 'ℹ️ Information Stockage';
    }
  };

  return (
    <Alert variant={getVariant()} className="mb-4">
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 space-y-2">
          <AlertTitle>{getTitle()}</AlertTitle>
          <AlertDescription className="space-y-2">
            <p className="font-medium">{warning.message}</p>
            <p className="text-sm opacity-90">{warning.recommendation}</p>
          </AlertDescription>
          
          {showActions && (warning.level === 'warning' || warning.level === 'critical') && (
            <div className="flex items-center gap-2 mt-3">
              {onClearCache && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onClearCache}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Vider le cache
                </Button>
              )}
              {onDismiss && warning.canProceed && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDismiss}
                >
                  Continuer quand même
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
}

/**
 * Indicateur compact du statut de stockage
 */
interface StorageIndicatorProps {
  percentage: number;
  usage: number;
  quota: number;
  formatBytes: (bytes: number) => string;
  onClick?: () => void;
}

export function StorageIndicator({ 
  percentage, 
  usage, 
  quota,
  formatBytes,
  onClick 
}: StorageIndicatorProps) {
  const getColor = () => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getBarColor = () => {
    if (percentage >= 90) return 'bg-red-600';
    if (percentage >= 75) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  return (
    <div 
      className="glass rounded-lg p-3 cursor-pointer hover:bg-accent/5 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-2">
        <Database className={`h-4 w-4 ${getColor()}`} />
        <span className="text-sm font-medium">Stockage</span>
        <span className={`text-xs ml-auto ${getColor()}`}>
          {percentage.toFixed(1)}%
        </span>
      </div>
      
      <div className="w-full bg-secondary/20 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full ${getBarColor()} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      
      <div className="text-xs text-muted-foreground mt-1.5">
        {formatBytes(usage)} / {formatBytes(quota)}
      </div>
    </div>
  );
}
