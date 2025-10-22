import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuggestionChips } from '../SuggestionChips';

console.log('🎭 Tests avec MOCKS (rapide)');

describe('SuggestionChips', () => {
  it('should render suggestion chips', () => {
    const onSelect = vi.fn();
    render(<SuggestionChips onSelect={onSelect} />);
    
    const chips = screen.getAllByTestId('suggestion-chip');
    expect(chips.length).toBeGreaterThan(0);
  });

  it('should call onSelect when a chip is clicked', () => {
    const onSelect = vi.fn();
    render(<SuggestionChips onSelect={onSelect} />);
    
    const firstChip = screen.getAllByTestId('suggestion-chip')[0];
    fireEvent.click(firstChip);
    
    expect(onSelect).toHaveBeenCalledWith(expect.any(String));
  });

  it('should display suggestion labels', () => {
    const onSelect = vi.fn();
    render(<SuggestionChips onSelect={onSelect} />);
    
    expect(screen.getByText(/Quelle heure/i)).toBeInTheDocument();
  });

  it('should render icons in chips', () => {
    const onSelect = vi.fn();
    render(<SuggestionChips onSelect={onSelect} />);
    
    const chips = screen.getAllByTestId('suggestion-chip');
    chips.forEach(chip => {
      const icon = chip.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });
});
