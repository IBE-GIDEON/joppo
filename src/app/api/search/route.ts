import { NextResponse } from 'next/server';
import { currentUserId } from '@/lib/auth';
import { getEntitlement } from '@/lib/entitlement';
import { runSearch, searchSchema } from '@/lib/search';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const userId = await currentUserId();
  const entitlement = await getEntitlement(userId);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid search request.', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await runSearch(parsed.data, entitlement.subscribed, userId);

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
