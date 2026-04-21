"""
DuckDB persistence for raw events and derived profiles.

Single-file database lives at `.data/clarity.duckdb` (created if missing).
Schema is idempotent — safe to call `init()` on every run.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import duckdb

_DB_PATH = Path(__file__).resolve().parent.parent / ".data" / "clarity.duckdb"


def _connect() -> duckdb.DuckDBPyConnection:
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return duckdb.connect(str(_DB_PATH))


def init() -> None:
    con = _connect()
    try:
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS aave_events (
              kind          VARCHAR NOT NULL,
              block         BIGINT  NOT NULL,
              tx_hash       VARCHAR NOT NULL,
              log_index     INTEGER NOT NULL,
              reserve       VARCHAR NOT NULL,
              amount_hex    VARCHAR NOT NULL,
              user_addr     VARCHAR NOT NULL,
              PRIMARY KEY (tx_hash, log_index)
            )
            """
        )
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS credit_profiles (
              address            VARCHAR PRIMARY KEY,
              score              INTEGER NOT NULL,
              classification     VARCHAR NOT NULL,
              size_tier          VARCHAR NOT NULL,
              total_borrowed_usd DOUBLE  NOT NULL,
              total_repaid_usd   DOUBLE  NOT NULL,
              liquidations       INTEGER NOT NULL,
              active_loans       INTEGER NOT NULL,
              updated_at         BIGINT  NOT NULL,
              json_blob          VARCHAR NOT NULL
            )
            """
        )
    finally:
        con.close()


def save_events(events: list[dict[str, Any]]) -> None:
    if not events:
        return
    con = _connect()
    try:
        for e in events:
            con.execute(
                """
                INSERT OR IGNORE INTO aave_events
                  (kind, block, tx_hash, log_index, reserve, amount_hex, user_addr)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    e["kind"],
                    e["block"],
                    e["tx_hash"],
                    e["raw_log_index"],
                    e["reserve"].lower(),
                    e["amount"],
                    e["user"].lower(),
                ),
            )
    finally:
        con.close()


def save_profile(profile: dict[str, Any]) -> None:
    import json

    con = _connect()
    try:
        con.execute(
            """
            INSERT OR REPLACE INTO credit_profiles
              (address, score, classification, size_tier,
               total_borrowed_usd, total_repaid_usd, liquidations, active_loans,
               updated_at, json_blob)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                profile["address"].lower(),
                profile["score"],
                profile["classification"],
                profile["sizeTier"],
                float(profile["history"]["totalBorrowed"]),
                float(profile["history"]["totalRepaid"]),
                profile["history"]["liquidations"],
                profile["history"]["activeLoans"],
                profile["updatedAt"],
                json.dumps(profile),
            ),
        )
    finally:
        con.close()


def load_profile(address: str) -> dict[str, Any] | None:
    import json

    con = _connect()
    try:
        row = con.execute(
            "SELECT json_blob FROM credit_profiles WHERE address = ?",
            (address.lower(),),
        ).fetchone()
        if not row:
            return None
        return json.loads(row[0])
    finally:
        con.close()
