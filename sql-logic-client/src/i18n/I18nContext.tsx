import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Locale = 'en' | 'zh';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Lazy-loaded locale data
let localeData: Record<string, any> = {};

async function loadLocale(locale: Locale): Promise<Record<string, any>> {
  try {
    if (locale === 'zh') {
      const data = await import('./locales/zh.json');
      return data.default || data;
    }
    const data = await import('./locales/en.json');
    return data.default || data;
  } catch {
    return {};
  }
}

/** Resolve a dot-separated key in a nested object, e.g. "chat.autoConfirm" */
function resolveKey(obj: Record<string, any>, key: string): string | undefined {
  const parts = key.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return typeof current === 'string' ? current : undefined;
}

/** Replace {placeholder} tokens in a string */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = params[key];
    return val != null ? String(val) : `{${key}}`;
  });
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('app-locale') as Locale | null;
    return saved === 'en' || saved === 'zh' ? saved : 'en';
  });
  const [data, setData] = useState<Record<string, any>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    localStorage.setItem('app-locale', locale);
    loadLocale(locale).then((d) => {
      localeData = d;
      setData(d);
      setReady(true);
      document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    });
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const raw = resolveKey(data, key);
    if (raw == null) {
      // Fallback to English
      const fallback = resolveKey(localeData, key);
      if (fallback == null) return key;
      return interpolate(fallback, params);
    }
    return interpolate(raw, params);
  }, [data]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
