'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LocaleSwitcher } from '../components/LocaleSwitcher';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        padding: '40px 20px',
        maxWidth: 800,
        margin: '0 auto',
        color: '#111',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 32,
        }}
      >
        <h1 style={{ fontSize: 40, margin: 0, letterSpacing: '-0.02em' }}>
          {t('ui.app_name')}
        </h1>
        <LocaleSwitcher />
      </header>

      <p style={{ fontSize: 20, color: '#444', margin: '0 0 40px 0', lineHeight: 1.4 }}>
        {t('ui.tagline')}
      </p>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>Three modes</h2>
        <ul style={{ lineHeight: 1.7, color: '#333', paddingLeft: 20 }}>
          <li>
            <strong>{t('ui.onboarding.welcome')}</strong> — {t('ui.onboarding.intro')}
          </li>
          <li>
            <strong>Guardian</strong> — browser extension that explains every transaction on
            every dApp before you sign.
          </li>
          <li>
            <strong>{t('ui.inspect.title')}</strong> — cross-protocol credit profile for any
            on-chain address.
          </li>
        </ul>
      </section>

      <nav style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link
          href="/onboarding"
          style={{
            padding: '10px 18px',
            border: '1px solid #111',
            borderRadius: 6,
            textDecoration: 'none',
            color: '#111',
            fontSize: 14,
          }}
        >
          {t('ui.onboarding.welcome')} →
        </Link>
        <Link
          href="/inspect"
          style={{
            padding: '10px 18px',
            border: '1px solid #111',
            borderRadius: 6,
            textDecoration: 'none',
            color: '#111',
            fontSize: 14,
          }}
        >
          {t('ui.inspect.title')} →
        </Link>
      </nav>
    </main>
  );
}
