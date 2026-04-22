/**
 * GET /api/score/:address
 *
 * Proxies to the engine on localhost:8787. Lets us serve the whole app behind
 * a single public URL (webapp tunnel) while the engine stays on the local
 * network.
 */
import { type NextRequest, NextResponse } from 'next/server';

const ENGINE = process.env.ENGINE_BASE_URL ?? 'http://localhost:8787';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: 'invalid address format' }, { status: 400 });
  }
  try {
    const res = await fetch(`${ENGINE}/score/${address}`);
    const body = await res.text();
    return new NextResponse(body, {
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
