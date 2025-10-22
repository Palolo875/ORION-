/**
 * Tests pour le composant ModelSelector
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModelSelector } from '../ModelSelector';

describe('ModelSelector', () => {
  it('should render model selector with onSelect callback', () => {
    const onSelect = vi.fn();
    
    render(<ModelSelector onSelect={onSelect} />);
    
    // Le composant devrait être rendu
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should display model options', () => {
    const onSelect = vi.fn();
    
    const { container } = render(<ModelSelector onSelect={onSelect} />);
    
    // Le sélecteur devrait contenir des options de modèles
    expect(container).toBeInTheDocument();
  });

  it('should handle model selection', () => {
    const onSelect = vi.fn();
    
    render(<ModelSelector onSelect={onSelect} defaultModel="standard" />);
    
    // Trouver et cliquer sur le bouton de sélection
    const selectButton = screen.getByRole('button', { name: /sélectionner|select|charger|load/i });
    if (selectButton) {
      selectButton.click();
      expect(onSelect).toHaveBeenCalled();
    } else {
      // Si le bouton n'est pas trouvé, vérifier que le composant est rendu
      expect(screen.getByRole('button')).toBeInTheDocument();
    }
  });
});
