import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { currentUserId } from '@/lib/auth';
import { getEntitlement } from '@/lib/entitlement';
import { searchSchema } from '@/lib/search';

export const dynamic = 'force-dynamic';

const MAX_PER_USER = 20;

const createPayload = z.object({
  name: z.string().trim().min(1).max(60),
  // Reuse the search validator so a saved search can never hold a shape the
  // search endpoint would later reject.
  filters: searchSchema.partial(),
});

async function requirePaidUser() {
  const userId = await currentUserId();
  if (!userId) return { error: NextResponse.json({ error: 'Sign in first.' }, { status: 401 }) };

  const entitlement = await getEntitlement(userId);
  if (!entitlement.subscribed) {
    return {
      error: NextResponse.json({ error: 'Saved searches require an active plan.' }, { status: 402 }),
    };
  }
  return { userId };
}

export async function GET() {
  const gate = await requirePaidUser();
  if (gate.error) return gate.error;

  const rows = await prisma.savedSearch.findMany({
    where: { userId: gate.userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, filters: true, createdAt: true },
  });

  return NextResponse.json(
    {
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        filters: safeParse(r.filters),
        createdAt: r.createdAt.toISOString(),
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(req: Request) {
  const gate = await requirePaidUser();
  if (gate.error) return gate.error;

  const parsed = createPayload.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid saved search.', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.savedSearch.count({ where: { userId: gate.userId } });
  if (existing >= MAX_PER_USER) {
    return NextResponse.json(
      { error: `You can keep up to ${MAX_PER_USER} saved searches. Delete one first.` },
      { status: 409 },
    );
  }

  const row = await prisma.savedSearch.create({
    data: {
      userId: gate.userId,
      name: parsed.data.name,
      filters: JSON.stringify(parsed.data.filters ?? {}),
    },
    select: { id: true, name: true, filters: true, createdAt: true },
  });

  return NextResponse.json({
    ok: true,
    item: {
      id: row.id,
      name: row.name,
      filters: safeParse(row.filters),
      createdAt: row.createdAt.toISOString(),
    },
  });
}

export async function DELETE(req: Request) {
  const gate = await requirePaidUser();
  if (gate.error) return gate.error;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  // Scoped by userId so one user cannot delete another's saved search.
  await prisma.savedSearch.deleteMany({ where: { id, userId: gate.userId } });
  return NextResponse.json({ ok: true });
}

function safeParse(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}
