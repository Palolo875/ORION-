// src/workers/orchestrator/ResponseFormatter.ts

/**
 * Response Formatter
 * 
 * Gère le formatage et l'enrichissement des réponses finales.
 * Responsable de l'évaluation de la qualité et de la préparation des métadonnées.
 */

import { FinalResponsePayload, QueryPayload, WorkerMessage } from '../../types';
import { evaluateDebate, evaluateSingleResponse, generateQualityReport, type DebateQuality } from '../../utils/debateQuality';
import { logger } from '../../utils/logger';

export class ResponseFormatter {
  /**
   * Formate une réponse simple (sans débat multi-agents)
   */
  formatSimpleResponse(
    response: string,
    query: QueryPayload,
    memoryHits: string[],
    inferenceTimeMs: number,
    meta: WorkerMessage['meta'] | null
  ): FinalResponsePayload {
    logger.debug('ResponseFormatter', 'Évaluation de la qualité de la réponse simple', undefined, meta?.traceId);
    
    const debateQuality = evaluateSingleResponse({
      response,
      query: query.query
    });
    
    logger.debug('ResponseFormatter', 'Qualité de la réponse', { debateQuality }, meta?.traceId);
    
    if (debateQuality.overallScore < 0.6) {
      logger.warn('ResponseFormatter', 'Qualité de la réponse sous le seuil acceptable (< 60%)', { 
        score: (debateQuality.overallScore * 100).toFixed(0) + '%'
      }, meta?.traceId);
    }

    return {
      response,
      confidence: debateQuality.overallScore,
      provenance: {
        fromAgents: ['LLMAgent'],
        memoryHits,
      },
      debug: {
        inferenceTimeMs,
        debateQuality,
      }
    };
  }

  /**
   * Formate une réponse avec débat multi-agents
   */
  formatMultiAgentResponse(
    response: string,
    debateResponses: { logical?: string; creative?: string; critical?: string },
    memoryHits: string[],
    inferenceTimeMs: number,
    meta: WorkerMessage['meta'] | null
  ): FinalResponsePayload {
    logger.debug('ResponseFormatter', 'Évaluation de la qualité du débat multi-agents', undefined, meta?.traceId);
    
    if (!debateResponses.logical || !debateResponses.creative || !debateResponses.critical) {
      logger.warn('ResponseFormatter', 'Débat incomplet, utilisation du format simple', undefined, meta?.traceId);
      return {
        response,
        confidence: 0.8,
        provenance: {
          fromAgents: ['LLMAgent'],
          memoryHits,
        },
        debug: {
          inferenceTimeMs,
        }
      };
    }

    const debateQuality = evaluateDebate({
      logical: debateResponses.logical,
      creative: debateResponses.creative,
      critical: debateResponses.critical,
      synthesis: response
    });
    
    logger.debug('ResponseFormatter', 'Qualité du débat', { debateQuality }, meta?.traceId);
    
    // Générer un rapport si la qualité est faible
    if (debateQuality.overallScore < 0.6) {
      logger.warn('ResponseFormatter', 'Qualité du débat sous le seuil acceptable (< 60%)', { 
        report: generateQualityReport(debateQuality) 
      }, meta?.traceId);
    }

    return {
      response,
      confidence: debateQuality.overallScore,
      provenance: {
        fromAgents: ['Logical', 'Creative', 'Critical', 'Synthesizer'],
        memoryHits,
      },
      debug: {
        inferenceTimeMs,
        debateQuality,
      }
    };
  }

  /**
   * Formate une réponse d'erreur
   */
  formatErrorResponse(
    errorMessage: string,
    error?: string,
    inferenceTimeMs?: number
  ): FinalResponsePayload {
    return {
      response: errorMessage,
      confidence: 0,
      provenance: { fromAgents: ['ErrorHandler'] },
      debug: { 
        error,
        inferenceTimeMs
      }
    };
  }

  /**
   * Formate une réponse de fallback (dégradation gracieuse)
   */
  formatFallbackResponse(
    message: string,
    confidence: number,
    inferenceTimeMs: number
  ): FinalResponsePayload {
    return {
      response: message,
      confidence,
      provenance: { fromAgents: ['FallbackStrategy'] },
      debug: { inferenceTimeMs }
    };
  }

  /**
   * Évalue la qualité d'une réponse et retourne un score
   */
  evaluateResponseQuality(
    response: string,
    query: string
  ): number {
    const quality = evaluateSingleResponse({ response, query });
    return quality.overallScore;
  }

  /**
   * Génère un rapport de qualité détaillé
   */
  generateQualityReport(debateQuality: DebateQuality): string {
    return generateQualityReport(debateQuality);
  }
}
