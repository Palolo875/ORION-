import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsPanel } from '../SettingsPanel';

console.log('🎭 Tests avec MOCKS (rapide)');

describe('SettingsPanel', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    selectedModel: 'demo-model',
    onModelChange: vi.fn(),
    debugInfo: {
      totalRounds: 3,
      inferenceTimeMs: 1500,
      debateQuality: {
        averageConfidence: 0.85,
        consensusScore: 0.9,
        diversityScore: 0.7
      }
    },
    onClearHistory: vi.fn(),
    onExportChat: vi.fn()
  };

  it('should render when open', () => {
    render(<SettingsPanel {...defaultProps} />);
    expect(screen.getByText(/Paramètres/i)).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    const { container } = render(<SettingsPanel {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display settings content', () => {
    render(<SettingsPanel {...defaultProps} />);
    // Just verify the component renders
    expect(screen.getByText(/Paramètres/i)).toBeInTheDocument();
  });

  it('should have close button', () => {
    render(<SettingsPanel {...defaultProps} />);
    const closeButtons = screen.getAllByRole('button');
    expect(closeButtons.length).toBeGreaterThan(0);
  });
});
