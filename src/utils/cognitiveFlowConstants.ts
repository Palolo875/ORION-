/**
 * Cognitive Flow Constants
 * Types et constantes pour le flux cognitif - séparées du composant pour éviter les warnings React-Refresh
 */

export type FlowStep = 
  | 'query' 
  | 'tool_search' 
  | 'memory_search' 
  | 'llm_reasoning' 
  | 'final_response' 
  | 'idle' 
  | 'multi_agent_critical' 
  | 'multi_agent_synthesis';
