import React, { createContext, useContext, useState, useEffect } from 'react';
import { manifestoContent } from '../data/manifesto';

type Language = 'en' | 'zh';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
};

const STORAGE_KEY = 'osw-language';

function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'zh') return stored;
  } catch {
    // localStorage unavailable (e.g. privacy mode) — fall through
  }
  if (typeof navigator === 'undefined' || !navigator.language) return 'en';
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';

    const { pageTitle, pageDescription } = manifestoContent.meta;
    document.title = pageTitle[language];
    const metaSelectors: Array<[string, string]> = [
      ['meta[name="description"]', pageDescription[language]],
      ['meta[property="og:title"]', pageTitle[language]],
      ['meta[property="og:description"]', pageDescription[language]],
      ['meta[name="twitter:title"]', pageTitle[language]],
      ['meta[name="twitter:description"]', pageDescription[language]],
    ];
    for (const [selector, content] of metaSelectors) {
      document.querySelector(selector)?.setAttribute('content', content);
    }

    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // ignore write failures
    }
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook co-located with provider
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
