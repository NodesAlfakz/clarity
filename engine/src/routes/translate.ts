/**
 * POST /translate — localize analysis content via Claude.
 *
 * Scaffold: echoes the fallback text for now. Anthropic SDK integration +
 * prompt-caching-aware translation pipeline land with D7 + D11.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const Schema = z.object({
  locale: z.enum(['en', 'ru', 'zh', 'es', 'tr', 'ko', 'pt']),
  content: z.object({
    fallback: z.string(),
    vars: z.record(z.union([z.string(), z.number()])).optional(),
  }),
});

export function registerTranslateRoute(app: FastifyInstance) {
  app.post('/translate', async (req, reply) => {
    const parsed = Schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid body', issues: parsed.error.issues });
    }
    const { locale, content } = parsed.data;
    // TODO(D7/D11): call Anthropic SDK with prompt caching and crypto-glossary system prompt.
    return { locale, translated: content.fallback, cached: false };
  });
}
