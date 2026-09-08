import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Uptime check. Point a free monitor at this and you find out the site is down
 * from an alert rather than from a customer.
 *
 * It reports degraded rather than failing outright when the catalogue is empty,
 * because the site is technically up but useless in that state, and that is
 * exactly the situation that is easy to miss.
 */
export async function GET() {
  const started = Date.now();

  try {
    const [listings, sources] = await Promise.all([
      prisma.listing.count({ where: { active: true } }),
      prisma.source.count({ where: { enabled: true } }),
    ]);

    const staleSource = await prisma.source.findFirst({
      where: { enabled: true, lastRunAt: { not: null } },
      orderBy: { lastRunAt: 'asc' },
      select: { lastRunAt: true },
    });

    const hoursSinceOldestCrawl = staleSource?.lastRunAt
      ? Math.round((Date.now() - staleSource.lastRunAt.getTime()) / 3_600_000)
      : null;

    // A crawl cycle should complete well inside a day. Longer means the cron
    // has stopped and the catalogue is quietly going stale.
    const crawlHealthy = hoursSinceOldestCrawl === null || hoursSinceOldestCrawl < 36;
    const healthy = listings > 0 && sources > 0 && crawlHealthy;

    return NextResponse.json(
      {
        status: healthy ? 'ok' : 'degraded',
        listings,
        sources,
        hoursSinceOldestCrawl,
        dbLatencyMs: Date.now() - started,
      },
      { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: 'down',
        error: err instanceof Error ? err.message.slice(0, 200) : 'database unreachable',
        dbLatencyMs: Date.now() - started,
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
