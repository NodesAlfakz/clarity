"""
Aave V3 adapter.

Indexes Borrow / Repay / LiquidationCall events from the Aave V3 Pool contract
for a specific user. Events are returned as typed dataclasses ready for storage.

Event signatures (from Aave V3 Pool.sol):

    Borrow(address indexed reserve, address user, address indexed onBehalfOf,
           uint256 amount, uint8 interestRateMode, uint256 borrowRate,
           uint16 indexed referralCode)

    Repay(address indexed reserve, address indexed user, address indexed repayer,
          uint256 amount, bool useATokens)

    LiquidationCall(address indexed collateralAsset, address indexed debtAsset,
                    address indexed user, uint256 debtToCover,
                    uint256 liquidatedCollateralAmount, address liquidator,
                    bool receiveAToken)

Note: `user` is NOT indexed for Borrow (only `onBehalfOf` is).  We therefore query
logs by `onBehalfOf` topic for Borrow, and `user` topic for Repay/LiquidationCall.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, asdict
from typing import Any

from ..rpc import RpcClient


# Chain-id 1 (Ethereum mainnet) pool address.
AAVE_V3_POOL_MAINNET = "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2"

# Aave V3 event topic0 signatures (keccak256 of the event name + types).
TOPIC_BORROW = "0xb3d084820fb1a9decffb176436bd02558d15fac9b0ddfed8c465bc7359d7dce0"
TOPIC_REPAY = "0xa534c8dbe71f871f9f3530e97a74f3b723c1392a4fea3dd7e2e7b1d8a0b8f0c2"
TOPIC_LIQUIDATION = "0xe413a321e8681d831f4dbccbca790d2952b56f977908e45be37335533e005286"

# Conservative chunk size for public RPCs that truncate large ranges.
BLOCK_CHUNK = 9_500


def pad_address(addr: str) -> str:
    """Pad a 0x-prefixed 20-byte address to a 32-byte topic value."""
    clean = addr.lower().removeprefix("0x")
    return "0x" + clean.rjust(64, "0")


@dataclass
class AaveEvent:
    kind: str  # 'borrow' | 'repay' | 'liquidation'
    block: int
    tx_hash: str
    reserve: str  # token address
    amount: str  # hex-encoded uint256
    user: str
    raw_log_index: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _parse_borrow(log: dict[str, Any]) -> AaveEvent:
    # topics: [sig, reserve, onBehalfOf, referralCode]
    # data:   user (32 bytes), amount (32), interestRateMode (32), borrowRate (32)
    topics = log["topics"]
    reserve = "0x" + topics[1][-40:]
    on_behalf_of = "0x" + topics[2][-40:]
    data = log["data"][2:]  # strip 0x
    user = "0x" + data[24:64]
    amount = "0x" + data[64:128]
    _ = on_behalf_of  # informative; primary key remains `user`
    return AaveEvent(
        kind="borrow",
        block=int(log["blockNumber"], 16),
        tx_hash=log["transactionHash"],
        reserve=reserve,
        amount=amount,
        user=user,
        raw_log_index=int(log["logIndex"], 16),
    )


def _parse_repay(log: dict[str, Any]) -> AaveEvent:
    # topics: [sig, reserve, user, repayer]
    # data:   amount (32), useATokens (32)
    topics = log["topics"]
    reserve = "0x" + topics[1][-40:]
    user = "0x" + topics[2][-40:]
    amount = "0x" + log["data"][2:66]
    return AaveEvent(
        kind="repay",
        block=int(log["blockNumber"], 16),
        tx_hash=log["transactionHash"],
        reserve=reserve,
        amount=amount,
        user=user,
        raw_log_index=int(log["logIndex"], 16),
    )


def _parse_liquidation(log: dict[str, Any]) -> AaveEvent:
    # topics: [sig, collateralAsset, debtAsset, user]
    # data:   debtToCover (32), liquidatedCollateralAmount (32), liquidator (32), receiveAToken (32)
    topics = log["topics"]
    debt_asset = "0x" + topics[2][-40:]
    user = "0x" + topics[3][-40:]
    debt_to_cover = "0x" + log["data"][2:66]
    return AaveEvent(
        kind="liquidation",
        block=int(log["blockNumber"], 16),
        tx_hash=log["transactionHash"],
        reserve=debt_asset,
        amount=debt_to_cover,
        user=user,
        raw_log_index=int(log["logIndex"], 16),
    )


async def fetch_user_events(
    rpc: RpcClient,
    user: str,
    *,
    from_block: int,
    to_block: int | None = None,
) -> list[AaveEvent]:
    """Fetch Borrow + Repay + LiquidationCall events for a given user address."""
    latest = to_block if to_block is not None else await rpc.block_number()
    user_padded = pad_address(user)

    # Three parallel queries for the three event topics. Each is chunked.
    tasks: list[asyncio.Task[list[dict[str, Any]]]] = []
    for topic0, user_topic_index in (
        (TOPIC_BORROW, 2),       # Borrow: onBehalfOf at topic[2]
        (TOPIC_REPAY, 2),        # Repay: user at topic[2]
        (TOPIC_LIQUIDATION, 3),  # LiquidationCall: user at topic[3]
    ):
        tasks.append(asyncio.create_task(
            _fetch_chunked(rpc, topic0, user_topic_index, user_padded, from_block, latest)
        ))

    borrows, repays, liquidations = await asyncio.gather(*tasks)
    events: list[AaveEvent] = []
    events.extend(_parse_borrow(log) for log in borrows)
    events.extend(_parse_repay(log) for log in repays)
    events.extend(_parse_liquidation(log) for log in liquidations)
    events.sort(key=lambda e: (e.block, e.raw_log_index))
    return events


async def _fetch_chunked(
    rpc: RpcClient,
    topic0: str,
    user_topic_index: int,
    user_padded: str,
    from_block: int,
    to_block: int,
) -> list[dict[str, Any]]:
    """Walk the block range in BLOCK_CHUNK windows, aggregating results."""
    topics: list[str | list[str] | None] = [topic0, None, None, None]
    topics[user_topic_index] = user_padded

    collected: list[dict[str, Any]] = []
    start = from_block
    while start <= to_block:
        end = min(start + BLOCK_CHUNK - 1, to_block)
        try:
            logs = await rpc.get_logs(
                from_block=start,
                to_block=end,
                address=AAVE_V3_POOL_MAINNET,
                topics=topics,
            )
            collected.extend(logs)
        except Exception:
            # Non-fatal — continue walking; a gap is better than a total failure.
            pass
        start = end + 1
    return collected
