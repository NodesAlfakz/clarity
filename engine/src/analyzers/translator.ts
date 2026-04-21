/**
 * Claude-powered translator for dynamic crypto-safety content.
 *
 * Prompt caching: the crypto glossary + style rules are loaded as a cached
 * system block so they are paid-for once and then re-hit at ~$0/request until
 * the 5-minute TTL elapses.
 *
 * When ANTHROPIC_API_KEY is unset, returns the English fallback — pipeline
 * keeps running in dev without external cost.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { Locale } from '@clarity/shared';
import { LOCALE_NAMES } from '@clarity/shared';

const MODEL = process.env.CLARITY_CLAUDE_MODEL ?? 'claude-sonnet-4-5-20250929';

const SYSTEM_GLOSSARY = `You are a translator for a crypto-safety product called Clarity.

The user is about to sign an Ethereum transaction. Your translations are shown
inline in a browser extension popup and a web wallet interface, so they must
be short, precise, and easy to act on.

## Rules

1. Translate into the target language. Do not add commentary.
2. Preserve structure: number of sentences and line breaks match the source.
3. Keep crypto protocol names as-is (Uniswap, Aave, Compound, Morpho, Permit2,
   WalletConnect, MetaMask, Phantom, Ledger). Do not localize brand names.
4. Keep the following technical terms in English when the language has no
   established native term: "smart contract", "ERC-20", "ERC-721", "slippage",
   "gas", "proxy", "approval", "phishing". Explain in parentheses if needed.
5. For Russian: use informal "ты" (not "вы"). Use "подпись" not "подписание".
6. For Chinese: use simplified characters. "签名" not "簽名".
7. For Turkish: informal second-person suffix (-sin not -siniz).
8. For Korean: use polite neutral form (-습니다/입니다), not casual.
9. For numeric amounts, keep the original format (do not convert currencies).
10. Never add warnings that were not in the source — stay faithful.

## Output

Return ONLY the translated text, no markdown, no quotes, no preamble.
`;

interface TranslateInput {
  locale: Locale;
  fallback: string;
  vars?: Record<string, string | number>;
}

export interface TranslateOutput {
  translated: string;
  cached: boolean;
  error?: string;
}

const memoryCache = new Map<string, string>();

function cacheKey(locale: Locale, text: string): string {
  return `${locale}:${text}`;
}

/** Interpolate {{vars}} placeholders. Matches i18next convention. */
function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_m, key) => {
    const v = vars[key];
    return v === undefined ? `{{${key}}}` : String(v);
  });
}

export async function translate(input: TranslateInput): Promise<TranslateOutput> {
  const rendered = interpolate(input.fallback, input.vars);

  // Pass-through for English — fallback is already the source of truth.
  if (input.locale === 'en') {
    return { translated: rendered, cached: true };
  }

  // Memory cache (in-process) for repeated requests with the same input.
  const key = cacheKey(input.locale, rendered);
  const hit = memoryCache.get(key);
  if (hit) return { translated: hit, cached: true };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      translated: rendered,
      cached: false,
      error: 'ANTHROPIC_API_KEY not set — returning English fallback',
    };
  }

  const client = new Anthropic({ apiKey });
  const targetLang = LOCALE_NAMES[input.locale].english;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      // Prompt caching: mark the system glossary as cacheable so subsequent
      // translations within 5 minutes are billed at ~10% of the normal rate.
      system: [
        { type: 'text', text: SYSTEM_GLOSSARY, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        {
          role: 'user',
          content: `Target language: ${targetLang}\n\nSource (English):\n${rendered}`,
        },
      ],
    });

    const block = response.content[0];
    const translated =
      block && block.type === 'text' ? block.text.trim() : rendered;

    memoryCache.set(key, translated);
    return { translated, cached: false };
  } catch (err) {
    return {
      translated: rendered,
      cached: false,
      error: `claude error: ${err instanceof Error ? err.message : 'unknown'}`,
    };
  }
}
