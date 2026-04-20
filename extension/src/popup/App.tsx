/**
 * Popup UI (opens when user clicks extension icon).
 *
 * D1-2 scaffold. Full analysis UI lands in D3-4 after Engine integration.
 */
import { useEffect, useState } from 'react';
import { SUPPORTED_LOCALES, LOCALE_NAMES, detectLocale, type Locale } from '@clarity/shared';

export function App() {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

  return (
    <div style={{ minWidth: 320, padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 16, margin: '0 0 8px 0' }}>Clarity</h1>
      <p style={{ fontSize: 12, color: '#666', margin: '0 0 16px 0' }}>
        Pre-sign safety · {LOCALE_NAMES[locale].native}
      </p>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        style={{ width: '100%', padding: 6, fontSize: 12 }}
      >
        {SUPPORTED_LOCALES.map((loc) => (
          <option key={loc} value={loc}>
            {LOCALE_NAMES[loc].native} ({LOCALE_NAMES[loc].english})
          </option>
        ))}
      </select>
      <div style={{ marginTop: 16, fontSize: 11, color: '#999' }}>
        Status: scaffold — analysis engine not yet connected
      </div>
    </div>
  );
}
