/**
 * Contexte React pour l'internationalisation
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { type Locale, type Translations, getInitialLocale, locales, saveLocale, getTranslation } from './index';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  translations: Translations;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale());

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    saveLocale(newLocale);
    // Mettre à jour l'attribut lang du HTML pour l'accessibilité
    document.documentElement.lang = newLocale;
  }, []);

  // Initialiser l'attribut lang au premier rendu
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: string) => getTranslation(locale, key),
    [locale]
  );

  const value: I18nContextType = {
    locale,
    setLocale,
    t,
    translations: locales[locale],
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

/**
 * Hook pour accéder au système i18n
 */
export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

/**
 * Hook simple pour obtenir uniquement la fonction de traduction
 */
export function useTranslation() {
  const { t, locale } = useI18n();
  return { t, locale };
}
