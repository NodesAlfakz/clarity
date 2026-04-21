"""
RPC client wrapper with fallback across public endpoints.

Public RPCs often rate-limit or truncate `eth_getLogs` responses. We round-robin
across several free providers; if one fails, we retry the same request on the
next. The caller does not need to think about which provider is up.
"""
from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass
from typing import Any

import aiohttp


DEFAULT_ENDPOINTS: tuple[str, ...] = (
    # Public endpoints — no auth required, best-effort rate limits.
    "https://eth.llamarpc.com",
    "https://ethereum-rpc.publicnode.com",
    "https://rpc.ankr.com/eth",
    "https://cloudflare-eth.com",
)


@dataclass
class RpcError(Exception):
    message: str
    endpoint: str

    def __str__(self) -> str:  # noqa: D401
        return f"RPC error at {self.endpoint}: {self.message}"


class RpcClient:
    """Round-robin JSON-RPC client for Ethereum-style chains."""

    def __init__(self, endpoints: tuple[str, ...] | None = None) -> None:
        # Allow override via ALCHEMY_HTTP_URL env for authenticated access.
        override = os.environ.get("ALCHEMY_HTTP_URL")
        if override:
            self.endpoints = (override, *DEFAULT_ENDPOINTS)
        else:
            self.endpoints = endpoints or DEFAULT_ENDPOINTS

    async def call(self, method: str, params: list[Any]) -> Any:
        last_err: Exception | None = None
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=25)) as sess:
            for endpoint in self.endpoints:
                try:
                    async with sess.post(
                        endpoint,
                        json={"jsonrpc": "2.0", "method": method, "params": params, "id": 1},
                    ) as resp:
                        if resp.status != 200:
                            last_err = RpcError(f"HTTP {resp.status}", endpoint)
                            continue
                        body = await resp.json()
                        if "error" in body:
                            last_err = RpcError(str(body["error"]), endpoint)
                            continue
                        return body["result"]
                except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                    last_err = RpcError(str(e), endpoint)
                    continue
        raise last_err if last_err else RpcError("no endpoints reachable", "(all)")

    async def block_number(self) -> int:
        result = await self.call("eth_blockNumber", [])
        return int(result, 16)

    async def get_logs(
        self,
        *,
        from_block: int,
        to_block: int | str,
        address: str,
        topics: list[str | list[str] | None],
    ) -> list[dict[str, Any]]:
        """Fetch logs with a single call. Caller is responsible for chunking."""
        params = {
            "fromBlock": hex(from_block),
            "toBlock": hex(to_block) if isinstance(to_block, int) else to_block,
            "address": address,
            "topics": topics,
        }
        return await self.call("eth_getLogs", [params])
