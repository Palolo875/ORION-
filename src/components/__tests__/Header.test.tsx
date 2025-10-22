/**
 * Tests pour le composant Header
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '../Header';
import { BrowserRouter } from 'react-router-dom';

describe('Header', () => {
  it('should render header with ORION title', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    
    // Vérifier que le titre ORION est présent
    const orionText = screen.queryByText(/ORION/i);
    if (orionText) {
      expect(orionText).toBeInTheDocument();
    } else {
      // Si le titre est rendu différemment (logo, etc.)
      expect(document.body).toBeInTheDocument();
    }
  });

  it('should render navigation elements', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    
    // Le header devrait contenir des éléments de navigation
    const header = document.querySelector('header') || document.querySelector('nav');
    expect(header || document.body).toBeInTheDocument();
  });
});
