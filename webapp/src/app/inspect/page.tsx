'use client';

import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { LocaleSwitcher } from '../../components/LocaleSwitcher';

// API proxies via Next.js route handler so everything runs behind a single origin.
const API_PREFIX = '';

interface CreditProfileResponse {
  address: string;
  score: number;
  classification: string;
  sizeTier: string;
  history: {
    totalBorrowed: string;
    totalRepaid: string;
    liquidations: number;
    activeLoans: number;
    protocolsUsed: string[];
  };
  riskFactors: Array<{ code: string; description: { fallback: string } }>;
  sybilCluster: { clusterId: string; memberCount: number } | null;
  updatedAt: number;
}

interface ErrorResponse {
  error: string;
  hint?: string;
}

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: CreditProfileResponse }
  | { status: 'error'; error: ErrorResponse };

export default function InspectPage() {
  const { t } = useTranslation();
  const [address, setAddress] = useState('');
  const [state, setState] = useState<LoadState>({ status: 'idle' });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      setState({
        status: 'error',
        error: { error: 'invalid address', hint: 'Expected 0x followed by 40 hex characters.' },
      });
      return;
    }
    setState({ status: 'loading' });
    try {
      const res = await fetch(`${API_PREFIX}/api/score/${trimmed}`);
      const body = await res.json();
      if (!res.ok) {
        setState({ status: 'error', error: body as ErrorResponse });
        return;
      }
      setState({ status: 'success', data: body as CreditProfileResponse });
    } catch (err) {
      setState({
        status: 'error',
        error: {
          error: 'network_error',
          hint:
            err instanceof Error
              ? err.message
              : 'Engine not reachable. Is it running on :8787?',
        },
      });
    }
  }

  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        padding: '40px 20px',
        maxWidth: 760,
        margin: '0 auto',
        color: '#111',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <Link href="/" style={{ color: '#666', textDecoration: 'none', fontSize: 14 }}>
          ← {t('ui.app_name')}
        </Link>
        <LocaleSwitcher />
      </header>

      <h1 style={{ fontSize: 32, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
        {t('ui.inspect.title')}
      </h1>
      <p style={{ color: '#666', margin: '0 0 24px 0' }}>
        {t('ui.section.history')} · Aave V3
      </p>

      <form
        onSubmit={onSubmit}
        style={{ display: 'flex', gap: 8, marginBottom: 32 }}
      >
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={t('ui.inspect.placeholder')}
          style={{
            flex: 1,
            padding: 12,
            fontSize: 14,
            fontFamily: 'ui-monospace, monospace',
            border: '1px solid #ccc',
            borderRadius: 6,
          }}
        />
        <button
          type="submit"
          disabled={state.status === 'loading'}
          style={{
            padding: '12px 20px',
            fontSize: 14,
            background: '#111',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: state.status === 'loading' ? 'not-allowed' : 'pointer',
            opacity: state.status === 'loading' ? 0.6 : 1,
          }}
        >
          {t('ui.inspect.lookup')}
        </button>
      </form>

      {state.status === 'loading' && (
        <div style={{ color: '#666', padding: 24 }}>Loading…</div>
      )}

      {state.status === 'error' && (
        <ErrorPanel error={state.error} />
      )}

      {state.status === 'success' && (
        <ProfileCard profile={state.data} />
      )}
    </main>
  );
}

function ErrorPanel({ error }: { error: ErrorResponse }) {
  return (
    <div
      style={{
        background: '#fef4f4',
        border: '1px solid #fcc',
        borderRadius: 6,
        padding: 16,
        color: '#933',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{error.error}</div>
      {error.hint && <div style={{ fontSize: 13, color: '#733' }}>{error.hint}</div>}
    </div>
  );
}

function ProfileCard({ profile }: { profile: CreditProfileResponse }) {
  const { t } = useTranslation();
  const borrowed = Number(profile.history.totalBorrowed);
  const repaid = Number(profile.history.totalRepaid);
  const scoreColor =
    profile.score >= 70 ? '#1a7f37' : profile.score >= 40 ? '#9a6700' : '#cf222e';
  return (
    <article
      style={{
        border: '1px solid #e5e5e5',
        borderRadius: 8,
        padding: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 48, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
          {profile.score}
        </div>
        <div>
          <div style={{ fontSize: 14, color: '#666' }}>{t('ui.label.score')}</div>
          <div style={{ fontSize: 13, color: '#333', fontFamily: 'ui-monospace, monospace' }}>
            {profile.address}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Metric label={t('ui.label.classification')} value={t(`classification.${profile.classification}`)} />
        <Metric label="Size tier" value={t(`size.${profile.sizeTier}`)} />
        <Metric label={t('ui.label.borrowed')} value={formatUsd(borrowed)} />
        <Metric label={t('ui.label.repaid')} value={formatUsd(repaid)} />
        <Metric label={t('ui.label.liquidations')} value={String(profile.history.liquidations)} />
        <Metric label={t('ui.label.active_loans')} value={String(profile.history.activeLoans)} />
      </div>

      {profile.history.protocolsUsed.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', marginBottom: 4 }}>
            {t('ui.label.protocol')}
          </div>
          <div style={{ fontSize: 14 }}>{profile.history.protocolsUsed.join(', ')}</div>
        </div>
      )}

      {profile.riskFactors.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', marginBottom: 4 }}>
            Risk factors
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#733' }}>
            {profile.riskFactors.map((rf) => (
              <li key={rf.code}>{rf.description.fallback}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: '#666',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}
