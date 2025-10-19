// src/hooks/useKeyboardNavigation.ts

/**
 * Hook personnalisé pour la navigation au clavier
 * Améliore l'accessibilité en ajoutant des raccourcis clavier globaux
 */

import React, { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  handler: () => void;
  preventDefault?: boolean;
}

export function useKeyboardNavigation(shortcuts: KeyboardShortcut[], enabled = true) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
            event.stopPropagation();
          }
          shortcut.handler();
          break;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

/**
 * Hook pour gérer la navigation dans une liste
 */
export function useListNavigation<T>(
  items: T[],
  options: {
    onSelect?: (item: T, index: number) => void;
    onEscape?: () => void;
    initialIndex?: number;
    loop?: boolean;
  } = {}
) {
  const { onSelect, onEscape, initialIndex = 0, loop = true } = options;
  const [selectedIndex, setSelectedIndex] = React.useState(initialIndex);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => {
            const next = prev + 1;
            if (next >= items.length) {
              return loop ? 0 : prev;
            }
            return next;
          });
          break;

        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => {
            const next = prev - 1;
            if (next < 0) {
              return loop ? items.length - 1 : prev;
            }
            return next;
          });
          break;

        case 'Enter':
          event.preventDefault();
          if (items[selectedIndex] && onSelect) {
            onSelect(items[selectedIndex], selectedIndex);
          }
          break;

        case 'Escape':
          event.preventDefault();
          onEscape?.();
          break;

        case 'Home':
          event.preventDefault();
          setSelectedIndex(0);
          break;

        case 'End':
          event.preventDefault();
          setSelectedIndex(items.length - 1);
          break;
      }
    },
    [items, selectedIndex, onSelect, onEscape, loop]
  );

  return {
    selectedIndex,
    setSelectedIndex,
    handleKeyDown,
  };
}

/**
 * Hook pour gérer le focus trap (piège de focus)
 * Utile pour les modales et dialogues
 */
export function useFocusTrap(enabled = true) {
  const containerRef = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus le premier élément au montage
    firstElement?.focus();

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);

  return containerRef;
}

/**
 * Hook pour annoncer des messages aux lecteurs d'écran
 */
export function useScreenReaderAnnounce() {
  const announceRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Créer un élément live region pour les annonces
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only'; // Classe pour masquer visuellement
    document.body.appendChild(liveRegion);
    announceRef.current = liveRegion;

    return () => {
      if (announceRef.current) {
        document.body.removeChild(announceRef.current);
      }
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announceRef.current) return;

    announceRef.current.setAttribute('aria-live', priority);
    announceRef.current.textContent = message;

    // Nettoyer après 1 seconde
    setTimeout(() => {
      if (announceRef.current) {
        announceRef.current.textContent = '';
      }
    }, 1000);
  }, []);

  return announce;
}
