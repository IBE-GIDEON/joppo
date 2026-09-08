import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { currentUserId } from '@/lib/auth';
import { getEntitlement } from '@/lib/entitlement';

export const dynamic = 'force-dynamic';

const payload = z.object({
  listingId: z.string().min(1).max(60),
  saved: z.boolean(),
});

/** Bookmark or un-bookmark one listing. Paid feature, so it checks access. */
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const entitlement = await getEntitlement(userId);
  if (!entitlement.subscribed) {
    return NextResponse.json({ error: 'Saving requires an active plan.' }, { status: 402 });
  }

  const parsed = payload.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { listingId, saved } = parsed.data;

  if (saved) {
    // Upsert keeps a double click from throwing on the unique constraint.
    await prisma.savedListing.upsert({
      where: { userId_listingId: { userId, listingId } },
      create: { userId, listingId },
      update: {},
    });
  } else {
    await prisma.savedListing.deleteMany({ where: { userId, listingId } });
  }

  const count = await prisma.savedListing.count({ where: { userId } });
  return NextResponse.json({ ok: true, saved, count });
}

/** How many the user has saved, for the header chip. */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ count: 0 });
  const count = await prisma.savedListing.count({ where: { userId } });
  return NextResponse.json({ count }, { headers: { 'Cache-Control': 'no-store' } });
}
