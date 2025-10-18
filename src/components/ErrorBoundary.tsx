// src/components/ErrorBoundary.tsx

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Mettre à jour l'état pour afficher l'interface de secours
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Logger l'erreur pour le débogage
    console.error('🔴 [ErrorBoundary] Crash détecté:', error);
    console.error('🔴 [ErrorBoundary] Stack trace:', errorInfo.componentStack);
    
    // Mettre à jour l'état avec les détails de l'erreur
    this.setState({
      error,
      errorInfo,
    });

    // Optionnel : Envoyer à un service d'analytics/monitoring
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 glass-subtle">
          <div className="max-w-2xl w-full space-y-6 glass rounded-3xl p-8 border border-destructive/20">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="bg-destructive/10 rounded-full p-6">
                <AlertTriangle className="h-16 w-16 text-destructive" />
              </div>
            </div>

            {/* Titre */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold">Oups, quelque chose s'est mal passé</h1>
              <p className="text-lg text-muted-foreground">
                ORION a rencontré une erreur inattendue et a dû s'arrêter.
              </p>
            </div>

            {/* Message d'erreur */}
            {this.state.error && (
              <div className="glass-subtle rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold text-destructive">Détails de l'erreur :</h3>
                <pre className="text-xs text-muted-foreground overflow-auto max-h-32 p-3 bg-muted/30 rounded-lg">
                  {this.state.error.toString()}
                </pre>
              </div>
            )}

            {/* Conseils */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Que faire ?</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Essayez de recharger la page</li>
                <li>Vérifiez votre connexion Internet</li>
                <li>Videz le cache de votre navigateur si le problème persiste</li>
                <li>Assurez-vous d'utiliser un navigateur compatible (Chrome, Edge, Brave)</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={this.handleReload} 
                className="flex-1 gap-2"
                size="lg"
              >
                <RefreshCw className="h-4 w-4" />
                Recharger l'application
              </Button>
              <Button 
                onClick={this.handleGoHome} 
                variant="outline"
                className="flex-1 gap-2"
                size="lg"
              >
                <Home className="h-4 w-4" />
                Retour à l'accueil
              </Button>
            </div>

            {/* Footer */}
            <div className="text-center pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Si le problème persiste, veuillez contacter le support technique.
              </p>
            </div>

            {/* Stack trace (en développement seulement) */}
            {import.meta.env.DEV && this.state.errorInfo && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Afficher la stack trace complète (développement)
                </summary>
                <pre className="mt-2 p-3 bg-muted/30 rounded-lg overflow-auto max-h-64 text-muted-foreground">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
