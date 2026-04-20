/**
 * POST /analyze — transaction analysis endpoint.
 *
 * Scaffold: returns a stub TxAnalysis shape. Tenderly simulation + Blockaid
 * threat lookup + counterparty enrichment wire in during D3-4.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { TxAnalysis } from '@clarity/shared';

const Schema = z.object({
  chainId: z.union([z.literal(1), z.literal(8453), z.literal(42161), z.literal(10)]),
  tx: z.object({
    from: z.string(),
    to: z.string(),
    value: z.string(),
    data: z.string(),
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

    const stub: TxAnalysis = {
      txObject: {
        from: tx.from as `0x${string}`,
        to: tx.to as `0x${string}`,
        value: tx.value,
        data: tx.data,
      },
      chainId,
      risk: {
        level: 'safe',
        flags: [],
        summary: { fallback: 'Analysis not yet implemented.' },
      },
      humanReadable: { fallback: 'Transaction details will appear here once D3-4 analysis lands.' },
      simulation: null,
      counterparty: null,
      alternatives: [],
    };
    return stub;
  });
}
