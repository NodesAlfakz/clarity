/**
 * Localization constants and helpers.
 */

import type { Locale } from './types';

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'ru', 'zh', 'es', 'tr', 'ko', 'pt'] as const;

export const LOCALE_NAMES: Record<Locale, { native: string; english: string }> = {
  en: { native: 'English', english: 'English' },
  ru: { native: 'Русский', english: 'Russian' },
  zh: { native: '中文', english: 'Chinese' },
  es: { native: 'Español', english: 'Spanish' },
  tr: { native: 'Türkçe', english: 'Turkish' },
  ko: { native: '한국어', english: 'Korean' },
  pt: { native: 'Português', english: 'Portuguese' },
};

export const DEFAULT_LOCALE: Locale = 'en';

/**
 * Detect user locale from browser settings. Falls back to English.
 */
export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  const lang = navigator.language.toLowerCase().split('-')[0] ?? '';
  return (SUPPORTED_LOCALES as readonly string[]).includes(lang)
    ? (lang as Locale)
    : DEFAULT_LOCALE;
}
