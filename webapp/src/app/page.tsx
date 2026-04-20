/**
 * Landing page.
 *
 * D8-9 scaffold. Chat-based onboarding and language selector arrive shortly.
 */
import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '40px 20px', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 48, margin: '0 0 16px 0' }}>Clarity</h1>
      <p style={{ fontSize: 20, color: '#444', margin: '0 0 32px 0' }}>
        Understand what you're signing — in your language.
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 22 }}>Three modes</h2>
        <ul style={{ lineHeight: 1.8, color: '#333' }}>
          <li>
            <strong>Onboarding Copilot</strong> — chat-first newcomer guide through your first DeFi actions
          </li>
          <li>
            <strong>Guardian</strong> — browser extension that analyzes every transaction before you sign
          </li>
          <li>
            <strong>Inspect</strong> — credit profile for any on-chain address
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 22 }}>Seven languages</h2>
        <p style={{ color: '#444' }}>EN · RU · ZH · ES · TR · KO · PT</p>
      </section>

      <nav style={{ display: 'flex', gap: 16 }}>
        <Link href="/onboarding" style={{ textDecoration: 'underline' }}>
          Start onboarding
        </Link>
        <Link href="/inspect" style={{ textDecoration: 'underline' }}>
          Inspect an address
        </Link>
      </nav>

      <footer style={{ marginTop: 64, color: '#888', fontSize: 12 }}>
        Scaffold build · full UI arrives D8-10
      </footer>
    </main>
  );
}
