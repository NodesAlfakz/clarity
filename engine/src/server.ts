/**
 * Clarity Engine API server.
 *
 * Endpoints:
 *   POST /analyze      — transaction analysis (Tenderly + Blockaid + contract parsing)
 *   GET  /score/:addr  — credit profile for an address
 *   POST /translate    — Claude-powered localized translation of analysis content
 *   GET  /healthz      — liveness
 *
 * D3-4 scaffold. Real handlers land with Tenderly/Blockaid integration.
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerAnalyzeRoute } from './routes/analyze';
import { registerScoreRoute } from './routes/score';
import { registerTranslateRoute } from './routes/translate';

const PORT = Number(process.env.PORT ?? 8787);

async function main() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  app.get('/healthz', async () => ({ ok: true, service: 'clarity-engine', version: '0.1.0' }));

  registerAnalyzeRoute(app);
  registerScoreRoute(app);
  registerTranslateRoute(app);

  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`clarity-engine listening on :${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
