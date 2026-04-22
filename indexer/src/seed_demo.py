"""
Seed three demonstration credit profiles into the DuckDB store.

Purpose: give the Mode 3 Inspect UI a small set of interesting addresses
to show judges during the hackathon demo. These profiles are synthetic —
not derived from real on-chain history — so they are explicitly namespaced
with the 0xDEM0 prefix to avoid collision with any real indexed address.

Run:
    python -m src.seed_demo
"""
from __future__ import annotations

import json
import time

from .storage import init, save_profile


DEMO_PROFILES = [
    {
        "address": "0xdea1100000000000000000000000000000000011",
        "score": 88,
        "classification": "responsible_borrower",
        "sizeTier": "whale",
        "history": {
            "totalBorrowed": "2450000.0",
            "totalRepaid": "2450000.0",
            "liquidations": 0,
            "activeLoans": 1,
            "protocolsUsed": ["aave-v3"],
            "firstActivityAt": 1700000000,
            "lastActivityAt": int(time.time()) - 86400,
        },
        "riskFactors": [],
        "sybilCluster": None,
    },
    {
        "address": "0xdea1200000000000000000000000000000000022",
        "score": 34,
        "classification": "risky_borrower",
        "sizeTier": "mid",
        "history": {
            "totalBorrowed": "85000.0",
            "totalRepaid": "48000.0",
            "liquidations": 1,
            "activeLoans": 2,
            "protocolsUsed": ["aave-v3"],
            "firstActivityAt": 1710000000,
            "lastActivityAt": int(time.time()) - 3 * 86400,
        },
        "riskFactors": [
            {
                "code": "low_repayment_ratio",
                "severity": "caution",
                "description": {
                    "fallback": "Repaid 56% of borrowed amount — below healthy threshold.",
                },
            },
            {
                "code": "liquidations_count_1",
                "severity": "caution",
                "description": {
                    "fallback": "Position was liquidated once during a drawdown.",
                },
            },
        ],
        "sybilCluster": None,
    },
    {
        "address": "0xdea1300000000000000000000000000000000033",
        "score": 12,
        "classification": "defaulter",
        "sizeTier": "small",
        "history": {
            "totalBorrowed": "8500.0",
            "totalRepaid": "1200.0",
            "liquidations": 3,
            "activeLoans": 0,
            "protocolsUsed": ["aave-v3"],
            "firstActivityAt": 1720000000,
            "lastActivityAt": int(time.time()) - 30 * 86400,
        },
        "riskFactors": [
            {
                "code": "low_repayment_ratio",
                "severity": "caution",
                "description": {
                    "fallback": "Repaid only 14% of borrowed amount.",
                },
            },
            {
                "code": "liquidations_count_3",
                "severity": "danger",
                "description": {
                    "fallback": "Three liquidations in under six months.",
                },
            },
        ],
        "sybilCluster": {
            "clusterId": "cluster-demo-01",
            "memberCount": 47,
            "confidence": 0.82,
            "commonFundingSource": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        },
    },
]


def main() -> None:
    init()
    now = int(time.time())
    for profile in DEMO_PROFILES:
        full = {**profile, "updatedAt": now}
        save_profile(full)
        print(f"✓ seeded {profile['address']} (score={profile['score']}, {profile['classification']})")
    print(f"\nDone. {len(DEMO_PROFILES)} demo profiles written to DuckDB.")


if __name__ == "__main__":
    main()
