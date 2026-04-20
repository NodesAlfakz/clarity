# Clarity — architecture

## High-level flow

```
 ┌───────────────────────┐      ┌──────────────────────┐       ┌─────────────────────┐
 │  Extension (Chrome)   │      │   Webapp (Next.js)   │       │  B2B API consumers  │
 │   Mode 2 — Guardian   │      │ Mode 1 — Onboarding  │       │   lending protos    │
 │                       │      │ Mode 3 — Inspect UI  │       │                     │
 └──────────┬────────────┘      └──────────┬───────────┘       └──────────┬──────────┘
            │                              │                              │
            └──────────────────┬───────────┴──────────────────────────────┘
                               ▼
                   ┌───────────────────────┐
                   │   Engine (Fastify)    │
                   │   /analyze  /score    │
                   │   /translate          │
                   └──────────┬────────────┘
                              │
          ┌───────────────────┼────────────────────────┐
          ▼                   ▼                        ▼
 ┌────────────────┐  ┌─────────────────┐   ┌───────────────────────┐
 │ Tenderly sim   │  │ Blockaid threat │   │  Indexer (Python)      │
 │ Contract parse │  │ Sanctions list  │   │  Lending history       │
 │ Etherscan ABI  │  │                 │   │  Sybil clustering      │
 └────────────────┘  └─────────────────┘   └───────────────────────┘
```

## Package boundaries

- **`shared/`** — TypeScript types (`TxAnalysis`, `CreditProfile`, `LocalizedString`, `Locale`, chain metadata). Imported by extension, webapp, engine. Single source of truth for the data contract.
- **`extension/`** — Chrome MV3 (content script + bridge + service worker + React popup). Talks to Engine via HTTPS.
- **`webapp/`** — Next.js 14 App Router. Mode 1 onboarding flow. Mode 3 Inspect UI. SSR uses engine API for initial scoring.
- **`engine/`** — Fastify API. Stateless. Fans out to Tenderly / Blockaid / Etherscan / Anthropic. Reads from indexer datastore for `/score`.
- **`indexer/`** — Python async pipeline. Populates scoring database. Runs on a cron or on-demand for target addresses.

## Data stores

- **Dev:** DuckDB single file in `indexer/.data/clarity.duckdb`
- **Prod (post-hackathon):** Postgres with TimescaleDB for event timeseries

## Localization

Two translation tracks:

1. **Static UI strings** — pre-translated JSON via i18next (`locales/en.json`, etc.). Committed to the repo.
2. **Dynamic explanations** — per-transaction text generated via Claude API. Uses prompt caching to amortize the crypto-glossary system prompt across requests. Cached results keyed by (locale, tx-analysis-hash).

## Security model

- Extension never handles private keys — all signing goes through the user's wallet popup.
- Engine is stateless: no user data persisted beyond the scoring DB, which contains only public on-chain history.
- No telemetry beyond basic request logs.
- API keys live in engine `.env`, never shipped to the extension or webapp.
