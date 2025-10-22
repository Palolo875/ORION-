/**
 * Système d'internationalisation (i18n) pour ORION
 * Supporte FR, EN, ES
 */

import { fr, type Translations } from './locales/fr';
import { en } from './locales/en';
import { es } from './locales/es';

export type Locale = 'fr' | 'en' | 'es';

export const locales: Record<Locale, Translations> = {
  fr,
  en,
  es,
};

export const localeNames: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
};

/**
 * Détecter la langue du navigateur
 */
export function detectBrowserLanguage(): Locale {
  const browserLang = navigator.language.toLowerCase();
  
  if (browserLang.startsWith('fr')) return 'fr';
  if (browserLang.startsWith('es')) return 'es';
  if (browserLang.startsWith('en')) return 'en';
  
  // Défaut : français
  return 'fr';
}

/**
 * Récupérer la langue depuis le stockage local
 */
export function getSavedLocale(): Locale | null {
  try {
    const saved = localStorage.getItem('orion_locale');
    if (saved && (saved === 'fr' || saved === 'en' || saved === 'es')) {
      return saved as Locale;
    }
  } catch (error) {
    console.warn('Impossible de lire la langue depuis localStorage:', error);
  }
  return null;
}

/**
 * Sauvegarder la langue dans le stockage local
 */
export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem('orion_locale', locale);
  } catch (error) {
    console.warn('Impossible de sauvegarder la langue dans localStorage:', error);
  }
}

/**
 * Obtenir la langue à utiliser (priorité: saved > browser > default)
 */
export function getInitialLocale(): Locale {
  return getSavedLocale() || detectBrowserLanguage();
}

/**
 * Helper pour accéder aux traductions de manière type-safe
 */
type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<Translations>;

/**
 * Obtenir une traduction par clé (ex: 'common.loading')
 */
export function getTranslation(locale: Locale, key: string): string {
  const translations = locales[locale];
  const keys = key.split('.');
  
  let value: unknown = translations;
  for (const k of keys) {
    if (typeof value === 'object' && value !== null && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      console.warn(`Translation key not found: ${key} for locale ${locale}`);
      return key;
    }
  }
  
  return typeof value === 'string' ? value : key;
}

export * from './locales/fr';
export * from './locales/en';
export * from './locales/es';
