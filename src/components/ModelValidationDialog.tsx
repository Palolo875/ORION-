/**
 * Dialog de validation avant téléchargement de modèle
 * Affiche les avertissements et recommandations
 */

import { AlertCircle, AlertTriangle, CheckCircle, XCircle, Info, Zap, Clock, HardDrive, Brain } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { cn } from "@/lib/utils";
import { ValidationResult } from "@/utils/modelValidator";
import { formatBytes } from "@/config/models";

interface ModelValidationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  modelName: string;
  modelSize: number;
  validation: ValidationResult | null;
  estimatedTime: number; // en secondes
}

export const ModelValidationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  modelName,
  modelSize,
  validation,
  estimatedTime,
}: ModelValidationDialogProps) => {
  if (!validation) return null;

  const getRiskBadge = () => {
    const config = {
      low: { color: 'bg-green-500', text: 'Risque Faible', icon: CheckCircle },
      medium: { color: 'bg-yellow-500', text: 'Risque Modéré', icon: AlertTriangle },
      high: { color: 'bg-orange-500', text: 'Risque Élevé', icon: AlertCircle },
      critical: { color: 'bg-red-500', text: 'Risque Critique', icon: XCircle },
    };

    const { color, text, icon: Icon } = config[validation.riskLevel];

    return (
      <Badge className={cn("text-white border-0", color)}>
        <Icon className="h-3 w-3 mr-1" />
        {text}
      </Badge>
    );
  };

  const getRiskColor = () => {
    const colors = {
      low: 'border-green-500/50 bg-green-500/5',
      medium: 'border-yellow-500/50 bg-yellow-500/5',
      high: 'border-orange-500/50 bg-orange-500/5',
      critical: 'border-red-500/50 bg-red-500/5',
    };
    return colors[validation.riskLevel];
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Brain className="h-6 w-6 text-primary" />
            Validation du Téléchargement
          </DialogTitle>
          <DialogDescription>
            Vérification des capacités de votre appareil pour {modelName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* En-tête avec badge de risque */}
          <div className={cn("rounded-xl p-4 border-2", getRiskColor())}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg">{modelName}</h3>
                <p className="text-sm text-muted-foreground">
                  Taille: {formatBytes(modelSize)}
                </p>
              </div>
              {getRiskBadge()}
            </div>

            {/* Statistiques rapides */}
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>~{formatTime(estimatedTime)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <HardDrive className="h-4 w-4 text-purple-500" />
                <span>{formatBytes(modelSize)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span>
                  {validation.canLoad ? 'Compatible' : 'Incompatible'}
                </span>
              </div>
            </div>
          </div>

          {/* Erreurs critiques */}
          {validation.errors.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Problèmes Critiques Détectés</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-1">
                  {validation.errors.map((error, i) => (
                    <li key={i} className="text-sm">• {error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Avertissements */}
          {validation.warnings.length > 0 && (
            <Alert className="border-yellow-500/50 bg-yellow-500/5">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-700 dark:text-yellow-500">
                Avertissements
              </AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-1">
                  {validation.warnings.map((warning, i) => (
                    <li key={i} className="text-sm text-yellow-700 dark:text-yellow-400">
                      • {warning}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Recommandations */}
          {validation.recommendations.length > 0 && (
            <Alert className="border-blue-500/50 bg-blue-500/5">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-700 dark:text-blue-500">
                Recommandations
              </AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-1">
                  {validation.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-blue-700 dark:text-blue-400">
                      • {rec}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Message de succès si tout va bien */}
          {validation.canLoad && validation.warnings.length === 0 && (
            <Alert className="border-green-500/50 bg-green-500/5">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-700 dark:text-green-500">
                Prêt à Télécharger
              </AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-400">
                Votre appareil dispose de toutes les capacités nécessaires pour utiliser ce modèle efficacement.
              </AlertDescription>
            </Alert>
          )}

          {/* Barre de progression estimée */}
          {validation.canLoad && estimatedTime > 60 && (
            <div className="space-y-2 p-4 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Temps de téléchargement estimé</span>
                <span className="text-muted-foreground">{formatTime(estimatedTime)}</span>
              </div>
              <Progress value={0} className="h-2" />
              <p className="text-xs text-muted-foreground">
                💡 Le modèle sera mis en cache. Les prochains chargements seront instantanés.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!validation.canLoad}
            className={cn(
              validation.canLoad
                ? "bg-primary hover:bg-primary/90"
                : "opacity-50 cursor-not-allowed"
            )}
          >
            {validation.canLoad ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Télécharger le Modèle
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Incompatible
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
