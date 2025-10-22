/**
 * Panneau de paramètres de sécurité et monitoring pour ORION
 */

import React, { useState, useEffect } from 'react';
import { Shield, Activity, Zap, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { promptGuardrails } from '../utils/security/promptGuardrails';
import { circuitBreakerManager } from '../utils/resilience/circuitBreaker';
import { requestQueue } from '../utils/resilience/requestQueue';
import { predictiveLoader } from '../utils/performance/predictiveLoader';
import { telemetry } from '../utils/monitoring/telemetry';

interface SecuritySettingsProps {
  onClose?: () => void;
}

export function SecuritySettings({ onClose }: SecuritySettingsProps) {
  const [guardrailsEnabled, setGuardrailsEnabled] = useState(true);
  const [strictMode, setStrictMode] = useState(true);
  const [telemetryEnabled, setTelemetryEnabled] = useState(false);
  const [predictiveLoadingEnabled, setPredictiveLoadingEnabled] = useState(true);
  const [circuitBreakerStats, setCircuitBreakerStats] = useState<any>(null);
  const [queueStats, setQueueStats] = useState<any>(null);

  // Charger les préférences au montage
  useEffect(() => {
    try {
      const telemetryPref = localStorage.getItem('orion:telemetry') === 'enabled';
      setTelemetryEnabled(telemetryPref);
    } catch (error) {
      console.warn('Could not load telemetry preference');
    }
  }, []);

  // Mettre à jour les stats toutes les 5 secondes
  useEffect(() => {
    const updateStats = () => {
      const cbStats = circuitBreakerManager.getAllStats();
      const summary = circuitBreakerManager.getHealthSummary();
      setCircuitBreakerStats(summary);
      
      const qStats = requestQueue.getStats();
      setQueueStats(qStats);
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleGuardrailsToggle = (enabled: boolean) => {
    setGuardrailsEnabled(enabled);
    promptGuardrails.setEnabled(enabled);
  };

  const handleStrictModeToggle = (enabled: boolean) => {
    setStrictMode(enabled);
    promptGuardrails.setStrictMode(enabled);
  };

  const handleTelemetryToggle = (enabled: boolean) => {
    setTelemetryEnabled(enabled);
    telemetry.setEnabled(enabled);
  };

  const handlePredictiveLoadingToggle = (enabled: boolean) => {
    setPredictiveLoadingEnabled(enabled);
    predictiveLoader.setEnabled(enabled);
  };

  const handleResetCircuitBreakers = () => {
    circuitBreakerManager.resetAll();
    alert('Tous les circuit breakers ont été réinitialisés');
  };

  const handleClearQueue = () => {
    requestQueue.clear();
    alert('La file d\'attente a été vidée');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sécurité & Performance</h2>
          <p className="text-muted-foreground">
            Configurez les systèmes de protection et d'optimisation d'ORION
          </p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        )}
      </div>

      <Separator />

      {/* Section Sécurité */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Opération Bouclier d'Orion</CardTitle>
          </div>
          <CardDescription>
            Protection contre les injections de prompt et les contenus malveillants
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="guardrails">Guardrails de Sécurité</Label>
              <p className="text-sm text-muted-foreground">
                Détecte et bloque les tentatives d'injection de prompt
              </p>
            </div>
            <Switch
              id="guardrails"
              checked={guardrailsEnabled}
              onCheckedChange={handleGuardrailsToggle}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="strict-mode">Mode Strict</Label>
              <p className="text-sm text-muted-foreground">
                Niveau de protection maximal (peut bloquer plus de requêtes)
              </p>
            </div>
            <Switch
              id="strict-mode"
              checked={strictMode}
              onCheckedChange={handleStrictModeToggle}
              disabled={!guardrailsEnabled}
            />
          </div>

          <div className="rounded-lg bg-muted p-3">
            <div className="flex items-center gap-2 text-sm">
              {guardrailsEnabled ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>
                    Protection active - {strictMode ? 'Mode Strict' : 'Mode Normal'}
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span>Protection désactivée - Non recommandé</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Robustesse */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <CardTitle>Opération Anti-Fragile</CardTitle>
          </div>
          <CardDescription>
            Systèmes de résilience et gestion des pannes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-muted p-3">
              <div className="text-sm text-muted-foreground">Circuits Sains</div>
              <div className="text-2xl font-bold text-green-500">
                {circuitBreakerStats?.healthy || 0}
              </div>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <div className="text-sm text-muted-foreground">Dégradés</div>
              <div className="text-2xl font-bold text-yellow-500">
                {circuitBreakerStats?.degraded || 0}
              </div>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <div className="text-sm text-muted-foreground">Hors Service</div>
              <div className="text-2xl font-bold text-red-500">
                {circuitBreakerStats?.down || 0}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleResetCircuitBreakers}
          >
            Réinitialiser les Circuit Breakers
          </Button>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-2">File d'Attente des Requêtes</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Requêtes actives:</span>
                <Badge variant="default">{queueStats?.activeRequests || 0}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">En attente:</span>
                <Badge variant="secondary">{queueStats?.queuedRequests || 0}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Complétées:</span>
                <Badge variant="outline">{queueStats?.completedRequests || 0}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Temps d'attente moyen:</span>
                <span className="font-medium">
                  {queueStats?.averageWaitTime?.toFixed(0) || 0}ms
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleClearQueue}
            disabled={(queueStats?.queuedRequests || 0) === 0}
          >
            Vider la File d'Attente
          </Button>
        </CardContent>
      </Card>

      {/* Section Performance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            <CardTitle>Opération Vitesse Lumière</CardTitle>
          </div>
          <CardDescription>
            Optimisations et pré-chargement prédictif
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="predictive-loading">Pré-chargement Prédictif</Label>
              <p className="text-sm text-muted-foreground">
                Anticipe et pré-charge les agents probables
              </p>
            </div>
            <Switch
              id="predictive-loading"
              checked={predictiveLoadingEnabled}
              onCheckedChange={handlePredictiveLoadingToggle}
            />
          </div>

          <div className="rounded-lg bg-muted p-3">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-blue-500" />
              <span>
                {predictiveLoadingEnabled
                  ? 'Pré-chargement actif - Performances optimisées'
                  : 'Pré-chargement désactivé - Économie de ressources'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Monitoring */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <CardTitle>Télémétrie & Monitoring</CardTitle>
          </div>
          <CardDescription>
            Collecte anonymisée de données pour améliorer ORION
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="telemetry">Télémétrie Anonymisée</Label>
              <p className="text-sm text-muted-foreground">
                Aucune donnée personnelle n'est collectée
              </p>
            </div>
            <Switch
              id="telemetry"
              checked={telemetryEnabled}
              onCheckedChange={handleTelemetryToggle}
            />
          </div>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Respect de la vie privée:</strong> La télémétrie ne collecte que
              des statistiques d'erreurs et de performance anonymisées. Le contenu de
              vos conversations n'est jamais envoyé.
            </p>
          </div>

          {telemetryEnabled && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Données Collectées:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Types d'erreurs rencontrées (anonymisés)</li>
                <li>Temps de traitement des requêtes</li>
                <li>Utilisation des agents (statistiques)</li>
                <li>Informations système (navigateur, plateforme)</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
