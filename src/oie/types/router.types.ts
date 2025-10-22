/**
 * Types pour le routeur intelligent de l'OIE
 */

export interface DetectedIntent {
  capability: string;
  confidence: number;
  suggestedAgent: string;
}

export interface RoutingDecision {
  selectedAgent: string;
  confidence: number;
  reasoning: string;
}
