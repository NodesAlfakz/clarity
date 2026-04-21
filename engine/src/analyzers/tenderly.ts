/**
 * Tenderly simulation client.
 *
 * Simulates a transaction without broadcasting it. Returns balance changes,
 * internal traces, revert reasons. Requires TENDERLY_ACCESS_KEY set in env.
 *
 * When the key is absent (dev sandbox), returns a deterministic stub result
 * so the rest of the pipeline can be exercised end-to-end.
 */
import type { RawTransaction, ChainId, SimulationResult } from '@clarity/shared';

const TENDERLY_API = 'https://api.tenderly.co/api/v1';

interface TenderlyConfig {
  accessKey: string;
  accountSlug: string;
  projectSlug: string;
}

function readConfig(): TenderlyConfig | null {
  const accessKey = process.env.TENDERLY_ACCESS_KEY;
  const accountSlug = process.env.TENDERLY_ACCOUNT_SLUG;
  const projectSlug = process.env.TENDERLY_PROJECT_SLUG;
  if (!accessKey || !accountSlug || !projectSlug) return null;
  return { accessKey, accountSlug, projectSlug };
}

export async function simulate(
  tx: RawTransaction,
  chainId: ChainId,
): Promise<SimulationResult> {
  const cfg = readConfig();
  if (!cfg) {
    return {
      success: true,
      balanceChanges: [],
      error: 'tenderly not configured — returning mock success',
    };
  }

  const endpoint = `${TENDERLY_API}/account/${cfg.accountSlug}/project/${cfg.projectSlug}/simulate`;
  const body = {
    network_id: String(chainId),
    from: tx.from,
    to: tx.to,
    input: tx.data,
    value: tx.value,
    gas: Number(tx.gas ?? '0x5208'),
    save: false,
    save_if_fails: false,
    simulation_type: 'quick',
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Access-Key': cfg.accessKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return {
      success: false,
      balanceChanges: [],
      error: `tenderly ${res.status}: ${await res.text().catch(() => '')}`,
    };
  }

  const json = (await res.json()) as TenderlyResponse;
  const success = json.simulation?.status === true;
  // Balance changes parsing from asset_changes is done in D4 — keep minimal here.
  return {
    success,
    balanceChanges: [],
    ...(json.simulation?.error_message ? { error: json.simulation.error_message } : {}),
  };
}

// Minimal subset of Tenderly's response shape we care about.
interface TenderlyResponse {
  simulation?: {
    status?: boolean;
    error_message?: string;
  };
  transaction?: unknown;
  contracts?: unknown[];
}
