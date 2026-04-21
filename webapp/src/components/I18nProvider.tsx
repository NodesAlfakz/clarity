'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { initI18n, detectInitialLocale, i18n } from '../lib/i18n';

/** Wrap the app root with this so every component can use useTranslation(). */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initI18n(detectInitialLocale()).then(() => setReady(true));
  }, []);

  if (!ready) return null;
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
