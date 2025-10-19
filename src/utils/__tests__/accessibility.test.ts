// src/utils/__tests__/accessibility.test.ts

import { describe, it, expect } from 'vitest';
import {
  checkContrast,
  generateAriaId,
  createFormFieldAria,
  createButtonAria,
  formatShortcut,
  GLOBAL_SHORTCUTS,
} from '../accessibility';

describe('Accessibility Utils', () => {
  describe('checkContrast', () => {
    it('should calculate contrast ratio correctly', () => {
      // Noir sur blanc - contraste maximum
      const blackOnWhite = checkContrast('#000000', '#FFFFFF');
      expect(blackOnWhite.ratio).toBe(21);
      expect(blackOnWhite.passes).toBe(true);

      // Gris moyen sur blanc - devrait passer WCAG AA
      const grayOnWhite = checkContrast('#666666', '#FFFFFF');
      expect(grayOnWhite.passes).toBe(true);
      expect(grayOnWhite.ratio).toBeGreaterThan(4.5);
    });

    it('should detect low contrast', () => {
      // Gris clair sur blanc - contraste insuffisant
      const lightGrayOnWhite = checkContrast('#CCCCCC', '#FFFFFF');
      expect(lightGrayOnWhite.passes).toBe(false);
      expect(lightGrayOnWhite.ratio).toBeLessThan(4.5);
    });
  });

  describe('generateAriaId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateAriaId();
      const id2 = generateAriaId();
      
      expect(id1).toContain('orion-');
      expect(id2).toContain('orion-');
      expect(id1).not.toBe(id2);
    });

    it('should use custom prefix', () => {
      const id = generateAriaId('custom');
      expect(id).toContain('custom-');
    });
  });

  describe('createFormFieldAria', () => {
    it('should create basic aria attributes', () => {
      const attrs = createFormFieldAria({
        id: 'test-field',
        label: 'Test Field',
      });

      expect(attrs).toHaveProperty('id', 'test-field');
      expect(attrs).toHaveProperty('aria-label', 'Test Field');
    });

    it('should add required attribute', () => {
      const attrs = createFormFieldAria({
        id: 'test-field',
        label: 'Test Field',
        required: true,
      });

      expect(attrs).toHaveProperty('aria-required', true);
    });

    it('should add error attributes', () => {
      const attrs = createFormFieldAria({
        id: 'test-field',
        label: 'Test Field',
        invalid: true,
        errorMessage: 'Field is required',
      });

      expect(attrs).toHaveProperty('aria-invalid', true);
      expect(attrs).toHaveProperty('aria-describedby', 'test-field-error');
    });
  });

  describe('createButtonAria', () => {
    it('should create basic button attributes', () => {
      const attrs = createButtonAria({
        label: 'Click me',
      });

      expect(attrs).toHaveProperty('aria-label', 'Click me');
    });

    it('should add expanded state', () => {
      const attrs = createButtonAria({
        label: 'Toggle',
        expanded: true,
      });

      expect(attrs).toHaveProperty('aria-expanded', true);
    });

    it('should add controls relationship', () => {
      const attrs = createButtonAria({
        label: 'Toggle menu',
        controls: 'menu-id',
      });

      expect(attrs).toHaveProperty('aria-controls', 'menu-id');
    });
  });

  describe('formatShortcut', () => {
    it('should format simple shortcut', () => {
      const formatted = formatShortcut({ key: 'n' });
      expect(formatted).toBe('N');
    });

    it('should format shortcut with modifiers', () => {
      const formatted = formatShortcut({ key: 'n', ctrl: true });
      expect(formatted).toBe('Ctrl + N');
    });

    it('should format shortcut with multiple modifiers', () => {
      const formatted = formatShortcut({ 
        key: 's', 
        ctrl: true, 
        shift: true 
      });
      expect(formatted).toBe('Ctrl + Shift + S');
    });
  });

  describe('GLOBAL_SHORTCUTS', () => {
    it('should have valid shortcut definitions', () => {
      expect(GLOBAL_SHORTCUTS.NEW_CHAT).toHaveProperty('key');
      expect(GLOBAL_SHORTCUTS.NEW_CHAT).toHaveProperty('description');
      expect(GLOBAL_SHORTCUTS.FOCUS_INPUT).toHaveProperty('key');
      expect(GLOBAL_SHORTCUTS.SETTINGS).toHaveProperty('key');
    });
  });
});
