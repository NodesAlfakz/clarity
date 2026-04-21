/**
 * POST /analyze — transaction analysis endpoint.
 *
 * Pipeline:
 *   1. Zod-validate request
 *   2. Contract parser — decode intent from calldata selector
 *   3. Tenderly simulation (optional — runs when TENDERLY_* env is set)
 *   4. Blockaid threat scan (optional — runs when BLOCKAID_API_KEY is set)
 *   5. Risk composer — merge signals into unified TxAnalysis
 *
 * Returns the full TxAnalysis shape defined in @clarity/shared/types.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { TxAnalysis } from '@clarity/shared';
import { parseTransaction } from '../analyzers/contractParser.js';
import { simulate } from '../analyzers/tenderly.js';
import { scanTransaction } from '../analyzers/blockaid.js';
import { assessRisk } from '../analyzers/risk.js';
import { enrichCounterparty } from '../analyzers/counterparty.js';

const Schema = z.object({
  chainId: z.union([z.literal(1), z.literal(8453), z.literal(42161), z.literal(10)]),
  tx: z.object({
    from: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    to: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    value: z.string().regex(/^0x[a-fA-F0-9]*$/),
    data: z.string().regex(/^0x[a-fA-F0-9]*$/),
    gas: z.string().optional(),
    gasPrice: z.string().optional(),
  }),
  locale: z.enum(['en', 'ru', 'zh', 'es', 'tr', 'ko', 'pt']).default('en'),
});

export function registerAnalyzeRoute(app: FastifyInstance) {
  app.post('/analyze', async (req, reply) => {
    const parsed = Schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid body', issues: parsed.error.issues });
    }
    const { chainId, tx } = parsed.data;
    const rawTx = {
      from: tx.from as `0x${string}`,
      to: tx.to as `0x${string}`,
      value: tx.value,
      data: tx.data,
      ...(tx.gas ? { gas: tx.gas } : {}),
      ...(tx.gasPrice ? { gasPrice: tx.gasPrice } : {}),
    };

    // Run simulation + threat scan + counterparty enrichment in parallel.
    const [simulation, blockaidFlags, counterparty] = await Promise.all([
      simulate(rawTx, chainId).catch((err) => ({
        success: false,
        balanceChanges: [],
        error: `simulate failed: ${err?.message ?? 'unknown'}`,
      })),
      scanTransaction(rawTx, chainId).catch(() => []),
      enrichCounterparty(rawTx.to, chainId).catch(() => null),
    ]);

    const intent = parseTransaction(rawTx);
    const assessment = assessRisk(intent, simulation, blockaidFlags);

    const response: TxAnalysis = {
      txObject: rawTx,
      chainId,
      risk: {
        level: assessment.level,
        flags: assessment.flags,
        summary: { fallback: summaryLine(assessment.level, assessment.flags.length) },
      },
      humanReadable: { fallback: intent.summary },
      simulation,
      counterparty,
      alternatives: [],
    };
    return response;
  });
}

function summaryLine(level: string, flagCount: number): string {
  if (level === 'safe') return 'No risk flags detected.';
  if (level === 'caution') return `${flagCount} caution flag${flagCount === 1 ? '' : 's'} detected.`;
  if (level === 'danger') return `${flagCount} danger flag${flagCount === 1 ? '' : 's'} detected — review carefully before signing.`;
  return `${flagCount} critical flag${flagCount === 1 ? '' : 's'} detected — do not sign unless you are certain.`;
}
