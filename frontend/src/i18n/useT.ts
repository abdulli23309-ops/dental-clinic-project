'use client';

import { useState, useEffect, useCallback } from 'react';
import { SupportedLocale } from '@/content/ui-copy';

export type TranslationDictionary = Record<string, any>;

interface UseTReturn {
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  isUrdu: boolean;
  isRtl: boolean;
  dir: 'ltr' | 'rtl';
}

const DICTIONARIES: Record<SupportedLocale, TranslationDictionary> = {
  en: {} as TranslationDictionary,
  ur: {} as TranslationDictionary,
};

let loaded = false;

async function loadDictionaries() {
  if (loaded) return;
  try {
    const [enRes, urRes] = await Promise.all([
      fetch('/i18n/en.json').then((r) => r.json()),
      fetch('/i18n/ur.json').then((r) => r.json()),
    ]);
    DICTIONARIES.en = enRes;
    DICTIONARIES.ur = urRes;
  } catch {
    // Fallback: dictionaries remain empty; useT returns key
  }
  loaded = true;
}

function resolveKey(dict: TranslationDictionary, key: string): string {
  const parts = key.split('.');
  let current: any = dict;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return key;
    current = current[part];
  }
  if (typeof current === 'string') return current;
  return key;
}

function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_match, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : `{${key}}`;
  });
}

export function useT(): UseTReturn {
  const [locale, setLocaleState] = useState<SupportedLocale>('en');

  useEffect(() => {
    loadDictionaries();
    const saved = localStorage.getItem('marlow_locale_preference');
    if (saved === 'en' || saved === 'ur') {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    localStorage.setItem('marlow_locale_preference', newLocale);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale;
      document.documentElement.dir = newLocale === 'ur' ? 'rtl' : 'ltr';
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const dict = DICTIONARIES[locale] || DICTIONARIES.en;
      const str = resolveKey(dict, key);
      return interpolate(str, params);
    },
    [locale]
  );

  const isUrdu = locale === 'ur';
  const isRtl = locale === 'ur';
  const dir = isRtl ? 'rtl' : 'ltr';

  return { t, locale, setLocale, isUrdu, isRtl, dir };
}

export function useLocale(): { locale: SupportedLocale; setLocale: (locale: SupportedLocale) => void; isUrdu: boolean; isRtl: boolean; dir: 'ltr' | 'rtl' } {
  const { locale, setLocale, isUrdu, isRtl, dir } = useT();
  return { locale, setLocale, isUrdu, isRtl, dir };
}