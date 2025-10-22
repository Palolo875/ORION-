/**
 * Télémétrie anonymisée pour ORION
 * Monitoring respectueux de la vie privée
 */

import { logger } from '../logger';

export interface TelemetryEvent {
  type: 'error' | 'performance' | 'usage' | 'system';
  category: string;
  action: string;
  value?: number;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface ErrorReport {
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  context: string;
  userAgent: string;
  platform: string;
  timestamp: number;
  sessionId: string;
}

export interface PerformanceMetrics {
  metric: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  context?: string;
  timestamp: number;
}

export interface TelemetryConfig {
  enabled: boolean;
  endpoint?: string;
  batchSize: number;
  batchInterval: number; // en ms
  includePerformance: boolean;
  includeErrors: boolean;
  includeUsage: boolean;
  sessionId: string;
}

/**
 * Gestionnaire de télémétrie
 */
export class TelemetryManager {
  private config: TelemetryConfig;
  private eventBuffer: TelemetryEvent[] = [];
  private batchTimer?: number;
  private sessionStartTime: number;

  constructor(config: Partial<TelemetryConfig> = {}) {
    this.sessionStartTime = Date.now();
    
    this.config = {
      enabled: config.enabled ?? false, // Désactivé par défaut (opt-in)
      endpoint: config.endpoint,
      batchSize: config.batchSize ?? 50,
      batchInterval: config.batchInterval ?? 30000, // 30 secondes
      includePerformance: config.includePerformance ?? true,
      includeErrors: config.includeErrors ?? true,
      includeUsage: config.includeUsage ?? true,
      sessionId: config.sessionId ?? this.generateSessionId()
    };

    if (this.config.enabled) {
      this.startBatchTimer();
      logger.info('TelemetryManager', 'Telemetry enabled (anonymized)', {
        sessionId: this.config.sessionId
      });
    }
  }

  /**
   * Active/désactive la télémétrie
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;

    if (enabled) {
      this.startBatchTimer();
      logger.info('TelemetryManager', 'Telemetry enabled by user');
    } else {
      this.stopBatchTimer();
      this.eventBuffer = []; // Vider le buffer
      logger.info('TelemetryManager', 'Telemetry disabled by user');
    }

    // Sauvegarder la préférence
    try {
      localStorage.setItem('orion:telemetry', enabled ? 'enabled' : 'disabled');
    } catch (error) {
      logger.warn('TelemetryManager', 'Could not save telemetry preference');
    }
  }

  /**
   * Enregistre une erreur
   */
  trackError(
    error: Error,
    context: string,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.config.enabled || !this.config.includeErrors) {
      return;
    }

    // Anonymiser le message d'erreur (retirer les données sensibles)
    const anonymizedMessage = this.anonymizeMessage(error.message);
    
    // Anonymiser la stack trace
    const anonymizedStack = this.anonymizeStackTrace(error.stack);

    const event: TelemetryEvent = {
      type: 'error',
      category: 'error',
      action: context,
      metadata: {
        errorType: error.name,
        errorMessage: anonymizedMessage,
        stackTrace: anonymizedStack,
        ...this.sanitizeMetadata(metadata),
        userAgent: navigator.userAgent,
        platform: navigator.platform
      },
      timestamp: Date.now()
    };

    this.addEvent(event);
  }

  /**
   * Enregistre une métrique de performance
   */
  trackPerformance(
    metric: string,
    value: number,
    unit: 'ms' | 'bytes' | 'count' | 'percentage' = 'ms',
    context?: string
  ): void {
    if (!this.config.enabled || !this.config.includePerformance) {
      return;
    }

    const event: TelemetryEvent = {
      type: 'performance',
      category: 'performance',
      action: metric,
      value,
      metadata: {
        unit,
        context
      },
      timestamp: Date.now()
    };

    this.addEvent(event);
  }

  /**
   * Enregistre une action utilisateur
   */
  trackUsage(
    category: string,
    action: string,
    value?: number,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.config.enabled || !this.config.includeUsage) {
      return;
    }

    const event: TelemetryEvent = {
      type: 'usage',
      category,
      action,
      value,
      metadata: this.sanitizeMetadata(metadata),
      timestamp: Date.now()
    };

    this.addEvent(event);
  }

  /**
   * Enregistre des informations système
   */
  trackSystemInfo(): void {
    if (!this.config.enabled) {
      return;
    }

    const systemInfo = this.getSystemInfo();

    const event: TelemetryEvent = {
      type: 'system',
      category: 'system',
      action: 'session_start',
      metadata: systemInfo,
      timestamp: Date.now()
    };

    this.addEvent(event);
  }

  /**
   * Ajoute un événement au buffer
   */
  private addEvent(event: TelemetryEvent): void {
    this.eventBuffer.push(event);

    // Si le buffer est plein, envoyer immédiatement
    if (this.eventBuffer.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Envoie les événements au serveur
   */
  private async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    // Si pas d'endpoint configuré, juste logger localement
    if (!this.config.endpoint) {
      logger.info('TelemetryManager', `[LOCAL] ${events.length} events collected`, {
        eventTypes: this.groupEventsByType(events)
      });
      return;
    }

    try {
      // Envoyer les événements de manière anonyme
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: this.config.sessionId,
          events,
          sessionDuration: Date.now() - this.sessionStartTime
        })
      });

      if (!response.ok) {
        logger.warn('TelemetryManager', 'Failed to send telemetry', {
          status: response.status
        });
      }

    } catch (error) {
      // Échec silencieux pour ne pas perturber l'utilisateur
      logger.warn('TelemetryManager', 'Telemetry send error', error);
    }
  }

  /**
   * Démarre le timer de batch
   */
  private startBatchTimer(): void {
    if (this.batchTimer) {
      return;
    }

    this.batchTimer = window.setInterval(() => {
      this.flush();
    }, this.config.batchInterval);
  }

  /**
   * Arrête le timer de batch
   */
  private stopBatchTimer(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = undefined;
    }
  }

  /**
   * Anonymise un message (retire les données potentiellement sensibles)
   */
  private anonymizeMessage(message: string): string {
    if (!message) return '';

    return message
      // Retirer les chemins de fichiers
      .replace(/[A-Z]:\\[^\s]+/g, '[PATH]')
      .replace(/\/[\w/]+/g, '[PATH]')
      // Retirer les URLs complètes
      .replace(/https?:\/\/[^\s]+/g, '[URL]')
      // Retirer les adresses email
      .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]')
      // Retirer les IPs
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]')
      // Retirer les valeurs numériques longues (potentiellement des IDs)
      .replace(/\b\d{10,}\b/g, '[ID]');
  }

  /**
   * Anonymise une stack trace
   */
  private anonymizeStackTrace(stack?: string): string | undefined {
    if (!stack) return undefined;

    return stack
      // Garder seulement les noms de fichiers, pas les chemins complets
      .split('\n')
      .map(line => {
        // Extraire juste le nom du fichier et le numéro de ligne
        const match = line.match(/at\s+(\w+)\s+\(([^:]+):(\d+):(\d+)\)/);
        if (match) {
          const [, fnName, file, line, col] = match;
          const fileName = file.split('/').pop();
          return `at ${fnName} (${fileName}:${line}:${col})`;
        }
        return line;
      })
      .join('\n');
  }

  /**
   * Nettoie les métadonnées pour retirer les données sensibles
   */
  private sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> {
    if (!metadata) return {};

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata)) {
      // Skip les clés potentiellement sensibles
      if (this.isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      // Anonymiser les valeurs de type string
      if (typeof value === 'string') {
        sanitized[key] = this.anonymizeMessage(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else {
        sanitized[key] = '[COMPLEX_VALUE]';
      }
    }

    return sanitized;
  }

  /**
   * Vérifie si une clé contient des données sensibles
   */
  private isSensitiveKey(key: string): boolean {
    const sensitivePatterns = [
      /password/i,
      /token/i,
      /secret/i,
      /api[_-]?key/i,
      /auth/i,
      /credential/i,
      /user.*name/i,
      /email/i,
      /phone/i,
      /address/i
    ];

    return sensitivePatterns.some(pattern => pattern.test(key));
  }

  /**
   * Obtient des informations système anonymisées
   */
  private getSystemInfo(): Record<string, string | number | boolean> {
    // Navigator avec deviceMemory (non-standard)
    const navWithMemory = navigator as typeof navigator & { deviceMemory?: number };
    
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      memory: navWithMemory.deviceMemory || 'unknown',
      cores: navigator.hardwareConcurrency || 'unknown',
      online: navigator.onLine
    };
  }

  /**
   * Génère un ID de session anonyme
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Groupe les événements par type
   */
  private groupEventsByType(events: TelemetryEvent[]): Record<string, number> {
    const groups: Record<string, number> = {};

    for (const event of events) {
      groups[event.type] = (groups[event.type] || 0) + 1;
    }

    return groups;
  }

  /**
   * Obtient les statistiques de la session
   */
  getSessionStats(): {
    sessionId: string;
    duration: number;
    eventsBuffered: number;
    enabled: boolean;
  } {
    return {
      sessionId: this.config.sessionId,
      duration: Date.now() - this.sessionStartTime,
      eventsBuffered: this.eventBuffer.length,
      enabled: this.config.enabled
    };
  }

  /**
   * Arrête la télémétrie et envoie les événements restants
   */
  async shutdown(): Promise<void> {
    this.stopBatchTimer();
    await this.flush();
    logger.info('TelemetryManager', 'Telemetry shutdown');
  }
}

// Charger la préférence de l'utilisateur
function loadTelemetryPreference(): boolean {
  try {
    const preference = localStorage.getItem('orion:telemetry');
    return preference === 'enabled';
  } catch {
    return false;
  }
}

// Export singleton
export const telemetry = new TelemetryManager({
  enabled: loadTelemetryPreference(),
  batchSize: 50,
  batchInterval: 30000
});

// Nettoyer avant de quitter
window.addEventListener('beforeunload', () => {
  telemetry.shutdown();
});

// Tracker l'info système au démarrage si activé
if (loadTelemetryPreference()) {
  telemetry.trackSystemInfo();
}
