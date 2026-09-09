import { prisma } from '@/lib/db';

/**
 * Write down the numbers that cannot be recovered later.
 *
 * Signups and revenue can always be recounted, because every row carries its
 * own timestamp. Database size and catalogue size cannot: they are facts about
 * right now, and once the moment passes there is nothing left to measure. So a
 * reading is taken at the end of every crawl, and the growth rate on the admin
 * dashboard is the difference between two of them rather than a guess.
 *
 * Failure here must never fail a crawl. A missing snapshot costs a data point;
 * a thrown error would cost the run that produced thousands of listings.
 */
export interface SnapshotResult {
  dbBytes: number;
  listings: number;
  users: number;
  activeSubs: number;
  grossMinor: number;
}

export async function takeSnapshot(): Promise<SnapshotResult | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT pg_database_size(current_database())::float8              AS bytes,
             (SELECT COUNT(*)::int FROM "Listing" WHERE active)        AS listings,
             (SELECT COUNT(*)::int FROM "User")                        AS users,
             (SELECT COUNT(*)::int FROM "Subscription"
               WHERE status = 'active' AND "currentPeriodEnd" > now()) AS active_subs,
             (SELECT COALESCE(SUM(amount), 0)::int FROM "Payment"
               WHERE status = 'success')                               AS gross_minor`);

    const row = rows[0];
    if (!row) return null;

    const result: SnapshotResult = {
      dbBytes: Number(row.bytes ?? 0),
      listings: Number(row.listings ?? 0),
      users: Number(row.users ?? 0),
      activeSubs: Number(row.active_subs ?? 0),
      grossMinor: Number(row.gross_minor ?? 0),
    };

    await prisma.snapshot.create({
      data: {
        dbBytes: BigInt(Math.round(result.dbBytes)),
        listings: result.listings,
        users: result.users,
        activeSubs: result.activeSubs,
        grossMinor: result.grossMinor,
      },
    });

    // A few rows a day is nothing, but it should still not grow without bound.
    await prisma.snapshot.deleteMany({
      where: { takenAt: { lt: new Date(Date.now() - 180 * 86_400_000) } },
    });

    return result;
  } catch (err) {
    console.error('  snapshot failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
