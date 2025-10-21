// src/components/ModelLoader.tsx

import { useEffect, useState } from 'react';
import { Brain, Download, Zap, Clock } from 'lucide-react';
import { Progress } from './ui/progress';
import { formatBytes, formatTime } from '@/config/models';
import { useStorageMonitor } from '@/hooks/useStorageMonitor';
import { StorageAlert } from './StorageAlert';

interface LoadingState {
  stage: 'downloading' | 'loading' | 'ready';
  progress: number;
  loaded: number;
  total: number;
  text?: string;
}

interface ModelLoaderProps {
  modelName: string;
  modelSize: number;
  onProgress?: (progress: LoadingState) => void;
}

export const ModelLoader = ({ modelName, modelSize, onProgress }: ModelLoaderProps) => {
  const [state, setState] = useState<LoadingState>({
    stage: 'downloading',
    progress: 0,
    loaded: 0,
    total: modelSize,
  });

  const [startTime] = useState(Date.now());
  const [eta, setEta] = useState<number | null>(null);
  const [storageChecked, setStorageChecked] = useState(false);
  const [showStorageWarning, setShowStorageWarning] = useState(false);
  const [downloadSpeed, setDownloadSpeed] = useState<number>(0);
  const [currentTip, setCurrentTip] = useState<string>("");

  // Hook de monitoring du stockage
  const {
    storageWarning,
    canLoadModel,
    clearCaches,
    formatBytes: formatStorageBytes,
  } = useStorageMonitor();

  useEffect(() => {
    // Calculer l'ETA et la vitesse basés sur la progression
    if (state.loaded > 0 && state.total > 0) {
      const elapsedTime = (Date.now() - startTime) / 1000; // en secondes
      const speed = state.loaded / elapsedTime; // bytes par seconde
      setDownloadSpeed(speed);
      const remainingBytes = state.total - state.loaded;
      const estimatedSeconds = remainingBytes / speed;
      setEta(estimatedSeconds);
    }
  }, [state.loaded, state.total, startTime]);

  // Rotation des astuces toutes les 5 secondes
  useEffect(() => {
    const tips = [
      "💡 Le modèle sera mis en cache. Les prochains chargements seront instantanés !",
      "🔒 Tout reste dans votre navigateur. Vos données sont 100% privées.",
      "⚡ ORION fonctionne entièrement hors ligne une fois le modèle chargé.",
      "🧠 Le modèle utilise WebGPU pour des performances optimales.",
      "🌍 Aucune donnée n'est envoyée à des serveurs externes.",
      "🚀 Les modèles sont optimisés pour fonctionner dans votre navigateur.",
      "💾 Le cache utilise IndexedDB pour un stockage persistant.",
      "🎯 Changez de modèle à tout moment dans les paramètres.",
    ];
    
    setCurrentTip(tips[Math.floor(Math.random() * tips.length)]);
    
    const interval = setInterval(() => {
      setCurrentTip(tips[Math.floor(Math.random() * tips.length)]);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    onProgress?.(state);
  }, [state, onProgress]);

  // Vérifier le stockage avant de charger le modèle
  useEffect(() => {
    const checkStorageBeforeLoad = async () => {
      if (!storageChecked && modelSize > 0) {
        const warning = await canLoadModel(modelSize);
        setStorageChecked(true);
        
        // Afficher l'avertissement si niveau warning ou critical
        if (warning.level === 'warning' || warning.level === 'critical') {
          setShowStorageWarning(true);
        }
      }
    };

    checkStorageBeforeLoad();
  }, [modelSize, storageChecked, canLoadModel]);

  // Gérer le nettoyage du cache
  const handleClearCache = async () => {
    const freedSpace = await clearCaches();
    console.log(`Cache vidé : ${formatStorageBytes(freedSpace)} libérés`);
    setShowStorageWarning(false);
    // Re-vérifier le stockage
    setStorageChecked(false);
  };

  const handleDismissWarning = () => {
    setShowStorageWarning(false);
  };

  const getStageLabel = () => {
    switch (state.stage) {
      case 'downloading':
        return 'Téléchargement du modèle...';
      case 'loading':
        return 'Chargement en mémoire...';
      case 'ready':
        return 'Prêt !';
      default:
        return 'Initialisation...';
    }
  };

  const getProgressColor = () => {
    if (state.progress < 30) return 'from-blue-500 to-cyan-500';
    if (state.progress < 60) return 'from-cyan-500 to-green-500';
    if (state.progress < 90) return 'from-green-500 to-yellow-500';
    return 'from-yellow-500 to-green-600';
  };

  const getStageEmoji = () => {
    switch (state.stage) {
      case 'downloading': return '📥';
      case 'loading': return '⚙️';
      case 'ready': return '✅';
      default: return '⏳';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 glass-subtle">
      <div className="max-w-md w-full space-y-6 glass rounded-3xl p-8 border border-[hsl(var(--glass-border))]">
        {/* Alerte de stockage */}
        {showStorageWarning && storageWarning && (
          <StorageAlert
            warning={storageWarning}
            onClearCache={handleClearCache}
            onDismiss={storageWarning.canProceed ? handleDismissWarning : undefined}
            showActions={true}
          />
        )}

        {/* Icon animé */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="relative bg-gradient-to-br from-primary/20 to-accent/20 rounded-full p-6">
              <Brain className="h-12 w-12 text-primary animate-pulse" />
            </div>
          </div>
        </div>

        {/* Titre */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold">Chargement du cerveau d'ORION</h2>
          <p className="text-sm text-muted-foreground">
            Modèle : {modelName}
          </p>
        </div>

        {/* Barre de progression améliorée */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium flex items-center gap-2">
              <span className="text-xl">{getStageEmoji()}</span>
              {getStageLabel()}
            </span>
            <span className="text-muted-foreground font-mono text-lg font-bold">{state.progress.toFixed(1)}%</span>
          </div>
          
          {/* Barre de progression avec gradient animé */}
          <div className="relative h-4 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${getProgressColor()} transition-all duration-300 ease-out relative`}
              style={{ width: `${state.progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-shimmer" />
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" />
              <span>
                {formatBytes(state.loaded)} / {formatBytes(state.total)}
              </span>
            </div>
            {eta !== null && eta > 0 && eta < 3600 && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>~{formatTime(eta)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Statistiques */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass rounded-xl p-3 text-center border border-primary/10 hover:border-primary/30 transition-colors">
            <div className="text-xs text-muted-foreground mb-1">Vitesse</div>
            <div className="text-sm font-bold flex items-center justify-center gap-1 text-primary">
              <Zap className="h-4 w-4 animate-pulse" />
              {downloadSpeed > 0 
                ? formatBytes(downloadSpeed) + '/s'
                : '0 B/s'
              }
            </div>
          </div>
          
          <div className="glass rounded-xl p-3 text-center border border-blue-500/10 hover:border-blue-500/30 transition-colors">
            <div className="text-xs text-muted-foreground mb-1">Taille</div>
            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {formatBytes(modelSize)}
            </div>
          </div>
          
          <div className="glass rounded-xl p-3 text-center border border-green-500/10 hover:border-green-500/30 transition-colors">
            <div className="text-xs text-muted-foreground mb-1">Cache</div>
            <div className="text-sm font-bold text-green-600 dark:text-green-400">
              ✓ Actif
            </div>
          </div>
          
          <div className="glass rounded-xl p-3 text-center border border-yellow-500/10 hover:border-yellow-500/30 transition-colors">
            <div className="text-xs text-muted-foreground mb-1">ETA</div>
            <div className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
              {eta !== null && eta > 0 && eta < 3600 
                ? formatTime(eta)
                : '--'
              }
            </div>
          </div>
        </div>

        {/* Astuce avec animation */}
        <div className="glass-subtle rounded-xl p-4 text-sm text-muted-foreground border border-primary/10 animate-fade-in">
          <div key={currentTip} className="animate-fade-in">
            {currentTip}
          </div>
        </div>
        
        {/* Progression détaillée */}
        <div className="glass rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Téléchargé</span>
            <span className="font-mono font-medium">{formatBytes(state.loaded)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Restant</span>
            <span className="font-mono font-medium">{formatBytes(state.total - state.loaded)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Total</span>
            <span className="font-mono font-medium">{formatBytes(state.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
