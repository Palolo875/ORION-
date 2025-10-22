/**
 * Tests pour le système i18n
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getTranslation,
  detectBrowserLanguage,
  getSavedLocale,
  saveLocale,
  getInitialLocale,
  locales,
} from '../index';

describe('i18n System', () => {
  // Sauvegarder et restaurer localStorage
  let originalLocalStorage: Storage;
  
  beforeEach(() => {
    originalLocalStorage = global.localStorage;
    localStorage.clear();
  });
  
  afterEach(() => {
    global.localStorage = originalLocalStorage;
  });

  describe('getTranslation', () => {
    it('should get translation for French', () => {
      expect(getTranslation('fr', 'common.loading')).toBe('Chargement...');
      expect(getTranslation('fr', 'common.error')).toBe('Erreur');
    });

    it('should get translation for English', () => {
      expect(getTranslation('en', 'common.loading')).toBe('Loading...');
      expect(getTranslation('en', 'common.error')).toBe('Error');
    });

    it('should get translation for Spanish', () => {
      expect(getTranslation('es', 'common.loading')).toBe('Cargando...');
      expect(getTranslation('es', 'common.error')).toBe('Error');
    });

    it('should get nested translations', () => {
      expect(getTranslation('fr', 'chat.placeholder')).toBe('Écrivez votre message...');
      expect(getTranslation('en', 'chat.placeholder')).toBe('Type your message...');
      expect(getTranslation('es', 'chat.placeholder')).toBe('Escriba su mensaje...');
    });

    it('should return key if translation not found', () => {
      expect(getTranslation('fr', 'nonexistent.key')).toBe('nonexistent.key');
    });

    it('should handle deep nesting', () => {
      expect(getTranslation('fr', 'settings.dark_mode')).toBe('Mode sombre');
      expect(getTranslation('en', 'settings.dark_mode')).toBe('Dark mode');
      expect(getTranslation('es', 'settings.dark_mode')).toBe('Modo oscuro');
    });
  });

  describe('localStorage integration', () => {
    it('should save locale to localStorage', () => {
      saveLocale('en');
      expect(localStorage.getItem('orion_locale')).toBe('en');
      
      saveLocale('es');
      expect(localStorage.getItem('orion_locale')).toBe('es');
    });

    it('should get saved locale from localStorage', () => {
      localStorage.setItem('orion_locale', 'en');
      expect(getSavedLocale()).toBe('en');
      
      localStorage.setItem('orion_locale', 'es');
      expect(getSavedLocale()).toBe('es');
    });

    it('should return null if no locale saved', () => {
      expect(getSavedLocale()).toBe(null);
    });

    it('should return null for invalid locale', () => {
      localStorage.setItem('orion_locale', 'invalid');
      expect(getSavedLocale()).toBe(null);
    });
  });

  describe('getInitialLocale', () => {
    it('should use saved locale if available', () => {
      saveLocale('es');
      expect(getInitialLocale()).toBe('es');
    });

    it('should detect browser language if no saved locale', () => {
      const locale = getInitialLocale();
      expect(['fr', 'en', 'es']).toContain(locale);
    });
  });

  describe('locales completeness', () => {
    it('should have same keys in all locales', () => {
      const frKeys = Object.keys(locales.fr);
      const enKeys = Object.keys(locales.en);
      const esKeys = Object.keys(locales.es);
      
      expect(frKeys.sort()).toEqual(enKeys.sort());
      expect(frKeys.sort()).toEqual(esKeys.sort());
    });

    it('should have all required sections', () => {
      const requiredSections = [
        'common',
        'browser',
        'chat',
        'agents',
        'models',
        'errors',
        'performance',
        'settings',
      ];
      
      for (const locale of Object.keys(locales)) {
        const sections = Object.keys(locales[locale as keyof typeof locales]);
        requiredSections.forEach(section => {
          expect(sections).toContain(section);
        });
      }
    });

    it('should have app_name in all languages', () => {
      expect(locales.fr.common.app_name).toBe('ORION');
      expect(locales.en.common.app_name).toBe('ORION');
      expect(locales.es.common.app_name).toBe('ORION');
    });
  });

  describe('Translation consistency', () => {
    it('should not have empty translations', () => {
      function checkNoEmptyStrings(obj: unknown, path = ''): void {
        if (typeof obj === 'string') {
          expect(obj.length).toBeGreaterThan(0);
        } else if (typeof obj === 'object' && obj !== null) {
          for (const [key, value] of Object.entries(obj)) {
            checkNoEmptyStrings(value, path ? `${path}.${key}` : key);
          }
        }
      }

      checkNoEmptyStrings(locales.fr);
      checkNoEmptyStrings(locales.en);
      checkNoEmptyStrings(locales.es);
    });
  });
});
