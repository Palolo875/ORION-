// src/components/MemoryMonitorWidget.tsx

/**
 * Widget de monitoring mémoire pour le développement et le debug
 * Affiche en temps réel l'utilisation mémoire et les alertes
 */

import React from 'react';
import { useMemoryMonitoring, useMemoryAlerts } from '../hooks/useMemoryMonitoring';
import { formatBytes } from '../utils/performance/memoryMonitor';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';

interface MemoryMonitorWidgetProps {
  compact?: boolean;
  showDetails?: boolean;
}

export function MemoryMonitorWidget({ 
  compact = false, 
  showDetails = true 
}: MemoryMonitorWidgetProps) {
  const { stats, pressure, isHealthy, needsAttention, isCritical } = useMemoryMonitoring();
  const { alerts, hasAlerts } = useMemoryAlerts();

  if (!stats) {
    return null;
  }

  const getPressureColor = () => {
    if (isCritical) return 'bg-red-500';
    if (needsAttention) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getPressureBadgeVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (isCritical) return 'destructive';
    if (needsAttention) return 'secondary';
    return 'default';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${getPressureColor()}`} />
          <span className="font-medium">{stats.usagePercent.toFixed(0)}%</span>
        </div>
        {hasAlerts && (
          <Badge variant="destructive" className="text-xs">
            {alerts.length}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Mémoire</span>
          <Badge variant={getPressureBadgeVariant()}>
            {pressure.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barre de progression */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Utilisation JS Heap</span>
            <span className="font-medium">{stats.usagePercent.toFixed(1)}%</span>
          </div>
          <Progress 
            value={stats.usagePercent} 
            className={`h-2 ${isCritical ? 'bg-red-100' : needsAttention ? 'bg-orange-100' : 'bg-green-100'}`}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatBytes(stats.usedMemory)}</span>
            <span>{formatBytes(stats.totalMemory)}</span>
          </div>
        </div>

        {/* Détails */}
        {showDetails && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modèles chargés</span>
              <span className="font-medium">{stats.loadedModels}</span>
            </div>
          </div>
        )}

        {/* Alertes */}
        {hasAlerts && (
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <Alert key={index} variant={isCritical ? "destructive" : "default"}>
                <AlertDescription className="text-xs">
                  {alert}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Recommandations */}
        {showDetails && stats.recommendations.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Recommandations</div>
            <ul className="text-xs text-muted-foreground space-y-1">
              {stats.recommendations.slice(0, 3).map((rec, index) => (
                <li key={index}>• {rec}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Version minimale pour la barre de statut
 */
export function MemoryStatusIndicator() {
  const { pressure, stats } = useMemoryMonitoring();

  if (!stats) return null;

  const getColor = () => {
    if (pressure === 'critical') return 'text-red-500';
    if (pressure === 'high') return 'text-orange-500';
    if (pressure === 'medium') return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className={`flex items-center gap-1 text-xs ${getColor()}`}>
      <span className="font-mono">{stats.usagePercent.toFixed(0)}%</span>
    </div>
  );
}
