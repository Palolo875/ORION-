/**
 * Debate Mode Constants
 * Constantes pour les modes de débat - séparées du composant pour éviter les warnings React-Refresh
 */

export type DebateMode = 'fast' | 'balanced' | 'thorough' | 'custom';

export interface DebateModeConfig {
  name: string;
  icon: string;
  description: string;
  agents: string[];
  estimatedTime: string;
  quality: 'basic' | 'good' | 'excellent' | 'custom';
  color: string;
}

export const DEBATE_MODES: Record<DebateMode, DebateModeConfig> = {
  fast: {
    name: 'Rapide',
    icon: '⚡',
    description: 'Réponse directe avec synthèse uniquement',
    agents: ['synthesizer'],
    estimatedTime: '3-5s',
    quality: 'basic',
    color: 'blue'
  },
  balanced: {
    name: 'Équilibré',
    icon: '⚖️',
    description: 'Débat simplifié (Logique + Synthèse)',
    agents: ['logical', 'synthesizer'],
    estimatedTime: '8-10s',
    quality: 'good',
    color: 'green'
  },
  thorough: {
    name: 'Approfondi',
    icon: '🧠',
    description: 'Débat complet avec tous les agents',
    agents: ['logical', 'creative', 'critical', 'synthesizer'],
    estimatedTime: '14-16s',
    quality: 'excellent',
    color: 'purple'
  },
  custom: {
    name: 'Personnalisé',
    icon: '⚙️',
    description: 'Sélection manuelle des agents',
    agents: [],
    estimatedTime: 'Variable',
    quality: 'custom',
    color: 'gray'
  }
};

export const AVAILABLE_AGENTS = [
  { id: 'logical', name: 'Agent Logique', description: 'Analyse rigoureuse et structurée' },
  { id: 'creative', name: 'Agent Créatif', description: 'Pensée divergente et exploration' },
  { id: 'critical', name: 'Agent Critique', description: 'Analyse sceptique et validation' },
  { id: 'synthesizer', name: 'Synthétiseur', description: 'Synthèse finale équilibrée', required: true }
];
