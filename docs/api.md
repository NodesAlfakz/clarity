# Clarity Engine API

Base URL (dev): `http://localhost:8787`

All endpoints return JSON. All request bodies are validated with Zod.

## `POST /analyze`

Analyzes a transaction before the user signs.

### Request

```json
{
  "chainId": 1,
  "tx": {
    "from": "0x...",
    "to": "0x...",
    "value": "0x0",
    "data": "0xa9059cbb...",
    "gas": "0x5208",
    "gasPrice": "0x4a817c800"
  },
  "locale": "ru"
}
```

### Response — `TxAnalysis`

See `shared/src/types.ts#TxAnalysis`. Includes:

- Risk level + flags
- Human-readable summary (localized)
- Tenderly simulation result
- Counterparty snapshot (if contract)
- Alternatives (other routes / DEXes)

## `GET /score/:address`

Returns the credit profile for a given on-chain address.

### Response — `CreditProfile`

See `shared/src/types.ts#CreditProfile`. Includes score (0-100), classification, lending history aggregates, sybil cluster info.

## `POST /translate`

Localizes a `LocalizedString` via Claude (with caching).

### Request

```json
{
  "locale": "zh",
  "content": {
    "fallback": "This transaction approves unlimited USDC spending by Uniswap router.",
    "vars": { "token": "USDC", "spender": "Uniswap" }
  }
}
```

### Response

```json
{
  "locale": "zh",
  "translated": "此交易授予 Uniswap 路由器无限 USDC 支出权限。",
  "cached": true
}
```

## `GET /healthz`

Liveness probe.

```json
{ "ok": true, "service": "clarity-engine", "version": "0.1.0" }
```
