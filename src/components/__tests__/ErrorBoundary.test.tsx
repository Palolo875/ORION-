/**
 * Tests pour le composant ErrorBoundary
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Composant qui lance une erreur pour tester
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  // Supprimer les erreurs de console pendant les tests
  const consoleError = console.error;
  
  beforeEach(() => {
    console.error = vi.fn();
  });
  
  afterEach(() => {
    console.error = consoleError;
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error UI when there is an error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    // Vérifier qu'un message d'erreur est affiché
    expect(screen.queryByText('No error')).not.toBeInTheDocument();
  });

  it('should display custom fallback if provided', () => {
    const fallback = <div>Custom error message</div>;
    
    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });
});
