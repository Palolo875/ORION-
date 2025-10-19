/**
 * Composant SafeMessage pour afficher du contenu utilisateur de manière sécurisée
 * Utilise DOMPurify pour prévenir les attaques XSS
 */

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sanitizeContent, detectMaliciousContent } from '@/utils/security';
import { logger } from '@/utils/logger';
import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle } from 'lucide-react';

interface SafeMessageProps {
  content: string;
  sender: 'user' | 'assistant';
  allowMarkdown?: boolean;
  className?: string;
}

/**
 * Composant sécurisé pour afficher les messages
 * - Messages utilisateur : texte brut uniquement (pas de HTML/Markdown)
 * - Messages assistant : Markdown autorisé avec sanitization
 */
export const SafeMessage: React.FC<SafeMessageProps> = ({ 
  content, 
  sender,
  allowMarkdown = false,
  className = ''
}) => {
  
  // Validation et sanitization mémoïzée
  const { safeContent, warnings } = useMemo(() => {
    if (!content) {
      return { safeContent: '', warnings: [] };
    }

    // Détecter du contenu potentiellement malveillant
    const malicious = detectMaliciousContent(content);
    
    if (malicious.isSuspicious) {
      logger.warn('SafeMessage', 'Contenu suspect détecté', { 
        sender, 
        reasons: malicious.reasons,
        contentLength: content.length 
      });
    }

    // Pour les messages utilisateurs : pas de HTML/Markdown
    if (sender === 'user') {
      const sanitized = sanitizeContent(content, { stripAll: true });
      return { 
        safeContent: sanitized,
        warnings: malicious.isSuspicious ? malicious.reasons : []
      };
    }
    
    // Pour les messages assistant : autoriser Markdown sécurisé
    // ReactMarkdown gère la conversion, on fait juste une pré-sanitization
    const sanitized = sanitizeContent(content, { allowMarkdown: true });
    return { 
      safeContent: sanitized,
      warnings: malicious.isSuspicious ? malicious.reasons : []
    };
  }, [content, sender]);

  // Afficher un avertissement si du contenu suspect a été détecté
  const showWarning = warnings.length > 0 && sender === 'user';

  if (!safeContent && !showWarning) {
    return null;
  }

  return (
    <div className={className}>
      {showWarning && (
        <Alert variant="destructive" className="mb-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Contenu potentiellement dangereux détecté et neutralisé
          </AlertDescription>
        </Alert>
      )}
      
      {allowMarkdown && sender === 'assistant' ? (
        <div className="prose prose-sm sm:prose-base prose-slate dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {safeContent}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
          {safeContent}
        </p>
      )}
    </div>
  );
};
