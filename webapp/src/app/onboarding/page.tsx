'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { LocaleSwitcher } from '../../components/LocaleSwitcher';

type OnboardingPath = 'newcomer' | 'has_wallet' | 'active';

export default function OnboardingPage() {
  const { t } = useTranslation();
  const [path, setPath] = useState<OnboardingPath | null>(null);

  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        padding: '40px 20px',
        maxWidth: 720,
        margin: '0 auto',
        color: '#111',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Link href="/" style={{ color: '#666', textDecoration: 'none', fontSize: 14 }}>
          ← {t('ui.app_name')}
        </Link>
        <LocaleSwitcher />
      </header>

      <h1 style={{ fontSize: 36, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
        {t('ui.onboarding.welcome')}
      </h1>
      <p style={{ fontSize: 18, color: '#666', margin: '0 0 32px 0' }}>
        {t('ui.onboarding.intro')}
      </p>

      {!path && (
        <div style={{ display: 'grid', gap: 12 }}>
          <PathButton
            label={t('ui.onboarding.path.newcomer')}
            onClick={() => setPath('newcomer')}
          />
          <PathButton
            label={t('ui.onboarding.path.has_wallet')}
            onClick={() => setPath('has_wallet')}
          />
          <PathButton
            label={t('ui.onboarding.path.active')}
            onClick={() => setPath('active')}
          />
        </div>
      )}

      {path && <PathStepList path={path} onBack={() => setPath(null)} />}
    </main>
  );
}

function PathButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '20px 24px',
        fontSize: 16,
        textAlign: 'left',
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: 8,
        cursor: 'pointer',
        color: '#111',
      }}
    >
      {label}
    </button>
  );
}

const PATH_STEPS: Record<OnboardingPath, string[]> = {
  newcomer: ['install_wallet', 'on_ramp', 'first_swap', 'security', 'first_defi'],
  has_wallet: ['security', 'first_swap', 'first_defi'],
  active: ['first_defi'],
};

function PathStepList({ path, onBack }: { path: OnboardingPath; onBack: () => void }) {
  const { t } = useTranslation();
  const steps = PATH_STEPS[path];
  return (
    <div>
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: '#666',
          fontSize: 14,
          cursor: 'pointer',
          padding: 0,
          marginBottom: 16,
        }}
      >
        ← {t('ui.button.back')}
      </button>
      <ol style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 16 }}>
        {steps.map((stepId, idx) => (
          <li key={stepId} style={{ marginBottom: 12 }}>
            <strong>{t(`ui.onboarding.step.${stepId}`)}</strong>
            {idx === 0 && (
              <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                Chat-driven guided flow lands in the final build. This scaffold shows path
                branching + localized step labels.
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
