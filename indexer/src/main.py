"""
Clarity indexer CLI entrypoint.

Usage:
    python -m src.main --address 0x... [--blocks 100000] [--refresh]

Fetches Aave V3 Borrow/Repay/LiquidationCall events for the given address,
derives a credit profile via `scoring.compute_profile`, persists both to DuckDB,
and prints the profile as JSON (matching the shape returned by the Engine
`/score/:address` endpoint).

Default block range is `latest - 100000` through `latest` (~2 weeks on mainnet)
to respect public-RPC limits. Use `--blocks N` to extend.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
import time

from .rpc import RpcClient
from .protocols.aave_v3 import fetch_user_events
from .scoring import compute_profile
from .storage import init, save_events, save_profile, load_profile


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="clarity-indexer")
    p.add_argument("--address", required=True, help="Wallet address (0x...)")
    p.add_argument("--blocks", type=int, default=100_000, help="How many blocks back to scan")
    p.add_argument("--refresh", action="store_true", help="Bypass cached profile")
    p.add_argument("--from-block", type=int, default=None, help="Explicit fromBlock")
    return p.parse_args()


async def run(address: str, blocks: int, refresh: bool, from_block: int | None) -> dict:
    init()

    if not refresh:
        cached = load_profile(address)
        if cached is not None:
            return cached

    rpc = RpcClient()
    latest = await rpc.block_number()
    start_block = from_block if from_block is not None else max(0, latest - blocks)

    print(
        f"# indexing address={address} blocks={start_block}..{latest}",
        file=sys.stderr,
    )
    events = await fetch_user_events(rpc, address, from_block=start_block, to_block=latest)
    print(f"# events fetched: {len(events)}", file=sys.stderr)

    save_events([e.to_dict() for e in events])

    profile = compute_profile(address.lower(), events, now=int(time.time()))
    save_profile(profile.to_dict())
    return profile.to_dict()


def main() -> int:
    args = parse_args()
    result = asyncio.run(run(args.address, args.blocks, args.refresh, args.from_block))
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
