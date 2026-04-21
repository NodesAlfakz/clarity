/**
 * Blockaid threat-check client.
 *
 * Scans a transaction against Blockaid's known-malicious database: phishing
 * contracts, drainer signatures, sanctioned addresses. Returns a list of
 * risk flags to merge into the final TxAnalysis response.
 *
 * When BLOCKAID_API_KEY is absent, returns an empty flag list so the pipeline
 * can run in dev sandbox without external dependencies.
 */
import type { RawTransaction, ChainId, RiskFlag } from '@clarity/shared';

const BLOCKAID_API = 'https://api.blockaid.io';

const CHAIN_TO_BLOCKAID: Record<ChainId, string> = {
  1: 'ethereum',
  8453: 'base',
  42161: 'arbitrum',
  10: 'optimism',
};

export async function scanTransaction(
  tx: RawTransaction,
  chainId: ChainId,
): Promise<RiskFlag[]> {
  const apiKey = process.env.BLOCKAID_API_KEY;
  if (!apiKey) return [];

  const chain = CHAIN_TO_BLOCKAID[chainId];
  const endpoint = `${BLOCKAID_API}/v0/evm/json-rpc/scan`;

  const body = {
    chain,
    account_address: tx.from,
    data: {
      method: 'eth_sendTransaction',
      params: [{ from: tx.from, to: tx.to, value: tx.value, data: tx.data }],
    },
    options: ['simulation', 'validation'],
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // Non-fatal: continue without Blockaid flags.
    return [];
  }

  const json = (await res.json()) as BlockaidResponse;
  return mapToFlags(json);
}

interface BlockaidResponse {
  validation?: {
    result_type?: 'Malicious' | 'Warning' | 'Benign';
    reason?: string;
    classification?: string;
    description?: string;
  };
  simulation?: {
    status?: string;
  };
}

function mapToFlags(res: BlockaidResponse): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const r = res.validation;
  if (!r) return flags;

  if (r.result_type === 'Malicious') {
    flags.push({
      code: r.classification === 'phishing' ? 'known_phishing' : 'suspicious_counterparty',
      severity: 'critical',
      explanation: {
        fallback: r.description ?? r.reason ?? 'Blockaid flagged this transaction as malicious',
      },
    });
  } else if (r.result_type === 'Warning') {
    flags.push({
      code: 'suspicious_counterparty',
      severity: 'caution',
      explanation: {
        fallback: r.description ?? r.reason ?? 'Blockaid flagged this transaction with a warning',
      },
    });
  }
  return flags;
}
