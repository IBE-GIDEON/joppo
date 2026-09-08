import { NextResponse } from 'next/server';
import { currentUserId } from '@/lib/auth';
import { getEntitlement } from '@/lib/entitlement';
import { runSearch, searchSchema } from '@/lib/search';
import { checkSearchLimit, rateHeaders } from '@/lib/rate-limit';
import type { PlanId } from '@/lib/plans';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const userId = await currentUserId();
  const entitlement = await getEntitlement(userId);

  // Checked before the search runs, so a caller over their limit never costs a
  // database query against the catalogue.
  const limit = await checkSearchLimit(req, {
    userId,
    plan: (entitlement.plan as PlanId | null) ?? null,
    subscribed: entitlement.subscribed,
  });

  if (!limit.ok) {
    return NextResponse.json(
      {
        error:
          limit.reason === 'quota'
            ? 'You have used this month\'s searches on your plan. It resets at the start of next month.'
            : 'Too many searches in a short time. Try again shortly.',
        reason: limit.reason,
        limit: limit.limit,
        retryAfter: limit.retryAfter,
      },
      { status: 429, headers: rateHeaders(limit) },
    );
  }

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

  return NextResponse.json(
    { ...result, quota: { limit: limit.limit, remaining: limit.remaining } },
    { headers: { 'Cache-Control': 'private, no-store', ...rateHeaders(limit) } },
  );
}
