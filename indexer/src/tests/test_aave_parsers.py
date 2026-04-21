"""Unit tests for Aave V3 event log parsers."""
from __future__ import annotations

from src.protocols.aave_v3 import (
    _parse_borrow,
    _parse_repay,
    _parse_liquidation,
    pad_address,
)


def test_pad_address_pads_to_32_bytes() -> None:
    addr = "0xabcdef1234567890abcdef1234567890abcdef12"
    padded = pad_address(addr)
    assert padded.startswith("0x")
    assert len(padded) == 66
    assert padded.endswith("abcdef1234567890abcdef1234567890abcdef12")


def test_parse_borrow_extracts_reserve_user_amount() -> None:
    log = {
        "topics": [
            "0xb3d084820fb1a9decffb176436bd02558d15fac9b0ddfed8c465bc7359d7dce0",
            "0x000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",  # reserve=USDC
            "0x000000000000000000000000" + "c" * 40,  # onBehalfOf
            "0x0000000000000000000000000000000000000000000000000000000000000000",
        ],
        "data": (
            "0x"
            + "000000000000000000000000" + "b" * 40  # user
            + "0000000000000000000000000000000000000000000000000000000000002710"  # amount = 10000
            + "0000000000000000000000000000000000000000000000000000000000000002"  # rate mode
            + "00000000000000000000000000000000000000000000000000000000030d4000"  # borrow rate
        ),
        "blockNumber": "0x1000",
        "transactionHash": "0xaaa",
        "logIndex": "0x5",
    }
    ev = _parse_borrow(log)
    assert ev.kind == "borrow"
    assert ev.reserve == "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
    assert ev.user == "0x" + "b" * 40
    assert int(ev.amount, 16) == 10000
    assert ev.block == 0x1000


def test_parse_repay_extracts_user_and_amount() -> None:
    log = {
        "topics": [
            "0xa534c8dbe71f871f9f3530e97a74f3b723c1392a4fea3dd7e2e7b1d8a0b8f0c2",
            "0x000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",  # reserve
            "0x000000000000000000000000" + "d" * 40,  # user
            "0x000000000000000000000000" + "e" * 40,  # repayer
        ],
        "data": (
            "0x"
            + "0000000000000000000000000000000000000000000000000000000000001388"  # amount = 5000
            + "0000000000000000000000000000000000000000000000000000000000000000"  # useATokens
        ),
        "blockNumber": "0x2000",
        "transactionHash": "0xbbb",
        "logIndex": "0x1",
    }
    ev = _parse_repay(log)
    assert ev.kind == "repay"
    assert ev.user == "0x" + "d" * 40
    assert int(ev.amount, 16) == 5000


def test_parse_liquidation_extracts_user() -> None:
    log = {
        "topics": [
            "0xe413a321e8681d831f4dbccbca790d2952b56f977908e45be37335533e005286",
            "0x000000000000000000000000" + "1" * 40,  # collateral asset
            "0x000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",  # debt asset
            "0x000000000000000000000000" + "f" * 40,  # user being liquidated
        ],
        "data": (
            "0x"
            + "0000000000000000000000000000000000000000000000000000000000000bb8"  # debtToCover = 3000
            + "0000000000000000000000000000000000000000000000000000000000001388"  # liq collateral
            + "000000000000000000000000" + "2" * 40                                # liquidator
            + "0000000000000000000000000000000000000000000000000000000000000000"  # receiveAToken
        ),
        "blockNumber": "0x3000",
        "transactionHash": "0xccc",
        "logIndex": "0x0",
    }
    ev = _parse_liquidation(log)
    assert ev.kind == "liquidation"
    assert ev.user == "0x" + "f" * 40
    assert ev.reserve == "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
    assert int(ev.amount, 16) == 3000
