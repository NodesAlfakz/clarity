/**
 * GET /score/:address — credit profile lookup.
 *
 * Reads from the shared DuckDB populated by indexer/. If the address has
 * not been indexed yet, returns 404 with an actionable hint rather than an
 * empty profile — callers can decide whether to kick off indexing or show
 * a fallback UI.
 */
import type { FastifyInstance } from 'fastify';
import { readCreditProfile } from '../storage/creditStore.js';

export function registerScoreRoute(app: FastifyInstance) {
  app.get<{ Params: { address: string } }>('/score/:address', async (req, reply) => {
    const { address } = req.params;
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return reply.code(400).send({ error: 'invalid address format' });
    }

    const profile = await readCreditProfile(address);
    if (!profile) {
      return reply.code(404).send({
        error: 'profile_not_indexed',
        address: address.toLowerCase(),
        hint:
          'Address has not been indexed yet. Run `python -m src.main ' +
          `--address ${address}` +
          '` from the indexer/ workspace (with venv activated) to populate a credit profile.',
      });
    }
    return profile;
  });
}
