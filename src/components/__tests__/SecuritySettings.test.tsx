/**
 * Tests pour le composant SecuritySettings
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SecuritySettings } from '../SecuritySettings';

// Mock des modules externes
vi.mock('../../utils/security/promptGuardrails', () => ({
  promptGuardrails: {
    setEnabled: vi.fn(),
    setStrictMode: vi.fn(),
  },
}));

vi.mock('../../utils/resilience/circuitBreaker', () => ({
  circuitBreakerManager: {
    getAllStats: vi.fn(() => new Map()),
    getHealthSummary: vi.fn(() => ({
      healthy: 3,
      degraded: 1,
      down: 0,
      total: 4,
    })),
    resetAll: vi.fn(),
  },
}));

vi.mock('../../utils/resilience/requestQueue', () => ({
  requestQueue: {
    getStats: vi.fn(() => ({
      activeRequests: 0,
      queuedRequests: 0,
      completedRequests: 10,
      failedRequests: 2,
      interruptedRequests: 1,
      averageWaitTime: 150,
      averageExecutionTime: 500,
    })),
    clear: vi.fn(),
  },
}));

vi.mock('../../utils/performance/predictiveLoader', () => ({
  predictiveLoader: {
    setEnabled: vi.fn(),
  },
}));

vi.mock('../../utils/monitoring/telemetry', () => ({
  telemetry: {
    setEnabled: vi.fn(),
  },
}));

describe('SecuritySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render security settings panel', () => {
    render(<SecuritySettings />);
    
    expect(screen.getByText('Sécurité & Performance')).toBeInTheDocument();
    expect(screen.getByText(/Opération Bouclier d'Orion/)).toBeInTheDocument();
    expect(screen.getByText(/Opération Anti-Fragile/)).toBeInTheDocument();
  });

  it('should display circuit breaker statistics', () => {
    render(<SecuritySettings />);
    
    expect(screen.getByText('3')).toBeInTheDocument(); // Circuits sains
    expect(screen.getByText('1')).toBeInTheDocument(); // Dégradés
  });

  it('should display queue statistics', () => {
    render(<SecuritySettings />);
    
    expect(screen.getByText('10')).toBeInTheDocument(); // Requêtes complétées
    expect(screen.getByText(/150ms/)).toBeInTheDocument(); // Temps d'attente moyen
  });

  it('should toggle guardrails switch', async () => {
    const { promptGuardrails } = await import('../../utils/security/promptGuardrails');
    
    render(<SecuritySettings />);
    
    const guardrailsSwitch = screen.getByRole('switch', { name: /Guardrails de Sécurité/i });
    expect(guardrailsSwitch).toBeChecked();
    
    fireEvent.click(guardrailsSwitch);
    expect(promptGuardrails.setEnabled).toHaveBeenCalledWith(false);
  });

  it('should toggle telemetry switch', async () => {
    const { telemetry } = await import('../../utils/monitoring/telemetry');
    
    render(<SecuritySettings />);
    
    const telemetrySwitch = screen.getByRole('switch', { name: /Télémétrie Anonymisée/i });
    
    fireEvent.click(telemetrySwitch);
    expect(telemetry.setEnabled).toHaveBeenCalled();
  });

  it('should handle close button when onClose is provided', () => {
    const onClose = vi.fn();
    
    render(<SecuritySettings onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: /Fermer/i });
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should reset circuit breakers when button is clicked', async () => {
    const { circuitBreakerManager } = await import('../../utils/resilience/circuitBreaker');
    
    // Mock window.alert
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<SecuritySettings />);
    
    const resetButton = screen.getByRole('button', { name: /Réinitialiser les Circuit Breakers/i });
    fireEvent.click(resetButton);
    
    expect(circuitBreakerManager.resetAll).toHaveBeenCalled();
    expect(alertMock).toHaveBeenCalledWith('Tous les circuit breakers ont été réinitialisés');
    
    alertMock.mockRestore();
  });
});
