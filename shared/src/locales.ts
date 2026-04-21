/**
 * Locale bundle loader.
 *
 * Imports all seven locale JSON files at build time and exposes them as a
 * typed map. Used by extension, webapp, and engine to seed i18next and to
 * satisfy typed lookups of translation keys.
 *
 * For runtime dynamic translations (e.g. LLM-generated tx explanations),
 * use the engine `/translate` endpoint instead.
 */

import en from '../locales/en.json' with { type: 'json' };
import ru from '../locales/ru.json' with { type: 'json' };
import zh from '../locales/zh.json' with { type: 'json' };
import es from '../locales/es.json' with { type: 'json' };
import tr from '../locales/tr.json' with { type: 'json' };
import ko from '../locales/ko.json' with { type: 'json' };
import pt from '../locales/pt.json' with { type: 'json' };

import type { Locale } from './types.js';

/** Static resource bundles keyed by Locale. Shape matches `en.json`. */
export const RESOURCES: Record<Locale, typeof en> = {
  en,
  ru,
  zh,
  es,
  tr,
  ko,
  pt,
};

/** Canonical English bundle — used to derive translation key types. */
export const EN_BUNDLE = en;
export type ResourceShape = typeof en;
