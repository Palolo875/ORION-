/**
 * Tests pour le composant SafeMessage
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SafeMessage } from '../SafeMessage';

describe('SafeMessage', () => {
  it('should render plain text message', () => {
    render(<SafeMessage content="Hello, world!" />);
    
    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });

  it('should sanitize HTML content', () => {
    const maliciousContent = '<script>alert("XSS")</script><p>Safe content</p>';
    
    const { container } = render(<SafeMessage content={maliciousContent} />);
    
    // Le script ne devrait pas être exécuté
    const scripts = container.querySelectorAll('script');
    expect(scripts.length).toBe(0);
    
    // Le contenu devrait être présent (peut être échappé pour la sécurité)
    expect(container.textContent).toBeTruthy();
  });

  it('should render markdown when allowMarkdown is true', () => {
    const markdownContent = '**Bold text** and *italic text*';
    
    render(<SafeMessage content={markdownContent} allowMarkdown={true} />);
    
    // Le contenu markdown devrait être rendu
    expect(screen.getByText(/Bold text/i)).toBeInTheDocument();
  });

  it('should handle empty content', () => {
    const { container } = render(<SafeMessage content="" />);
    
    expect(container).toBeInTheDocument();
  });

  it('should handle null or undefined content gracefully', () => {
    // Test intentionnel d'un cas limite : null au lieu d'une string
    // @ts-expect-error - Test volontaire avec une valeur invalide
    const { container } = render(<SafeMessage content={null} />);
    
    expect(container).toBeInTheDocument();
  });

  it('should remove dangerous attributes from HTML', () => {
    const dangerousContent = '<a href="javascript:alert(1)">Click me</a>';
    
    render(<SafeMessage content={dangerousContent} />);
    
    // Le lien ne devrait pas contenir javascript:
    const link = screen.queryByText('Click me');
    if (link) {
      const href = link.getAttribute('href');
      expect(href).not.toContain('javascript:');
    }
  });

  it('should handle safe HTML tags', () => {
    const safeContent = '<p>Paragraph</p><strong>Bold</strong><em>Italic</em>';
    
    const { container } = render(<SafeMessage content={safeContent} />);
    
    // Le contenu devrait être rendu de manière sécurisée
    // (peut être échappé ou sanitizé selon l'implémentation)
    expect(container.textContent).toContain('Paragraph');
    expect(container.textContent).toContain('Bold');
    expect(container.textContent).toContain('Italic');
  });
});
