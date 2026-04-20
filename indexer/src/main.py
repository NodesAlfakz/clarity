"""
Clarity indexer entrypoint.

Usage:
    python -m src.main --address 0x... [--protocol aave-v3] [--chain 1]

D5-6 scaffold. The scoring algorithm, sybil clustering, and the full protocol
list (Aave/Compound/Morpho/Maker/Kamino/Fluid) arrive in phased commits.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from dataclasses import asdict

from .protocols.registry import PROTOCOLS


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="clarity-indexer")
    parser.add_argument("--address", required=True, help="Address to index (0x...)")
    parser.add_argument("--protocol", default="all", help="Protocol slug or 'all'")
    parser.add_argument("--chain", type=int, default=1, help="Chain id")
    return parser.parse_args()


async def run(address: str, protocol: str, chain_id: int) -> dict:
    # TODO(D5-6): instantiate protocol adapters, fetch Borrow/Repay/Liquidation events
    return {
        "address": address.lower(),
        "chainId": chain_id,
        "protocol": protocol,
        "events": [],
        "note": "scaffold — event indexing lands D5-6",
        "availableProtocols": [p.slug for p in PROTOCOLS],
    }


def main() -> int:
    args = parse_args()
    result = asyncio.run(run(args.address, args.protocol, args.chain))
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
