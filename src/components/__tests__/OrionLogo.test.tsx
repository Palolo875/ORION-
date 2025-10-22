/**
 * Tests pour le composant OrionLogo
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { OrionLogo } from '../OrionLogo';

describe('OrionLogo', () => {
  it('should render logo', () => {
    const { container } = render(<OrionLogo />);
    
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should apply custom className when provided', () => {
    const { container } = render(<OrionLogo className="custom-class" />);
    
    const logo = container.firstChild as HTMLElement;
    if (logo && logo.classList) {
      expect(logo.classList.contains('custom-class')).toBe(true);
    }
  });

  it('should render with default size', () => {
    const { container } = render(<OrionLogo />);
    
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should accept size prop', () => {
    const { container } = render(<OrionLogo size={64} />);
    
    expect(container.firstChild).toBeInTheDocument();
  });
});
