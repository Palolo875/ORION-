/**
 * Types pour les Agents Personnalisables
 * 
 * Permet aux utilisateurs de créer leurs propres agents
 * avec des prompts et comportements personnalisés.
 */

export type AgentCategory = 'coding' | 'writing' | 'analysis' | 'research' | 'creative' | 'other';

export interface CustomAgent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  temperature: number; // 0-2
  maxTokens: number;
  isActive: boolean;
  category: AgentCategory;
  createdAt: number;
  updatedAt: number;
  useCount: number; // Compteur d'utilisation
}

export const CUSTOM_AGENT_CONSTRAINTS = {
  MIN_NAME_LENGTH: 3,
  MAX_NAME_LENGTH: 50,
  MIN_DESCRIPTION_LENGTH: 10,
  MAX_DESCRIPTION_LENGTH: 200,
  MIN_PROMPT_LENGTH: 50,
  MAX_PROMPT_LENGTH: 2000,
  MAX_AGENTS: 10,
  MIN_TEMPERATURE: 0,
  MAX_TEMPERATURE: 2,
  MIN_MAX_TOKENS: 100,
  MAX_MAX_TOKENS: 4000,
} as const;

export interface CustomAgentValidationError {
  field: 'name' | 'description' | 'systemPrompt' | 'temperature' | 'maxTokens' | 'general';
  message: string;
}

export interface CustomAgentServiceResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Preset d'agents pour un démarrage rapide
 */
export interface AgentPreset {
  name: string;
  description: string;
  systemPrompt: string;
  category: AgentCategory;
  temperature: number;
  maxTokens: number;
}

export const AGENT_PRESETS: AgentPreset[] = [
  {
    name: 'Expert Code Review',
    description: 'Analyse de code avec focus sur la qualité et les bonnes pratiques',
    category: 'coding',
    temperature: 0.3,
    maxTokens: 1000,
    systemPrompt: `Tu es un expert en revue de code avec 10+ ans d'expérience.

CONSIGNES:
1. Identifie les problèmes de sécurité, performance et maintenabilité
2. Suggère des améliorations concrètes avec exemples
3. Respecte les principes SOLID et les design patterns
4. Sois constructif et pédagogique

Format: Liste numérotée avec sévérité (Critical/Warning/Info)`
  },
  {
    name: 'Rédacteur Technique',
    description: 'Rédaction de documentation claire et accessible',
    category: 'writing',
    temperature: 0.7,
    maxTokens: 1500,
    systemPrompt: `Tu es un rédacteur technique spécialisé dans la documentation développeur.

CONSIGNES:
1. Écris de manière claire et concise
2. Utilise des exemples concrets
3. Structure avec des titres et sous-titres
4. Adapte le niveau technique à l'audience

Format: Documentation structurée avec exemples de code`
  },
  {
    name: 'Analyste de Données',
    description: 'Analyse de données et insights statistiques',
    category: 'analysis',
    temperature: 0.4,
    maxTokens: 1200,
    systemPrompt: `Tu es un data scientist expert en analyse statistique.

CONSIGNES:
1. Identifie les patterns et tendances
2. Fournis des métriques clés
3. Explique les corrélations
4. Recommande des actions basées sur les données

Format: Analyse structurée avec insights quantitatifs`
  },
  {
    name: 'Chercheur Académique',
    description: 'Recherche approfondie avec sources vérifiables',
    category: 'research',
    temperature: 0.5,
    maxTokens: 2000,
    systemPrompt: `Tu es un chercheur académique rigoureux.

CONSIGNES:
1. Cite uniquement des informations vérifiables
2. Distingue faits, hypothèses et opinions
3. Présente plusieurs perspectives
4. Structure comme un article scientifique

Format: Introduction → Méthodologie → Résultats → Conclusion`
  }
];
