import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { currentUserId } from '@/lib/auth';
import { countMatches } from '@/lib/search';
import { fromList } from '@/lib/utils';
import { CATEGORIES } from '@/lib/types';

export const dynamic = 'force-dynamic';

const payload = z.object({
  situation: z.string().max(60).optional(),
  categories: z.array(z.enum(CATEGORIES)).min(1).max(5),
  roles: z.array(z.string().trim().min(1).max(60)).max(8).default([]),
  seniority: z.string().max(10).nullable().optional(),
  locations: z.array(z.string().trim().max(80)).max(8).default([]),
  remoteOnly: z.boolean().default(false),
  minSalary: z.number().int().min(0).max(1_000_000).nullable().optional(),
});

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = payload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid onboarding answers.', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // The number that gets shown at the paywall is a real count against the
  // catalogue, not a marketing figure.
  const matchCount = await countMatches({
    anyKeywords: data.roles.length ? data.roles : undefined,
    categories: data.categories,
    locations: data.locations.length ? data.locations : undefined,
    seniority: data.seniority ? [data.seniority] : undefined,
    remoteOnly: data.remoteOnly,
    salaryMin: data.minSalary ?? undefined,
  });

  const record = {
    situation: data.situation ?? null,
    categories: fromList(data.categories),
    roles: fromList(data.roles),
    seniority: data.seniority ?? null,
    locations: fromList(data.locations),
    remoteOnly: data.remoteOnly,
    minSalary: data.minSalary ?? null,
    matchCount,
    completedAt: new Date(),
  };

  await prisma.profile.upsert({
    where: { userId },
    create: { userId, ...record },
    update: record,
  });

  return NextResponse.json({ ok: true, matchCount });
}
