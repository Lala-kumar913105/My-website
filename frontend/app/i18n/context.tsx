"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import en from './translations/en.json';
import hi from './translations/hi.json';

export type Language = 'en' | 'hi';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en,
  hi,
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // Load language from localStorage or use browser language
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'hi')) {
      setLanguageState(savedLanguage);
    } else {
      const browserLang = navigator.language.split('-')[0] as Language;
      if (browserLang === 'hi') {
        setLanguageState('hi');
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let translation: any = translations[language];

    for (const k of keys) {
      if (translation[k] === undefined) {
        return key;
      }
      translation = translation[k];
    }

    return translation;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};