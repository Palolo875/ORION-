/**
 * Panneau de gestion du cache des modèles
 * Permet de voir et nettoyer les modèles en cache
 */

import { useState, useEffect } from "react";
import { Trash2, RefreshCw, HardDrive, Calendar, Download, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { cacheManager, CacheStats } from "@/utils/cacheManager";
import { formatBytes } from "@/config/models";
import { cn } from "@/lib/utils";

export const CacheManagementPanel = () => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const cacheStats = await cacheManager.getStats();
      setStats(cacheStats);
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanupOld = async () => {
    setIsCleaning(true);
    try {
      const result = await cacheManager.cleanupOldModels(30); // 30 jours
      console.log('Nettoyage terminé:', result);
      await loadStats(); // Recharger les stats
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
    } finally {
      setIsCleaning(false);
    }
  };

  const handleCleanupLeastUsed = async () => {
    if (!stats) return;
    
    setIsCleaning(true);
    try {
      // Libérer 2GB d'espace
      const result = await cacheManager.cleanupLeastUsed(2 * 1024 * 1024 * 1024);
      console.log('Nettoyage terminé:', result);
      await loadStats();
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
    } finally {
      setIsCleaning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Impossible de charger les statistiques</AlertTitle>
        <AlertDescription>
          Réessayez plus tard ou videz le cache du navigateur.
        </AlertDescription>
      </Alert>
    );
  }

  const usageColor = stats.usagePercent > 80 ? 'text-red-600' : 
                      stats.usagePercent > 60 ? 'text-yellow-600' : 'text-green-600';

  return (
    <div className="space-y-4">
      {/* Vue d'ensemble */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Utilisation du Stockage
          </h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadStats}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Barre de progression */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Stockage utilisé</span>
            <span className={cn("font-mono font-bold", usageColor)}>
              {stats.usagePercent.toFixed(1)}%
            </span>
          </div>
          <Progress value={stats.usagePercent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatBytes(stats.availableSpace)} disponible</span>
            <span>{stats.totalModels} modèle(s) en cache</span>
          </div>
        </div>

        {/* Alerte si espace faible */}
        {stats.usagePercent > 80 && (
          <Alert variant="destructive" className="mt-3">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Stockage Critique</AlertTitle>
            <AlertDescription className="text-sm">
              Votre stockage est à {stats.usagePercent.toFixed(0)}%. 
              Libérez de l'espace pour éviter les problèmes de téléchargement.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Statistiques des modèles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="glass rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HardDrive className="h-4 w-4" />
            <span>Taille Totale des Modèles</span>
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatBytes(stats.totalSize)}
          </div>
        </div>

        <div className="glass rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Download className="h-4 w-4" />
            <span>Modèles en Cache</span>
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.totalModels}
          </div>
        </div>
      </div>

      {/* Modèle le moins utilisé */}
      {stats.leastUsedModel && (
        <div className="glass rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Modèle le Moins Utilisé</span>
            <Badge variant="outline" className="text-xs">
              {stats.leastUsedModel.downloads} utilisation(s)
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{stats.leastUsedModel.modelName}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(stats.leastUsedModel.size)} • 
                Dernière utilisation: {new Date(stats.leastUsedModel.lastUsed).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions de nettoyage */}
      <div className="glass rounded-xl p-4 space-y-3">
        <h4 className="font-semibold text-sm">Actions de Nettoyage</h4>
        
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleCleanupOld}
            disabled={isCleaning || stats.totalModels === 0}
          >
            <Calendar className="h-4 w-4" />
            Supprimer les modèles anciens (30+ jours)
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleCleanupLeastUsed}
            disabled={isCleaning || stats.totalModels === 0}
          >
            <Trash2 className="h-4 w-4" />
            Libérer 2GB (modèles peu utilisés)
          </Button>

          {isCleaning && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Nettoyage en cours...</span>
            </div>
          )}
        </div>
      </div>

      {/* Conseils */}
      <Alert className="border-blue-500/50 bg-blue-500/5">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-700 dark:text-blue-500">
          💡 Conseils de Gestion
        </AlertTitle>
        <AlertDescription className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
          <p>• Les modèles sont automatiquement mis en cache pour un accès rapide</p>
          <p>• Supprimez les anciens modèles que vous n'utilisez plus</p>
          <p>• Gardez au moins 2-3GB d'espace libre pour de meilleures performances</p>
          <p>• Le nettoyage n'affecte pas les modèles récemment utilisés</p>
        </AlertDescription>
      </Alert>
    </div>
  );
};
