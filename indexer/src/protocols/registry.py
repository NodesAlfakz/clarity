"""
Registry of lending protocols indexed by Clarity.

Adapter implementations land in protocols/<slug>.py in D5-6.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ProtocolMeta:
    slug: str
    name: str
    chain_ids: tuple[int, ...]
    subgraph_url: str | None
    addresses: dict[int, str]  # chain_id -> main pool address


PROTOCOLS: tuple[ProtocolMeta, ...] = (
    ProtocolMeta(
        slug="aave-v3",
        name="Aave V3",
        chain_ids=(1, 8453, 42161, 10),
        subgraph_url="https://api.thegraph.com/subgraphs/name/aave/protocol-v3",
        addresses={
            1: "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2",  # Pool
            8453: "0xa238dd80c259a72e81d7e4664a9801593f98d1c5",
            42161: "0x794a61358d6845594f94dc1db02a252b5b4814ad",
            10: "0x794a61358d6845594f94dc1db02a252b5b4814ad",
        },
    ),
    ProtocolMeta(
        slug="compound-v3",
        name="Compound V3",
        chain_ids=(1, 8453, 42161),
        subgraph_url=None,  # use comet events directly
        addresses={
            1: "0xc3d688b66703497daa19211eedff47f25384cdc3",  # cUSDCv3
        },
    ),
    ProtocolMeta(
        slug="morpho-blue",
        name="Morpho Blue",
        chain_ids=(1, 8453),
        subgraph_url=None,
        addresses={
            1: "0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb",
        },
    ),
    ProtocolMeta(
        slug="maker-sky",
        name="MakerDAO / Sky Lending",
        chain_ids=(1,),
        subgraph_url=None,
        addresses={},  # Vat + Vault adapters, composite scan
    ),
    ProtocolMeta(
        slug="fluid",
        name="Fluid",
        chain_ids=(1, 8453, 42161),
        subgraph_url=None,
        addresses={},
    ),
    ProtocolMeta(
        slug="kamino",
        name="Kamino Lend (Solana)",
        chain_ids=(),  # Solana — handled via a separate SVM adapter post-hackathon
        subgraph_url=None,
        addresses={},
    ),
)


def by_slug(slug: str) -> ProtocolMeta | None:
    for p in PROTOCOLS:
        if p.slug == slug:
            return p
    return None
