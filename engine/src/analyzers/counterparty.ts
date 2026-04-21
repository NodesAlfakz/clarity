/**
 * Counterparty enrichment.
 *
 * For a given tx.to address, returns a CounterpartySnapshot with:
 *   - isContract   whether the target is a contract (bytecode length > 0)
 *   - verified     placeholder (real Etherscan source-verification lookup
 *                  lands in a follow-up; for now false)
 *   - profile      pick of (score, classification, sizeTier) from our
 *                  indexer-populated credit profile, if any
 *   - tags         known-address tags (router, pool, bridge, exchange)
 *
 * Fully local: reads from the shared DuckDB and uses a hardcoded tag table.
 * No external API dependency.
 */
import type { Address, ChainId, CounterpartySnapshot } from '@clarity/shared';
import { CHAINS } from '@clarity/shared';
import { readCreditProfile } from '../storage/creditStore.js';

// Manually curated tag table. Hackathon-scope; replace with a real on-chain
// labels dataset (Etherscan labels, Arkham, Nansen) later.
const KNOWN_TAGS: Record<string, string[]> = {
  // Ethereum mainnet
  '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2': ['aave-v3-pool'],
  '0xe592427a0aece92de3edee1f18e0157c05861564': ['uniswap-v3-router'],
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': ['uniswap-v2-router-02'],
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': ['uniswap-v3-router-02'],
  '0xdac17f958d2ee523a2206206994597c13d831ec7': ['stablecoin-usdt'],
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': ['stablecoin-usdc'],
  '0x6b175474e89094c44da98b954eedeac495271d0f': ['stablecoin-dai'],
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': ['weth'],
  '0x000000000022d473030f116ddee9f6b43ac78ba3': ['permit2'],
  // Base
  '0xa238dd80c259a72e81d7e4664a9801593f98d1c5': ['aave-v3-pool'],
  '0x2626664c2603336e57b271c5c0b26f421741e481': ['uniswap-v3-swaprouter02'],
  // Arbitrum
  '0x794a61358d6845594f94dc1db02a252b5b4814ad': ['aave-v3-pool'],
};

async function fetchIsContract(address: Address, chainId: ChainId): Promise<boolean> {
  const rpc = CHAINS[chainId]?.rpcDefault;
  if (!rpc) return false;
  try {
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getCode',
        params: [address, 'latest'],
        id: 1,
      }),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { result?: string };
    // Empty code = '0x'. Anything longer means bytecode exists.
    return Boolean(body.result && body.result.length > 2);
  } catch {
    return false;
  }
}

export async function enrichCounterparty(
  address: Address,
  chainId: ChainId,
): Promise<CounterpartySnapshot> {
  const lower = address.toLowerCase() as Address;
  const [isContract, storedProfile] = await Promise.all([
    fetchIsContract(lower, chainId),
    readCreditProfile(lower).catch(() => null),
  ]);

  let profileSlice: CounterpartySnapshot['profile'] = null;
  if (storedProfile && typeof storedProfile === 'object') {
    const p = storedProfile as {
      score?: number;
      classification?: string;
      sizeTier?: string;
    };
    if (typeof p.score === 'number' && typeof p.classification === 'string' && typeof p.sizeTier === 'string') {
      profileSlice = {
        score: p.score,
        classification: p.classification as CounterpartySnapshot['profile'] extends infer T
          ? T extends { classification: infer C } ? C : never
          : never,
        sizeTier: p.sizeTier as CounterpartySnapshot['profile'] extends infer T
          ? T extends { sizeTier: infer S } ? S : never
          : never,
      };
    }
  }

  return {
    address: lower,
    isContract,
    verified: false, // TODO: Etherscan verified-source lookup
    profile: profileSlice,
    tags: KNOWN_TAGS[lower] ?? [],
  };
}
