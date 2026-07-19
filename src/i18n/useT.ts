import { useEffect, useState, useCallback } from 'react';
import { translations, type Lang } from './translations';

const STORAGE_KEY = 'app_lang';
const EVENT = 'app_lang_change';

export const getLang = (): Lang => {
  const v = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) as Lang | null;
  return v === 'si' || v === 'ta' ? v : 'en';
};

export const setLangGlobal = (lang: Lang) => {
  localStorage.setItem(STORAGE_KEY, lang);
  window.dispatchEvent(new Event(EVENT));
};

/**
 * Dependency-free translation hook. Reactive across the app via a window event.
 * Usage: const { t, lang, setLang } = useT();  →  t('appointments')
 * Falls back to the key's English value, then the key itself.
 */
export const useT = () => {
  const [lang, setLangState] = useState<Lang>(getLang());

  useEffect(() => {
    const handler = () => setLangState(getLang());
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  const t = useCallback((key: string) => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry.en || key;
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangGlobal(l), []);

  return { t, lang, setLang };
};

export default useT;
