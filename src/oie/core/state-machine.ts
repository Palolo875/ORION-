/**
 * Machine à états pour l'OIE (Orion Inference Engine)
 * Utilise XState pour gérer le cycle de vie de l'inférence de manière prédictible
 */

import { createMachine, assign, StateFrom, EventFrom } from 'xstate';
import { debugLogger } from '../utils/debug-logger';

/**
 * Contexte de la machine à états
 */
export interface OIEContext {
  query: string;
  agentId?: string;
  confidence?: number;
  output?: string;
  error?: Error;
  startTime?: number;
  routingTime?: number;
  loadingTime?: number;
  inferenceTime?: number;
  options?: unknown;
  attempts?: number;
}

/**
 * Événements de la machine à états
 */
export type OIEEvent =
  | { type: 'START_INFERENCE'; query: string; options?: unknown }
  | { type: 'ROUTING_COMPLETE'; agentId: string; confidence: number }
  | { type: 'ROUTING_FAILED'; error: Error }
  | { type: 'AGENT_LOADED'; agentId: string }
  | { type: 'AGENT_LOAD_FAILED'; error: Error }
  | { type: 'INFERENCE_COMPLETE'; output: string; confidence: number }
  | { type: 'INFERENCE_FAILED'; error: Error }
  | { type: 'RETRY' }
  | { type: 'USE_FALLBACK' }
  | { type: 'CANCEL' }
  | { type: 'RESET' };

/**
 * États possibles de l'OIE
 */
export type OIEState =
  | 'idle'
  | 'validating'
  | 'routing'
  | 'loading_agent'
  | 'inferencing'
  | 'streaming_response'
  | 'success'
  | 'error'
  | 'fallback'
  | 'cancelled';

/**
 * Machine à états XState pour l'OIE
 */
export const oieMachine = createMachine(
  {
    /** @xstate-layout N8IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOgEkwAnAYgGUBRAJQG0AGAXUVAAcB7WVAA9EAWgCMAZgCsANgAcADnEBOAOy8pAGghaIATlUBWCQGZxqhbOWrZygL7mjqdFlwFiZKvRbZ8hUlQQ+rRYuATE5FQMjCzsnDwIgmIScooSWtqyOjIyCWYWaBjYeISklOiUUDh4ALbA3GB0jCzsAO4UEIQqTc5ujh7evrT+gSGhEVEx8UmspBTUdIwsHNx8ySKZ2XK5qgIy4qoysoiVCrKyPaq1quW1ZqgWVjb2Tk6u7p4+foHBdEPh0VRcWIGE+f2+gMy2VyBWKpT0qj01UQjVUilUfX6qhkSlkcn6KxM60QGwc206B2OJzO7kuNxudy03xCdEY9CoD1EonCJABvw+AMyfKy+QAwgkDCDIuDIpDodD0LCilk9FJOtlysSNNI0QpVOV8US5HdKTYVrYDrY7I5nN19mdjqdacEIn1goQvnzxUL-gDgaLwaK5RLZLKkTk0XkMSNtJj1mMsQq5E1lQ0Nc0jipWooGjUZG1xqp8fSjoyPAAtACCAEUANKkACqADEAIoARQAyq36YOW8OQcq8uoNI0scW+sbAa0A */
    id: 'oie',
    
    initial: 'idle',
    
    context: {
      query: '',
      attempts: 0,
    } as OIEContext,
    
    states: {
      idle: {
        on: {
          START_INFERENCE: {
            target: 'validating',
            actions: ['resetContext', 'setQuery', 'recordStartTime'],
          },
        },
      },
      
      validating: {
        entry: 'logValidating',
        always: [
          {
            target: 'routing',
            cond: 'isQueryValid',
          },
          {
            target: 'error',
            actions: 'setValidationError',
          },
        ],
      },
      
      routing: {
        entry: 'logRouting',
        on: {
          ROUTING_COMPLETE: {
            target: 'loading_agent',
            actions: ['setAgent', 'recordRoutingTime'],
          },
          ROUTING_FAILED: {
            target: 'error',
            actions: 'setError',
          },
          CANCEL: 'cancelled',
        },
      },
      
      loading_agent: {
        entry: 'logLoadingAgent',
        on: {
          AGENT_LOADED: {
            target: 'inferencing',
            actions: 'recordLoadingTime',
          },
          AGENT_LOAD_FAILED: [
            {
              target: 'loading_agent',
              cond: 'canRetry',
              actions: ['incrementAttempts', 'logRetry'],
            },
            {
              target: 'fallback',
              actions: 'setError',
            },
          ],
          CANCEL: 'cancelled',
        },
      },
      
      inferencing: {
        entry: 'logInferencing',
        on: {
          INFERENCE_COMPLETE: {
            target: 'success',
            actions: ['setOutput', 'recordInferenceTime'],
          },
          INFERENCE_FAILED: [
            {
              target: 'inferencing',
              cond: 'canRetry',
              actions: ['incrementAttempts', 'logRetry'],
            },
            {
              target: 'fallback',
              actions: 'setError',
            },
          ],
          CANCEL: 'cancelled',
        },
      },
      
      fallback: {
        entry: 'logFallback',
        on: {
          USE_FALLBACK: {
            target: 'loading_agent',
            actions: 'setFallbackAgent',
          },
          RETRY: {
            target: 'routing',
            actions: 'resetAttempts',
          },
          CANCEL: 'cancelled',
        },
      },
      
      success: {
        entry: 'logSuccess',
        on: {
          RESET: 'idle',
          START_INFERENCE: {
            target: 'validating',
            actions: ['resetContext', 'setQuery', 'recordStartTime'],
          },
        },
      },
      
      error: {
        entry: 'logError',
        on: {
          RETRY: {
            target: 'routing',
            actions: 'resetAttempts',
          },
          RESET: 'idle',
        },
      },
      
      cancelled: {
        entry: 'logCancelled',
        on: {
          RESET: 'idle',
        },
      },
    },
  },
  {
    actions: {
      resetContext: assign({
        query: '',
        agentId: undefined,
        confidence: undefined,
        output: undefined,
        error: undefined,
        startTime: undefined,
        routingTime: undefined,
        loadingTime: undefined,
        inferenceTime: undefined,
        attempts: 0,
      }),
      
      setQuery: assign({
        query: ({ event }) => {
          if (event.type === 'START_INFERENCE') {
            return event.query;
          }
          return '';
        },
        options: ({ event }) => {
          if (event.type === 'START_INFERENCE') {
            return event.options;
          }
          return undefined;
        },
      }),
      
      recordStartTime: assign({
        startTime: () => performance.now(),
      }),
      
      setAgent: assign({
        agentId: ({ event }) => {
          if (event.type === 'ROUTING_COMPLETE') {
            return event.agentId;
          }
          return undefined;
        },
        confidence: ({ event }) => {
          if (event.type === 'ROUTING_COMPLETE') {
            return event.confidence;
          }
          return undefined;
        },
      }),
      
      recordRoutingTime: assign({
        routingTime: ({ context }) => {
          if (context.startTime) {
            return performance.now() - context.startTime;
          }
          return undefined;
        },
      }),
      
      recordLoadingTime: assign({
        loadingTime: ({ context }) => {
          if (context.startTime && context.routingTime) {
            return performance.now() - context.startTime - context.routingTime;
          }
          return undefined;
        },
      }),
      
      recordInferenceTime: assign({
        inferenceTime: ({ context }) => {
          if (context.startTime && context.routingTime && context.loadingTime) {
            return performance.now() - context.startTime - context.routingTime - context.loadingTime;
          }
          return undefined;
        },
      }),
      
      setOutput: assign({
        output: ({ event }) => {
          if (event.type === 'INFERENCE_COMPLETE') {
            return event.output;
          }
          return undefined;
        },
        confidence: ({ event }) => {
          if (event.type === 'INFERENCE_COMPLETE') {
            return event.confidence;
          }
          return undefined;
        },
      }),
      
      setError: assign({
        error: ({ event }) => {
          if ('error' in event) {
            return event.error;
          }
          return undefined;
        },
      }),
      
      setValidationError: assign({
        error: () => new Error('Invalid query'),
      }),
      
      incrementAttempts: assign({
        attempts: ({ context }) => (context.attempts || 0) + 1,
      }),
      
      resetAttempts: assign({
        attempts: 0,
      }),
      
      setFallbackAgent: assign({
        agentId: () => 'conversation-agent',
        attempts: 0,
      }),
      
      logValidating: ({ context }) => {
        debugLogger.debug('OIE-StateMachine', 'État: Validation', { query: context.query });
      },
      
      logRouting: ({ context }) => {
        debugLogger.debug('OIE-StateMachine', 'État: Routage', { query: context.query });
      },
      
      logLoadingAgent: ({ context }) => {
        debugLogger.debug('OIE-StateMachine', 'État: Chargement agent', { agentId: context.agentId });
      },
      
      logInferencing: ({ context }) => {
        debugLogger.debug('OIE-StateMachine', 'État: Inférence', { agentId: context.agentId });
      },
      
      logFallback: ({ context }) => {
        debugLogger.warn('OIE-StateMachine', 'État: Fallback', { 
          error: context.error?.message,
          attempts: context.attempts 
        });
      },
      
      logSuccess: ({ context }) => {
        const totalTime = context.startTime ? performance.now() - context.startTime : 0;
        debugLogger.info('OIE-StateMachine', 'État: Succès', {
          agentId: context.agentId,
          totalTime: `${totalTime.toFixed(0)}ms`,
          routingTime: context.routingTime ? `${context.routingTime.toFixed(0)}ms` : 'N/A',
          loadingTime: context.loadingTime ? `${context.loadingTime.toFixed(0)}ms` : 'N/A',
          inferenceTime: context.inferenceTime ? `${context.inferenceTime.toFixed(0)}ms` : 'N/A',
          confidence: context.confidence,
        });
      },
      
      logError: ({ context }) => {
        debugLogger.error('OIE-StateMachine', 'État: Erreur', {
          error: context.error?.message,
          stack: context.error?.stack,
          query: context.query.substring(0, 100),
        });
      },
      
      logCancelled: ({ context }) => {
        debugLogger.warn('OIE-StateMachine', 'État: Annulé', { query: context.query });
      },
      
      logRetry: ({ context }) => {
        debugLogger.warn('OIE-StateMachine', 'Nouvelle tentative', {
          attempts: context.attempts,
          error: context.error?.message,
        });
      },
    },
    
    guards: {
      isQueryValid: ({ context }) => {
        return context.query && context.query.trim().length > 0;
      },
      
      canRetry: ({ context }) => {
        return (context.attempts || 0) < 3;
      },
    },
  }
);

/**
 * Types exportés pour utilisation externe
 */
export type OIEMachineState = StateFrom<typeof oieMachine>;
export type OIEMachineEvent = EventFrom<typeof oieMachine>;

/**
 * Helper pour obtenir le nom de l'état actuel
 */
export function getStateName(state: OIEMachineState): OIEState {
  return state.value as OIEState;
}

/**
 * Helper pour vérifier si la machine est dans un état terminal
 */
export function isTerminalState(state: OIEMachineState): boolean {
  const stateName = getStateName(state);
  return ['success', 'error', 'cancelled'].includes(stateName);
}

/**
 * Helper pour vérifier si la machine est occupée
 */
export function isBusyState(state: OIEMachineState): boolean {
  const stateName = getStateName(state);
  return ['validating', 'routing', 'loading_agent', 'inferencing'].includes(stateName);
}

/**
 * Helper pour obtenir la progression en pourcentage
 */
export function getProgress(state: OIEMachineState): number {
  const stateName = getStateName(state);
  const progressMap: Record<OIEState, number> = {
    idle: 0,
    validating: 10,
    routing: 25,
    loading_agent: 50,
    inferencing: 75,
    streaming_response: 90,
    success: 100,
    error: 0,
    fallback: 50,
    cancelled: 0,
  };
  return progressMap[stateName] || 0;
}
