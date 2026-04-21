"""Unit tests for credit scoring algorithm. Run: python -m pytest src/tests/"""
from __future__ import annotations

import time

from src.protocols.aave_v3 import AaveEvent
from src.scoring import compute_profile


USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
USDT = "0xdac17f958d2ee523a2206206994597c13d831ec7"


def _amount_hex(value_in_usdc_whole_units: int, decimals: int = 6) -> str:
    """Encode a plain USD integer as a uint256 hex string (for stable reserves)."""
    raw = value_in_usdc_whole_units * (10 ** decimals)
    return "0x" + format(raw, "064x")


def test_new_wallet_returns_neutral_score() -> None:
    p = compute_profile("0xabc", events=[], now=int(time.time()))
    assert p.score == 50
    assert p.classification == "new_wallet"
    assert p.size_tier == "dust"
    assert p.total_borrowed_usd == 0.0


def test_responsible_borrower_full_repayment() -> None:
    events = [
        AaveEvent("borrow", 100, "0x01", USDC, _amount_hex(20_000), "0xabc", 0),
        AaveEvent("repay", 200, "0x02", USDC, _amount_hex(20_000), "0xabc", 0),
    ]
    p = compute_profile("0xabc", events, now=int(time.time()))
    assert p.total_borrowed_usd == 20_000.0
    assert p.total_repaid_usd == 20_000.0
    assert p.liquidations == 0
    assert p.classification == "responsible_borrower"
    assert p.size_tier == "mid"
    assert p.score >= 80  # base 50 + repayment ratio bonus + no-liquidation bonus


def test_defaulter_multiple_liquidations() -> None:
    events = [
        AaveEvent("borrow", 100, "0x01", USDC, _amount_hex(50_000), "0xabc", 0),
        AaveEvent("liquidation", 150, "0x02", USDC, _amount_hex(10_000), "0xabc", 0),
        AaveEvent("liquidation", 160, "0x03", USDC, _amount_hex(15_000), "0xabc", 0),
    ]
    p = compute_profile("0xabc", events, now=int(time.time()))
    assert p.liquidations == 2
    assert p.classification == "defaulter"
    assert p.score <= 40
    assert any("liquidations" in rf for rf in p.risk_factors)


def test_whale_classification_from_volume() -> None:
    events = [
        AaveEvent("borrow", 100, "0x01", USDC, _amount_hex(2_000_000), "0xabc", 0),
        AaveEvent("repay", 200, "0x02", USDC, _amount_hex(2_000_000), "0xabc", 0),
    ]
    p = compute_profile("0xabc", events, now=int(time.time()))
    assert p.size_tier == "whale"
    assert p.total_borrowed_usd >= 2_000_000


def test_partial_repayment_reduces_score() -> None:
    events = [
        AaveEvent("borrow", 100, "0x01", USDC, _amount_hex(10_000), "0xabc", 0),
        AaveEvent("repay", 200, "0x02", USDC, _amount_hex(2_000), "0xabc", 0),  # 20%
    ]
    p = compute_profile("0xabc", events, now=int(time.time()))
    assert p.total_borrowed_usd == 10_000.0
    assert p.total_repaid_usd == 2_000.0
    # repayment ratio 0.2 -> triggers score penalty
    assert "low_repayment_ratio" in p.risk_factors
    assert p.score < 50


def test_active_loans_counted_by_positive_residual() -> None:
    events = [
        AaveEvent("borrow", 100, "0x01", USDC, _amount_hex(5_000), "0xabc", 0),
        AaveEvent("borrow", 110, "0x02", USDT, _amount_hex(3_000), "0xabc", 0),
        AaveEvent("repay", 200, "0x03", USDC, _amount_hex(5_000), "0xabc", 0),
        # USDC fully repaid, USDT outstanding
    ]
    p = compute_profile("0xabc", events, now=int(time.time()))
    assert p.active_loans == 1


def test_to_dict_matches_credit_profile_schema() -> None:
    p = compute_profile("0xABC", events=[], now=1_000_000_000)
    d = p.to_dict()
    assert d["address"] == "0xabc"
    assert "score" in d
    assert "history" in d
    assert "totalBorrowed" in d["history"]
    assert d["history"]["protocolsUsed"] == []
    assert d["sybilCluster"] is None
    assert d["sizeTier"] == "dust"
