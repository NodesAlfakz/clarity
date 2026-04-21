/**
 * i18next initialisation for the webapp.
 *
 * Loads all 7 locale bundles statically from @clarity/shared at build time.
 * Locale detection order: URL ?lang=XX, localStorage, browser.
 */
'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { RESOURCES, SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale } from '@clarity/shared';

const STORAGE_KEY = 'clarity-locale';

export function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;

  const url = new URL(window.location.href);
  const urlLang = url.searchParams.get('lang');
  if (urlLang && (SUPPORTED_LOCALES as readonly string[]).includes(urlLang)) {
    return urlLang as Locale;
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
    return stored as Locale;
  }
  const browser = navigator.language.toLowerCase().split('-')[0] ?? '';
  if ((SUPPORTED_LOCALES as readonly string[]).includes(browser)) {
    return browser as Locale;
  }
  return DEFAULT_LOCALE;
}

export async function setLocale(locale: Locale): Promise<void> {
  await i18n.changeLanguage(locale);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, locale);
  }
}

let initialized = false;

export async function initI18n(locale: Locale): Promise<typeof i18n> {
  if (initialized) {
    if (i18n.language !== locale) await i18n.changeLanguage(locale);
    return i18n;
  }
  await i18n.use(initReactI18next).init({
    resources: Object.fromEntries(
      SUPPORTED_LOCALES.map((loc) => [loc, { translation: RESOURCES[loc] }]),
    ),
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    interpolation: { escapeValue: false },
  });
  initialized = true;
  return i18n;
}

export { i18n };
