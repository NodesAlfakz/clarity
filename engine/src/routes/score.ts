/**
 * GET /score/:address — credit profile lookup.
 *
 * Scaffold: queries the indexer-populated store (not yet implemented) and
 * returns a stub CreditProfile for now.
 */
import type { FastifyInstance } from 'fastify';
import type { CreditProfile } from '@clarity/shared';

export function registerScoreRoute(app: FastifyInstance) {
  app.get<{ Params: { address: string } }>('/score/:address', async (req, reply) => {
    const { address } = req.params;
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return reply.code(400).send({ error: 'invalid address format' });
    }

    const stub: CreditProfile = {
      address: address.toLowerCase() as `0x${string}`,
      score: 50,
      classification: 'new_wallet',
      history: {
        totalBorrowed: '0',
        totalRepaid: '0',
        liquidations: 0,
        activeLoans: 0,
        protocolsUsed: [],
        firstActivityAt: 0,
        lastActivityAt: 0,
      },
      riskFactors: [],
      sybilCluster: null,
      sizeTier: 'dust',
      updatedAt: Math.floor(Date.now() / 1000),
    };
    return stub;
  });
}
