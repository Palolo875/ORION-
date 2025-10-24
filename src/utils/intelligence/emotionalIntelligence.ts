/**
 * Emotional Intelligence - Intelligence émotionnelle
 * 
 * Ce module permet à ORION de détecter et répondre aux émotions de l'utilisateur
 * pour un comportement plus humain et empathique
 */

import { logger } from '../logger';

export type EmotionType =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'frustrated'
  | 'anxious'
  | 'excited'
  | 'confused'
  | 'angry'
  | 'grateful'
  | 'curious';

export interface EmotionDetection {
  primary: EmotionType;
  secondary?: EmotionType;
  intensity: number; // 0-1
  indicators: string[]; // Mots-clés détectés
  confidence: number;
}

export interface EmpatheticResponse {
  acknowledgement: string; // Reconnaissance de l'émotion
  tone: 'supportive' | 'encouraging' | 'gentle' | 'enthusiastic' | 'calm' | 'understanding';
  suggestion?: string; // Suggestion d'adaptation de la réponse
}

/**
 * Patterns pour détecter les émotions dans le texte
 */
const EMOTION_PATTERNS: Record<EmotionType, RegExp[]> = {
  happy: [
    /\b(content|heureux|ravi|super|génial|parfait|excellent|top)\b/gi,
    /[!]{2,}/g, // Points d'exclamation multiples
    /😊|😃|😄|🎉|🎊/g,
  ],
  sad: [
    /\b(triste|déprimé|malheureux|désolé|peine|mal|dur)\b/gi,
    /😢|😭|☹️|😞/g,
  ],
  frustrated: [
    /\b(frustré|agacé|énervé|pénible|fatiguant|compliqué|impossible|toujours|encore)\b/gi,
    /\b(ça marche pas|ne fonctionne pas|bug|erreur|problème)\b/gi,
    /😤|😠|🙄/g,
  ],
  anxious: [
    /\b(inquiet|stressé|angoissé|peur|crainte|nerveux|urgent|vite)\b/gi,
    /\?\?+/g, // Multiples points d'interrogation
    /😰|😥|😟/g,
  ],
  excited: [
    /\b(excité|impatient|hâte|wow|incroyable|fantastique)\b/gi,
    /[!]{3,}/g,
    /🤩|😍|🚀|⭐/g,
  ],
  confused: [
    /\b(confus|perdu|comprends? pas|sais pas|pourquoi|comment ça)\b/gi,
    /\?\?/g,
    /😕|🤔|😵/g,
  ],
  angry: [
    /\b(en colère|furieux|rage|merde|putain|bordel)\b/gi,
    /[A-Z]{4,}/g, // MAJUSCULES
    /😡|🤬/g,
  ],
  grateful: [
    /\b(merci|reconnaissance|reconnaissant|apprécie|sympa|gentil)\b/gi,
    /🙏|💖|❤️/g,
  ],
  curious: [
    /\b(curieux|intéressant|fascin\w+|comment|pourquoi|qu'est-ce)\b/gi,
    /🤔|💡|🔍/g,
  ],
  neutral: [],
};

/**
 * Détecte l'émotion dominante dans un message
 */
export function detectEmotion(message: string): EmotionDetection {
  const emotions: Record<EmotionType, number> = {
    neutral: 0,
    happy: 0,
    sad: 0,
    frustrated: 0,
    anxious: 0,
    excited: 0,
    confused: 0,
    angry: 0,
    grateful: 0,
    curious: 0,
  };
  
  const indicators: string[] = [];
  
  // Calculer les scores pour chaque émotion
  for (const [emotion, patterns] of Object.entries(EMOTION_PATTERNS)) {
    for (const pattern of patterns) {
      const matches = message.match(pattern);
      if (matches) {
        emotions[emotion as EmotionType] += matches.length;
        indicators.push(...matches.map(m => m.substring(0, 20)));
      }
    }
  }
  
  // Trouver l'émotion dominante
  const emotionEntries = Object.entries(emotions)
    .filter(([key]) => key !== 'neutral')
    .sort(([, a], [, b]) => b - a);
  
  if (emotionEntries.length === 0 || emotionEntries[0][1] === 0) {
    return {
      primary: 'neutral',
      intensity: 0,
      indicators: [],
      confidence: 0.9,
    };
  }
  
  const [primary, primaryScore] = emotionEntries[0];
  const [secondary, secondaryScore] = emotionEntries[1] || [undefined, 0];
  
  // Calculer l'intensité (normalisée)
  const maxScore = primaryScore + secondaryScore;
  const intensity = Math.min(primaryScore / Math.max(maxScore, 5), 1);
  
  // Confiance basée sur la clarté du signal
  const confidence = primaryScore > secondaryScore * 1.5 ? 0.8 : 0.6;
  
  logger.debug('EmotionalIntelligence', 'Emotion detected', {
    primary,
    intensity: intensity.toFixed(2),
    confidence: confidence.toFixed(2),
  });
  
  return {
    primary: primary as EmotionType,
    secondary: secondary as EmotionType | undefined,
    intensity,
    indicators: indicators.slice(0, 5),
    confidence,
  };
}

/**
 * Génère une réponse empathique adaptée à l'émotion
 */
export function generateEmpatheticResponse(emotion: EmotionDetection): EmpatheticResponse {
  const responses: Record<EmotionType, EmpatheticResponse> = {
    neutral: {
      acknowledgement: '',
      tone: 'calm',
    },
    happy: {
      acknowledgement: 'Je suis content que tu sois satisfait ! 😊',
      tone: 'enthusiastic',
    },
    sad: {
      acknowledgement: 'Je comprends que ce soit difficile pour toi.',
      tone: 'gentle',
      suggestion: 'Prendre le temps nécessaire et être doux avec la personne',
    },
    frustrated: {
      acknowledgement: 'Je comprends ta frustration, et je vais faire de mon mieux pour t\'aider.',
      tone: 'understanding',
      suggestion: 'Être particulièrement clair et précis, proposer des solutions concrètes',
    },
    anxious: {
      acknowledgement: 'Pas de panique, nous allons résoudre cela ensemble.',
      tone: 'calm',
      suggestion: 'Rassurer et décomposer le problème en étapes gérables',
    },
    excited: {
      acknowledgement: 'Ton enthousiasme est contagieux ! 🚀',
      tone: 'enthusiastic',
    },
    confused: {
      acknowledgement: 'Pas de souci, je vais t\'expliquer cela plus clairement.',
      tone: 'gentle',
      suggestion: 'Simplifier au maximum, utiliser des exemples concrets',
    },
    angry: {
      acknowledgement: 'Je comprends que tu sois contrarié.',
      tone: 'calm',
      suggestion: 'Rester calme, ne pas prendre personnellement, focus sur les solutions',
    },
    grateful: {
      acknowledgement: 'Avec plaisir ! C\'est un réel plaisir de t\'aider. 😊',
      tone: 'supportive',
    },
    curious: {
      acknowledgement: 'Excellente question !',
      tone: 'encouraging',
      suggestion: 'Fournir une réponse détaillée et approfondie',
    },
  };
  
  return responses[emotion.primary] || responses.neutral;
}

/**
 * Adapte le ton d'une réponse en fonction de l'émotion détectée
 */
export function adaptTone(response: string, emotion: EmotionDetection): string {
  const empathy = generateEmpatheticResponse(emotion);
  
  // Si émotion neutre ou faible intensité, ne rien changer
  if (emotion.primary === 'neutral' || emotion.intensity < 0.3) {
    return response;
  }
  
  // Ajouter l'acknowledgement au début (si pas déjà présent)
  let adapted = response;
  if (empathy.acknowledgement && !response.toLowerCase().includes(empathy.acknowledgement.toLowerCase().substring(0, 20))) {
    adapted = `${empathy.acknowledgement}\n\n${response}`;
  }
  
  // Adaptations spécifiques par émotion
  switch (emotion.primary) {
    case 'frustrated':
    case 'confused':
      // Simplifier et structurer davantage
      if (!adapted.includes('Étape') && !adapted.includes('•')) {
        adapted += '\n\n💡 *Astuce: N\'hésite pas à me demander des clarifications sur n\'importe quel point.*';
      }
      break;
      
    case 'anxious':
      // Rassurer davantage
      adapted += '\n\n✨ *Tu vas y arriver, prends le temps qu\'il faut.*';
      break;
      
    case 'angry':
      // Rester factuel et calme
      // Éviter les émojis excessifs
      adapted = adapted.replace(/[!]{2,}/g, '!');
      break;
  }
  
  return adapted;
}

/**
 * Analyse le contexte conversationnel pour une meilleure compréhension
 */
export function analyzeConversationContext(
  currentMessage: string,
  previousMessages: Array<{ role: string; content: string }>
): {
  isFollowUp: boolean;
  topic?: string;
  userSentiment: 'positive' | 'neutral' | 'negative';
  engagement: 'high' | 'medium' | 'low';
} {
  const isFollowUp = previousMessages.length > 0 && (
    /^(et|mais|donc|alors|ensuite|puis|après|aussi|également)/i.test(currentMessage) ||
    currentMessage.length < 50
  );
  
  // Analyser le sentiment global
  const allUserMessages = previousMessages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .concat(currentMessage);
  
  const sentiments = allUserMessages.map(msg => detectEmotion(msg));
  const avgIntensity = sentiments.reduce((sum, s) => {
    const isPositive = ['happy', 'excited', 'grateful', 'curious'].includes(s.primary);
    const isNegative = ['sad', 'frustrated', 'angry', 'anxious'].includes(s.primary);
    return sum + (isPositive ? s.intensity : isNegative ? -s.intensity : 0);
  }, 0) / sentiments.length;
  
  const userSentiment = avgIntensity > 0.2 ? 'positive' 
    : avgIntensity < -0.2 ? 'negative' 
    : 'neutral';
  
  // Analyser l'engagement
  const avgLength = allUserMessages.reduce((sum, msg) => sum + msg.length, 0) / allUserMessages.length;
  const engagement = avgLength > 100 ? 'high' 
    : avgLength > 30 ? 'medium' 
    : 'low';
  
  return {
    isFollowUp,
    userSentiment,
    engagement,
  };
}

/**
 * Classe principale pour l'intelligence émotionnelle
 */
export class EmotionalIntelligence {
  private enabled: boolean;
  
  constructor(options: { enabled?: boolean } = {}) {
    this.enabled = options.enabled ?? true;
  }
  
  /**
   * Détecte l'émotion dans un message
   */
  detect(message: string): EmotionDetection {
    if (!this.enabled) {
      return {
        primary: 'neutral',
        intensity: 0,
        indicators: [],
        confidence: 1,
      };
    }
    
    return detectEmotion(message);
  }
  
  /**
   * Génère une réponse empathique
   */
  generateEmpathy(emotion: EmotionDetection): EmpatheticResponse {
    return generateEmpatheticResponse(emotion);
  }
  
  /**
   * Adapte une réponse complète
   */
  adapt(response: string, userMessage: string): string {
    if (!this.enabled) {
      return response;
    }
    
    const emotion = this.detect(userMessage);
    return adaptTone(response, emotion);
  }
  
  /**
   * Analyse le contexte conversationnel
   */
  analyzeContext(
    currentMessage: string,
    previousMessages: Array<{ role: string; content: string }>
  ) {
    return analyzeConversationContext(currentMessage, previousMessages);
  }
}

// Export singleton
export const emotionalIntelligence = new EmotionalIntelligence({ enabled: true });
