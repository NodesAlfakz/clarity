/**
 * POST /api/analyze
 *
 * Proxies tx analysis requests to the engine so the whole app can run
 * behind a single public URL (webapp tunnel).
 */
import { type NextRequest, NextResponse } from 'next/server';

const ENGINE = process.env.ENGINE_BASE_URL ?? 'http://localhost:8787';

export async function POST(req: NextRequest) {
  const body = await req.text();
  try {
    const res = await fetch(`${ENGINE}/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    const respBody = await res.text();
    return new NextResponse(respBody, {
      status: res.status,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'engine_unreachable',
        hint: err instanceof Error ? err.message : 'engine not responding',
      },
      { status: 502 },
    );
  }
}
