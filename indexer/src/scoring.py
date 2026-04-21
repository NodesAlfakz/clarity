"""
Credit scoring algorithm.

Takes a list of lending events (Borrow / Repay / LiquidationCall) for a user
and derives a composite credit profile.

Output shape mirrors TypeScript `CreditProfile` in @clarity/shared/types.ts.
The JSON serialization is consumed by the Engine `/score/:address` route.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

from .protocols.aave_v3 import AaveEvent


BehaviorType = Literal[
    "hodler",
    "trader",
    "yield_farmer",
    "sybil_farmer",
    "responsible_borrower",
    "risky_borrower",
    "defaulter",
    "new_wallet",
]


SizeTier = Literal["whale", "mid", "small", "dust"]


@dataclass
class CreditProfile:
    address: str
    score: int  # 0-100
    classification: BehaviorType
    size_tier: SizeTier
    total_borrowed_usd: float
    total_repaid_usd: float
    liquidations: int
    active_loans: int
    protocols_used: list[str]
    first_activity_at: int  # unix seconds, 0 if no activity
    last_activity_at: int
    risk_factors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "address": self.address.lower(),
            "score": self.score,
            "classification": self.classification,
            "history": {
                "totalBorrowed": str(self.total_borrowed_usd),
                "totalRepaid": str(self.total_repaid_usd),
                "liquidations": self.liquidations,
                "activeLoans": self.active_loans,
                "protocolsUsed": self.protocols_used,
                "firstActivityAt": self.first_activity_at,
                "lastActivityAt": self.last_activity_at,
            },
            "riskFactors": [
                {"code": rf, "severity": "caution", "description": {"fallback": rf.replace("_", " ")}}
                for rf in self.risk_factors
            ],
            "sybilCluster": None,
            "sizeTier": self.size_tier,
            "updatedAt": self.last_activity_at,
        }


# Rough USD price table for common reserves. Real implementation would query
# Chainlink or CoinGecko; for the hackathon MVP this is good enough to sort
# magnitudes (whale vs mid vs small).
_RESERVE_USD_PRICE: dict[str, float] = {
    # USDC mainnet
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": 1.0,
    # USDT mainnet
    "0xdac17f958d2ee523a2206206994597c13d831ec7": 1.0,
    # DAI
    "0x6b175474e89094c44da98b954eedeac495271d0f": 1.0,
    # WETH — rough, updated manually for demo
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": 3000.0,
    # wBTC — rough
    "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": 65000.0,
    # stETH — rough
    "0xae7ab96520de3a18e5e111b5eaab095312d7fe84": 3000.0,
}


def _usd_amount(reserve: str, amount_hex: str) -> float:
    raw = int(amount_hex, 16)
    price = _RESERVE_USD_PRICE.get(reserve.lower())
    if price is None:
        # Unknown reserve — assume 18 decimals and $1 placeholder.
        return raw / 1e18
    # Best-effort decimals: USDC/USDT are 6, others 18.
    decimals = 6 if reserve.lower() in {
        "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "0xdac17f958d2ee523a2206206994597c13d831ec7",
    } else 18
    return (raw / (10 ** decimals)) * price


def compute_profile(address: str, events: list[AaveEvent], now: int) -> CreditProfile:
    """Derive CreditProfile from a chronologically-sorted event list."""
    total_borrowed = 0.0
    total_repaid = 0.0
    liquidations = 0
    # Track outstanding per-reserve borrowed minus repaid to estimate active loans.
    per_reserve: dict[str, float] = {}

    first_ts = 0
    last_ts = 0

    for e in events:
        usd = _usd_amount(e.reserve, e.amount)
        if e.kind == "borrow":
            total_borrowed += usd
            per_reserve[e.reserve] = per_reserve.get(e.reserve, 0.0) + usd
        elif e.kind == "repay":
            total_repaid += usd
            per_reserve[e.reserve] = per_reserve.get(e.reserve, 0.0) - usd
        elif e.kind == "liquidation":
            liquidations += 1

    # Compute active loans = reserves where borrowed > repaid (positive residual).
    active_loans = sum(1 for v in per_reserve.values() if v > 1.0)  # ignore dust

    # Size tier from gross borrow volume.
    if total_borrowed >= 1_000_000:
        size_tier: SizeTier = "whale"
    elif total_borrowed >= 10_000:
        size_tier = "mid"
    elif total_borrowed >= 100:
        size_tier = "small"
    else:
        size_tier = "dust"

    # Scoring: start at 50, shift by behaviour signals.
    score = 50
    risk_factors: list[str] = []

    if total_borrowed == 0:
        score = 50  # neutral for unused accounts
        classification: BehaviorType = "new_wallet"
    else:
        repayment_ratio = total_repaid / total_borrowed if total_borrowed > 0 else 0.0

        if repayment_ratio >= 0.95:
            score += 20
        elif repayment_ratio >= 0.75:
            score += 10
        elif repayment_ratio < 0.3:
            score -= 25
            risk_factors.append("low_repayment_ratio")

        if liquidations == 0 and total_borrowed >= 10_000:
            score += 15
        else:
            score -= 10 * liquidations
            if liquidations > 0:
                risk_factors.append(f"liquidations_count_{liquidations}")

        if active_loans >= 3:
            score -= 5
            risk_factors.append("many_active_loans")

        # Classification.
        if liquidations >= 2:
            classification = "defaulter"
        elif liquidations == 1 and repayment_ratio < 0.8:
            classification = "risky_borrower"
        elif repayment_ratio >= 0.95 and total_borrowed >= 10_000:
            classification = "responsible_borrower"
        elif liquidations == 0 and total_borrowed >= 1_000:
            classification = "responsible_borrower"
        else:
            classification = "risky_borrower"

    score = max(0, min(100, score))

    if events:
        # Aave V3 mainnet launched Jan 2023; block 16291127. We don't have block->timestamp
        # here (would need extra RPC calls). Use the event count as a proxy recency signal.
        first_ts = now - 30 * 86400  # placeholder — D6 enrichment with real block ts
        last_ts = now - 86400

    return CreditProfile(
        address=address,
        score=score,
        classification=classification,
        size_tier=size_tier,
        total_borrowed_usd=total_borrowed,
        total_repaid_usd=total_repaid,
        liquidations=liquidations,
        active_loans=active_loans,
        protocols_used=["aave-v3"] if events else [],
        first_activity_at=first_ts,
        last_activity_at=last_ts,
        risk_factors=risk_factors,
    )
