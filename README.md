# Clarity

**Crypto safety & onboarding agent. Localized to 7 native languages.**

Understand what you're signing — in your language.

## What is it

Clarity is a three-mode crypto agent that grows with the user from absolute newcomer to professional DeFi investor.

### Mode 1 — Onboarding Copilot
Chat-first web app that guides newcomers through their first DeFi actions in their native language. Wallet selection → fiat on-ramp → first swap → security setup → first productive DeFi activity.

### Mode 2 — Guardian
Chrome extension that intercepts every transaction before the wallet popup. Analyzes contract, counterparty, risk — explains in the user's native language. Integrates with Blockaid, Tenderly, and our in-house counterparty scoring engine.

### Mode 3 — Inspect
Cross-protocol credit profile for any on-chain address. Lending history across Aave, Compound, Morpho, Maker, Kamino. Repayments, liquidations, sybil detection, behavioral classification. Used internally by Mode 1 and Mode 2 for counterparty checks — also exposed as a B2B API for lending protocols.

All three modes share one engine. All three are localized to EN, RU, ZH, ES, TR, KO, PT.

## Why localization matters

Every major pre-sign safety tool is English-only. Yet 65%+ of active crypto users speak Chinese, Russian, Spanish, Turkish, Korean, Vietnamese, or Portuguese as their native language. They sign transactions without fully understanding English risk warnings. Clarity is the first to fix that.

## Architecture

```
Extension (Chrome MV3)      Webapp (Next.js)         B2B API consumers
         │                          │                         │
         └───────────┬──────────────┴────────────┬────────────┘
                     │                           │
              Engine (Node.js API)       Indexer (Python)
                     │                           │
                     └───────────┬───────────────┘
                                 │
                         Shared types + utils
```

## Repository structure

```
clarity/
├── extension/       — Chrome extension (Mode 2)
├── webapp/          — Next.js onboarding + inspect UI (Mode 1 + Mode 3 frontend)
├── engine/          — Node.js API for analysis, scoring, translation
├── indexer/         — Python pipeline for on-chain lending history
├── shared/          — TypeScript types and utilities shared across packages
└── docs/            — architecture, API docs
```

## Getting started

```bash
# Install dependencies (npm workspaces)
npm install

# Develop extension
npm run dev --workspace=extension

# Develop webapp
npm run dev --workspace=webapp

# Run engine API locally
npm run dev --workspace=engine

# Run indexer
cd indexer && python -m src.main
```

## Target hackathon

ETHGlobal Open Agents — April 24 to May 6, 2026.

## License

MIT
