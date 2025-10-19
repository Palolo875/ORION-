// src/utils/accessibility.ts

/**
 * Utilitaires d'accessibilité pour ORION
 * 
 * Fournit des fonctions pour améliorer l'accessibilité de l'application
 */

import { A11Y_CONFIG } from '../config/constants';

/**
 * Vérifie le contraste entre deux couleurs
 * Suit les directives WCAG AA (ratio minimum 4.5:1)
 */
export function checkContrast(
  foreground: string,
  background: string
): { ratio: number; passes: boolean } {
  const fgLuminance = getRelativeLuminance(foreground);
  const bgLuminance = getRelativeLuminance(background);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  const ratio = (lighter + 0.05) / (darker + 0.05);
  const passes = ratio >= A11Y_CONFIG.MIN_CONTRAST_RATIO;

  return { ratio, passes };
}

/**
 * Calcule la luminance relative d'une couleur
 */
function getRelativeLuminance(color: string): number {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convertit une couleur hexadécimale en RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Génère un ID unique pour les attributs ARIA
 */
let idCounter = 0;
export function generateAriaId(prefix = 'orion'): string {
  return `${prefix}-${Date.now()}-${++idCounter}`;
}

/**
 * Crée des attributs ARIA pour un champ de formulaire
 */
export function createFormFieldAria(options: {
  id: string;
  label: string;
  required?: boolean;
  invalid?: boolean;
  errorMessage?: string;
  description?: string;
}) {
  const { id, label, required, invalid, errorMessage, description } = options;

  const attrs: Record<string, string | boolean> = {
    id,
    'aria-label': label,
  };

  if (required) {
    attrs['aria-required'] = true;
  }

  if (invalid) {
    attrs['aria-invalid'] = true;
    if (errorMessage) {
      const errorId = `${id}-error`;
      attrs['aria-describedby'] = errorId;
    }
  }

  if (description && !invalid) {
    const descId = `${id}-description`;
    attrs['aria-describedby'] = descId;
  }

  return attrs;
}

/**
 * Crée des attributs ARIA pour un bouton
 */
export function createButtonAria(options: {
  label: string;
  expanded?: boolean;
  pressed?: boolean;
  disabled?: boolean;
  controls?: string;
}) {
  const { label, expanded, pressed, disabled, controls } = options;

  const attrs: Record<string, string | boolean> = {
    'aria-label': label,
  };

  if (expanded !== undefined) {
    attrs['aria-expanded'] = expanded;
  }

  if (pressed !== undefined) {
    attrs['aria-pressed'] = pressed;
  }

  if (disabled) {
    attrs['aria-disabled'] = true;
  }

  if (controls) {
    attrs['aria-controls'] = controls;
  }

  return attrs;
}

/**
 * Crée des attributs ARIA pour une région
 */
export function createRegionAria(options: {
  role?: string;
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  live?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
}) {
  const { role, label, labelledBy, describedBy, live, atomic } = options;

  const attrs: Record<string, string | boolean> = {};

  if (role) {
    attrs['role'] = role;
  }

  if (label) {
    attrs['aria-label'] = label;
  }

  if (labelledBy) {
    attrs['aria-labelledby'] = labelledBy;
  }

  if (describedBy) {
    attrs['aria-describedby'] = describedBy;
  }

  if (live) {
    attrs['aria-live'] = live;
  }

  if (atomic !== undefined) {
    attrs['aria-atomic'] = atomic;
  }

  return attrs;
}

/**
 * Vérifie si le mode de navigation au clavier est actif
 */
export function isKeyboardNavigation(): boolean {
  // Détecte si l'utilisateur utilise le clavier pour naviguer
  return document.body.classList.contains('keyboard-navigation');
}

/**
 * Active le mode de navigation au clavier
 */
export function enableKeyboardNavigation() {
  document.body.classList.add('keyboard-navigation');
}

/**
 * Désactive le mode de navigation au clavier
 */
export function disableKeyboardNavigation() {
  document.body.classList.remove('keyboard-navigation');
}

/**
 * Initialise la détection de navigation au clavier
 */
export function initKeyboardNavigationDetection() {
  let isKeyboard = false;

  // Détecte l'utilisation du clavier
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      isKeyboard = true;
      enableKeyboardNavigation();
    }
  });

  // Détecte l'utilisation de la souris
  document.addEventListener('mousedown', () => {
    if (isKeyboard) {
      isKeyboard = false;
      disableKeyboardNavigation();
    }
  });
}

/**
 * Trouve le premier élément focusable dans un conteneur
 */
export function findFirstFocusable(container: HTMLElement): HTMLElement | null {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return container.querySelector<HTMLElement>(focusableSelectors);
}

/**
 * Obtient tous les éléments focusables dans un conteneur
 */
export function getAllFocusable(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
}

/**
 * Gère le focus sur un élément de manière sûre
 */
export function focusElement(element: HTMLElement | null, options?: FocusOptions) {
  if (!element) return;

  // Petite temporisation pour assurer que l'élément est prêt
  requestAnimationFrame(() => {
    element.focus(options);
  });
}

/**
 * Crée un texte descriptif pour un lecteur d'écran
 */
export function createScreenReaderText(text: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'sr-only';
  span.textContent = text;
  return span;
}

/**
 * Annonce un message aux lecteurs d'écran
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Nettoyer après 1 seconde
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Vérifie si un élément est visible pour un lecteur d'écran
 */
export function isVisibleForScreenReader(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  
  return (
    element.getAttribute('aria-hidden') !== 'true' &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    parseFloat(style.opacity) > 0
  );
}

/**
 * Raccourcis clavier globaux de l'application
 */
export const GLOBAL_SHORTCUTS = {
  NEW_CHAT: { key: 'n', ctrl: true, description: 'Nouvelle conversation' },
  FOCUS_INPUT: { key: '/', description: 'Focaliser le champ de saisie' },
  SETTINGS: { key: ',', ctrl: true, description: 'Ouvrir les paramètres' },
  HELP: { key: '?', shift: true, description: 'Afficher l\'aide' },
  ESCAPE: { key: 'Escape', description: 'Fermer/Annuler' },
} as const;

/**
 * Formate un raccourci clavier pour l'affichage
 */
export function formatShortcut(shortcut: {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.meta) parts.push('⌘');

  parts.push(shortcut.key.toUpperCase());

  return parts.join(' + ');
}
