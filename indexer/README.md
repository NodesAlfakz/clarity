# @clarity/indexer (Python)

Cross-protocol lending history ingestion for Mode 3 credit scoring.

## Scope

Indexes Borrow / Repay / Liquidation events across:

- Aave V3 (Ethereum, Base, Arbitrum, Optimism)
- Compound V3 (Ethereum, Base, Arbitrum)
- Morpho Blue (Ethereum, Base)
- MakerDAO / Sky Lending (Ethereum)
- Fluid (Ethereum, Base, Arbitrum)
- Kamino Lend (Solana — post-hackathon SVM adapter)

## Dev

```bash
cd indexer
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m src.main --address 0x...
```

## Status

D5-6 scaffold: protocol registry in place, adapter implementations pending.
