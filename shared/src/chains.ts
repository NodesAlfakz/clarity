/**
 * Chain metadata for supported EVM chains.
 */

import type { ChainId } from './types.js';

export interface ChainMeta {
  id: ChainId;
  name: string;
  shortName: string;
  nativeCurrency: { symbol: string; decimals: number };
  rpcDefault: string; // replace with Alchemy URL at runtime
  explorer: string;
}

export const CHAINS: Record<ChainId, ChainMeta> = {
  1: {
    id: 1,
    name: 'Ethereum',
    shortName: 'eth',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    rpcDefault: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io',
  },
  8453: {
    id: 8453,
    name: 'Base',
    shortName: 'base',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    rpcDefault: 'https://mainnet.base.org',
    explorer: 'https://basescan.org',
  },
  42161: {
    id: 42161,
    name: 'Arbitrum One',
    shortName: 'arb1',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    rpcDefault: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
  },
  10: {
    id: 10,
    name: 'Optimism',
    shortName: 'op',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    rpcDefault: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
  },
};

export const SUPPORTED_CHAIN_IDS: readonly ChainId[] = [1, 8453, 42161, 10] as const;
