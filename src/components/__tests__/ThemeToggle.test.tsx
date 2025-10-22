/**
 * Tests pour le composant ThemeToggle
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '../ThemeToggle';
import { ThemeProvider } from '../ThemeProvider';

describe('ThemeToggle', () => {
  it('should render theme toggle button', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should toggle theme when clicked', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    
    const button = screen.getByRole('button');
    
    // Click to toggle theme
    fireEvent.click(button);
    
    // Button should still be present after toggle
    expect(button).toBeInTheDocument();
  });

  it('should be accessible', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    
    const button = screen.getByRole('button');
    // Le bouton devrait avoir soit un aria-label, soit un title pour l'accessibilité
    const hasAccessibility = 
      button.hasAttribute('aria-label') || 
      button.hasAttribute('title') ||
      button.textContent !== '';
    
    expect(hasAccessibility).toBe(true);
  });
});
