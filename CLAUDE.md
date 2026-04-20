# Clarity — AI agent context

**Project:** Clarity. Crypto safety & onboarding agent with native-language localization.
**Target:** ETHGlobal Open Agents hackathon submission (April 24 — May 6, 2026).
**Execution model:** All implementation through AI agents. Owner drives product decisions and validation.

## Three modes

1. **Onboarding Copilot** (webapp) — chat-first newcomer guide
2. **Guardian** (extension) — pre-sign transaction safety
3. **Inspect** (engine+webapp) — cross-protocol credit score for any address

## Shared engine responsibilities

- Transaction analysis (Tenderly simulation + Blockaid threat check + contract parsing)
- Credit scoring (cross-protocol lending history indexing)
- Sybil detection (cluster analysis on funding patterns)
- Localization (static i18next + dynamic Claude API translations)

## Target languages

EN, RU, ZH, ES, TR, KO, PT.

## Target chains

Ethereum mainnet, Base, Arbitrum, Optimism (EVM). Solana planned for Mode 2 extension after hackathon MVP.

## Technical decisions

- **Extension:** Chrome Manifest V3, TypeScript, React for popup UI
- **Webapp:** Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui, ConnectKit for wallet connection
- **Engine:** Node.js, Fastify (faster than Express), TypeScript
- **Indexer:** Python 3.9+, web3.py, async SQLAlchemy, Postgres or DuckDB for dev
- **AI:** Claude API (Anthropic SDK) for transaction explanations and dynamic translations
- **Data sources:** Alchemy RPC, Etherscan API, Tenderly API, Blockaid API, The Graph subgraphs

## How agents collaborate

Each workspace (`extension/`, `webapp/`, `engine/`, `indexer/`, `shared/`) is self-contained. Shared types live in `shared/`. Agents working on different workspaces do not modify each other's code — they coordinate through:

1. Shared type definitions in `shared/src/types.ts`
2. Documented API contracts in `docs/api.md`
3. Changes to shared types trigger review across dependent workspaces

## Principles

- Ship one end-to-end journey over many half-baked features
- Localization is a first-class feature, not an afterthought
- Every UI string must work in all 7 languages from day one
- Demo-friendly beats complete — we have 13 days
