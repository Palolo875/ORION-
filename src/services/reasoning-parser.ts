/**
 * Parser de Raisonnement Structuré
 * 
 * Extrait les étapes de raisonnement depuis la sortie texte des agents.
 * Supporte plusieurs formats : Markdown, JSON, texte libre.
 */

import type { ReasoningStep, ParsedReasoning, AgentOutput, ReasoningStepType } from '../types/reasoning';
import { REASONING_CONSTRAINTS } from '../types/reasoning';
import { logger } from '../utils/logger';

class ReasoningParser {
  /**
   * Parse la sortie brute d'un agent pour en extraire la structure
   */
  parseAgentOutput(rawOutput: string, agentName: string): AgentOutput | null {
    try {
      // Essayer de détecter et parser selon le format
      let parsed: ParsedReasoning | null = null;
      
      // 1. Essayer JSON d'abord
      parsed = this.parseJSON(rawOutput);
      
      // 2. Si échec, essayer Markdown
      if (!parsed) {
        parsed = this.parseMarkdown(rawOutput);
      }
      
      // 3. Si échec, fallback vers texte libre
      if (!parsed) {
        parsed = this.parseFreeText(rawOutput);
      }
      
      // Valider
      if (!parsed || !this.validateSteps(parsed.steps)) {
        logger.warn('ReasoningParser', 'Validation échouée, utilisation du fallback', { agentName });
        parsed = this.createFallbackParsing(rawOutput);
      }
      
      return {
        agentName,
        steps: parsed.steps,
        conclusion: parsed.conclusion,
        confidence: parsed.confidence,
        metadata: {
          tokenCount: rawOutput.length / 4, // Approximation grossière
          processingTime: 0,
        }
      };
    } catch (error) {
      logger.error('ReasoningParser', 'Erreur lors du parsing', error);
      // Retourner un fallback plutôt que null
      return {
        agentName,
        steps: this.createFallbackSteps(rawOutput),
        conclusion: rawOutput.slice(0, 200),
        confidence: REASONING_CONSTRAINTS.DEFAULT_CONFIDENCE,
        metadata: {}
      };
    }
  }

  /**
   * Tente de parser du JSON
   */
  private parseJSON(text: string): ParsedReasoning | null {
    try {
      // Chercher un bloc JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.steps || !Array.isArray(parsed.steps)) {
        return null;
      }
      
      const steps: ReasoningStep[] = parsed.steps.map((s: any, idx: number) => ({
        id: `step-${idx}`,
        stepNumber: idx + 1,
        type: s.type || 'analysis',
        content: s.content || '',
        tags: s.tags || []
      }));
      
      return {
        steps,
        conclusion: parsed.conclusion || text.slice(-200),
        confidence: parsed.confidence || REASONING_CONSTRAINTS.DEFAULT_CONFIDENCE
      };
    } catch {
      return null;
    }
  }

  /**
   * Parse du Markdown structuré
   */
  private parseMarkdown(text: string): ParsedReasoning | null {
    try {
      const steps: ReasoningStep[] = [];
      let conclusion = '';
      let confidence = REASONING_CONSTRAINTS.DEFAULT_CONFIDENCE;
      
      // Extraire les lignes numérotées (1. 2. 3. etc.)
      const numberedMatches = text.match(/^\d+\.\s+(.+)$/gm);
      if (numberedMatches && numberedMatches.length > 0) {
        numberedMatches.forEach((match, idx) => {
          const content = match.replace(/^\d+\.\s+/, '').trim();
          if (content) {
            steps.push({
              id: `step-${idx}`,
              stepNumber: idx + 1,
              type: this.inferStepType(content, idx),
              content
            });
          }
        });
      }
      
      // Si pas de numérotation, chercher les puces (- ou *)
      if (steps.length === 0) {
        const bulletMatches = text.match(/^[-*]\s+(.+)$/gm);
        if (bulletMatches && bulletMatches.length > 0) {
          bulletMatches.forEach((match, idx) => {
            const content = match.replace(/^[-*]\s+/, '').trim();
            if (content) {
              steps.push({
                id: `step-${idx}`,
                stepNumber: idx + 1,
                type: this.inferStepType(content, idx),
                content
              });
            }
          });
        }
      }
      
      // Extraire la conclusion
      const conclusionMatch = text.match(/(?:Conclusion|Synthèse|Réponse finale)[\s:]+(.+?)(?:\n|$)/i);
      if (conclusionMatch) {
        conclusion = conclusionMatch[1].trim();
      } else if (steps.length > 0) {
        // Prendre le dernier step comme conclusion
        conclusion = steps[steps.length - 1].content;
      } else {
        // Prendre les dernières phrases
        const sentences = text.split(/[.!?]\s+/);
        conclusion = sentences.slice(-2).join('. ');
      }
      
      // Extraire la confiance
      const confidenceMatch = text.match(/(?:Confiance|Confidence)[\s:]+(\d+)%/i);
      if (confidenceMatch) {
        confidence = parseInt(confidenceMatch[1], 10);
      }
      
      if (steps.length === 0) {
        return null;
      }
      
      return { steps, conclusion, confidence };
    } catch {
      return null;
    }
  }

  /**
   * Parse du texte libre (fallback)
   */
  private parseFreeText(text: string): ParsedReasoning {
    // Découper en paragraphes
    const paragraphs = text
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 10);
    
    const steps: ReasoningStep[] = paragraphs.slice(0, REASONING_CONSTRAINTS.MAX_STEPS).map((para, idx) => ({
      id: `step-${idx}`,
      stepNumber: idx + 1,
      type: this.inferStepType(para, idx),
      content: para
    }));
    
    const conclusion = paragraphs[paragraphs.length - 1] || text.slice(0, 200);
    
    return {
      steps: steps.length > 0 ? steps : this.createFallbackSteps(text),
      conclusion,
      confidence: REASONING_CONSTRAINTS.DEFAULT_CONFIDENCE
    };
  }

  /**
   * Infère le type d'étape basé sur le contenu et la position
   */
  private inferStepType(content: string, index: number): ReasoningStepType {
    const lower = content.toLowerCase();
    
    // Patterns pour détecter le type
    if (lower.includes('observ') || lower.includes('constat')) {
      return 'observation';
    }
    if (lower.includes('analy') || lower.includes('examin')) {
      return 'analysis';
    }
    if (lower.includes('hypothès') || lower.includes('suppos') || lower.includes('si')) {
      return 'hypothesis';
    }
    if (lower.includes('conclusion') || lower.includes('donc') || lower.includes('ainsi')) {
      return 'conclusion';
    }
    if (lower.includes('critiqu') || lower.includes('faiblesse') || lower.includes('risque')) {
      return 'critique';
    }
    if (lower.includes('perspect') || lower.includes('point de vue')) {
      return 'perspective';
    }
    
    // Par défaut selon la position
    if (index === 0) return 'observation';
    return 'analysis';
  }

  /**
   * Valide que les steps sont cohérents
   */
  private validateSteps(steps: ReasoningStep[]): boolean {
    if (!Array.isArray(steps)) return false;
    if (steps.length < REASONING_CONSTRAINTS.MIN_STEPS) return false;
    if (steps.length > REASONING_CONSTRAINTS.MAX_STEPS) return false;
    
    // Vérifier que chaque step a du contenu
    return steps.every(s => s.content && s.content.length > 5);
  }

  /**
   * Crée des steps de fallback depuis du texte brut
   */
  private createFallbackSteps(rawText: string): ReasoningStep[] {
    const sentences = rawText
      .split(/[.!?]\s+/)
      .filter(s => s.trim().length > 10)
      .slice(0, 5);
    
    if (sentences.length === 0) {
      return [{
        id: 'step-0',
        stepNumber: 1,
        type: 'analysis',
        content: rawText.slice(0, 200)
      }];
    }
    
    return sentences.map((sentence, idx) => ({
      id: `step-${idx}`,
      stepNumber: idx + 1,
      type: this.inferStepType(sentence, idx),
      content: sentence.trim()
    }));
  }

  /**
   * Crée un parsing de fallback complet
   */
  private createFallbackParsing(rawText: string): ParsedReasoning {
    return {
      steps: this.createFallbackSteps(rawText),
      conclusion: rawText.slice(-200),
      confidence: REASONING_CONSTRAINTS.DEFAULT_CONFIDENCE
    };
  }

  /**
   * Formate les steps pour l'affichage
   */
  formatStepsForDisplay(steps: ReasoningStep[]): string {
    return steps
      .map(step => `${step.stepNumber}. ${step.content}`)
      .join('\n');
  }
}

// Instance singleton
export const reasoningParser = new ReasoningParser();
