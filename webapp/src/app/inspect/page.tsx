/**
 * Mode 3 — Inspect (credit profile lookup).
 * D10 scaffold.
 */
export default function InspectPage() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 40, maxWidth: 720, margin: '0 auto' }}>
      <h1>Inspect</h1>
      <p style={{ color: '#666' }}>
        Enter any on-chain address to see its cross-protocol credit profile. (Scaffold — lookup UI arrives D10.)
      </p>
      <form style={{ marginTop: 24 }}>
        <input
          type="text"
          placeholder="0x..."
          disabled
          style={{ width: '100%', padding: 12, fontSize: 14, fontFamily: 'monospace' }}
        />
      </form>
    </main>
  );
}
