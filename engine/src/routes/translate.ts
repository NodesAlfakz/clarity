/**
 * POST /translate — locale-aware translation endpoint.
 *
 * Delegates to the Claude-powered translator (see analyzers/translator.ts).
 * When ANTHROPIC_API_KEY is absent, returns the English fallback with the
 * pipeline still green (useful for local dev).
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { translate } from '../analyzers/translator';

const Schema = z.object({
  locale: z.enum(['en', 'ru', 'zh', 'es', 'tr', 'ko', 'pt']),
  content: z.object({
    fallback: z.string().min(1),
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
    const result = await translate({
      locale,
      fallback: content.fallback,
      ...(content.vars ? { vars: content.vars } : {}),
    });
    return { locale, ...result };
  });
}
