'use client';

import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, LOCALE_NAMES, type Locale } from '@clarity/shared';
import { setLocale } from '../lib/i18n';

export function LocaleSwitcher() {
  const { t, i18n } = useTranslation();
  const current = i18n.language as Locale;
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
        color: '#444',
      }}
    >
      <span>{t('ui.label.language')}:</span>
      <select
        value={current}
        onChange={(e) => {
          void setLocale(e.target.value as Locale);
        }}
        style={{
          padding: '4px 8px',
          fontSize: 13,
          border: '1px solid #ccc',
          borderRadius: 4,
          background: 'white',
        }}
      >
        {SUPPORTED_LOCALES.map((loc) => (
          <option key={loc} value={loc}>
            {LOCALE_NAMES[loc].native}
          </option>
        ))}
      </select>
    </label>
  );
}
