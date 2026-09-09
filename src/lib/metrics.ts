import { prisma } from '@/lib/db';
import { PLANS, type PlanId } from '@/lib/plans';
import { PLAN_SEARCH_QUOTA } from '@/lib/rate-limit';

/**
 * Everything the admin dashboard shows, gathered in one pass.
 *
 * All of the counting happens in Postgres and comes back as a handful of small
 * rows. That is deliberate: a Worker on the free plan gets 10ms of CPU per
 * request, so the work has to happen at the other end of the connection. Time
 * spent waiting on the database does not count against that budget; time spent
 * folding thousands of rows in JavaScript would.
 *
 * Nothing here writes, and nothing here is derived from anything the user
 * controls, so it is safe to run on every page load.
 */

/** Supabase's free tier ceiling. Used to project when storage runs out. */
const SUPABASE_FREE_BYTES = 500 * 1024 * 1024;

export interface Point {
  day: string;
  value: number;
}

export interface PersonRow {
  id: string;
  email: string | null;
  name: string | null;
  joined: Date;
  onboarded: boolean;
  plan: string | null;
  subStatus: string | null;
  expires: Date | null;
  paidMinor: number;
  payments: number;
  searches: number;
  quota: number;
}

export interface Metrics {
  generatedAt: Date;

  people: {
    total: number;
    today: number;
    last7: number;
    last30: number;
    onboarded: number;
    onboardRate: number;
    signupSeries: Point[];
  };

  money: {
    grossMinor: number;
    monthMinor: number;
    last30Minor: number;
    currency: string;
    payingUsers: number;
    conversionRate: number;
    arpuMinor: number;
    byStatus: { status: string; count: number; minor: number }[];
    revenueSeries: Point[];
  };

  subs: {
    active: number;
    lapsed: number;
    byPlan: { plan: string; active: number; lapsed: number }[];
    expiringSoon: PersonRow[];
    churnRate: number;
    /** When the last still-valid subscription lapses. */
    lastAccessEndsAt: Date | null;
  };

  usage: {
    searchesThisMonth: number;
    activeSearchers: number;
    busiest: PersonRow[];
  };

  catalogue: {
    active: number;
    retired: number;
    companies: number;
    byCategory: { category: string; count: number }[];
    retiredLast24h: number;
  };

  crawl: {
    sources: number;
    enabled: number;
    failing: number;
    neverRun: number;
    ranLast24h: number;
    oldestRunAt: Date | null;
    newestRunAt: Date | null;
    hoursSinceOldest: number | null;
    failures: { label: string; kind: string; error: string; lastRunAt: Date | null }[];
  };

  limits: {
    dbBytes: number;
    dbLimitBytes: number;
    dbPercent: number;
    /** Days until the database reaches the free-tier ceiling, if it is growing. */
    dbDaysLeft: number | null;
    /** Measured bytes per day. Zero until there are two snapshots to compare. */
    dbBytesPerDay: number;
    snapshots: number;
    dbLatencyMs: number;
  };

  people_list: PersonRow[];
  troubles: { reference: string; email: string | null; status: string; minor: number; at: Date }[];
}

/** Postgres returns bigint for count(); every count below is cast to int. */
type Row = Record<string, unknown>;

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
const date = (v: unknown): Date | null => (v ? new Date(v as string) : null);

export async function collectMetrics(): Promise<Metrics> {
  const startedAt = Date.now();

  const [
    peopleRow,
    signupRows,
    moneyRow,
    statusRows,
    revenueRows,
    subRows,
    expiryRow,
    catalogueRow,
    categoryRows,
    sourceRow,
    failureRows,
    sizeRow,
    usageRows,
    rosterRows,
    troubleRows,
    snapshotRows,
  ] = await Promise.all([
    prisma.$queryRawUnsafe<Row[]>(`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE "createdAt" >= CURRENT_DATE)::int AS today,
             COUNT(*) FILTER (WHERE "createdAt" >= now() - INTERVAL '7 days')::int AS last7,
             COUNT(*) FILTER (WHERE "createdAt" >= now() - INTERVAL '30 days')::int AS last30
      FROM "User"`),

    prisma.$queryRawUnsafe<Row[]>(`
      SELECT to_char(d, 'YYYY-MM-DD') AS day, COUNT(u.id)::int AS value
      FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day') d
      LEFT JOIN "User" u ON u."createdAt" >= d AND u."createdAt" < d + INTERVAL '1 day'
      GROUP BY d ORDER BY d`),

    prisma.$queryRawUnsafe<Row[]>(`
      SELECT COALESCE(SUM(amount) FILTER (WHERE status = 'success'), 0)::int AS gross,
             COALESCE(SUM(amount) FILTER (WHERE status = 'success'
               AND "createdAt" >= date_trunc('month', now())), 0)::int AS month,
             COALESCE(SUM(amount) FILTER (WHERE status = 'success'
               AND "createdAt" >= now() - INTERVAL '30 days'), 0)::int AS last30,
             COUNT(DISTINCT "userId") FILTER (WHERE status = 'success')::int AS paying
      FROM "Payment"`),

    prisma.$queryRawUnsafe<Row[]>(`
      SELECT status, COUNT(*)::int AS count, COALESCE(SUM(amount), 0)::int AS minor
      FROM "Payment" GROUP BY status ORDER BY count DESC`),

    prisma.$queryRawUnsafe<Row[]>(`
      SELECT to_char(d, 'YYYY-MM-DD') AS day,
             COALESCE(SUM(p.amount), 0)::int AS value
      FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day') d
      LEFT JOIN "Payment" p ON p."createdAt" >= d AND p."createdAt" < d + INTERVAL '1 day'
                           AND p.status = 'success'
      GROUP BY d ORDER BY d`),

    prisma.$queryRawUnsafe<Row[]>(`
      SELECT plan,
             COUNT(*) FILTER (WHERE status = 'active' AND "currentPeriodEnd" > now())::int AS active,
             COUNT(*) FILTER (WHERE "currentPeriodEnd" IS NOT NULL
                              AND "currentPeriodEnd" <= now())::int AS lapsed
      FROM "Subscription" GROUP BY plan`),

    prisma.$queryRawUnsafe<Row[]>(`
      SELECT MAX("currentPeriodEnd") AS last_end
      FROM "Subscription" WHERE status = 'active' AND "currentPeriodEnd" > now()`),

    prisma.$queryRawUnsafe<Row[]>(`
      SELECT COUNT(*) FILTER (WHERE active)::int AS active,
             COUNT(*) FILTER (WHERE NOT active)::int AS retired,
             COUNT(*) FILTER (WHERE "retiredAt" >= now() - INTERVAL '24 hours')::int AS retired24,
             (SELECT COUNT(*)::int FROM "Company") AS companies
      FROM "Listing"`),

    prisma.$queryRawUnsafe<Row[]>(`
      SELECT category, COUNT(*)::int AS count
      FROM "Listing" WHERE active GROUP BY category ORDER BY count DESC`),

    prisma.$queryRawUnsafe<Row[]>(`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE enabled)::int AS enabled,
             COUNT(*) FILTER (WHERE "lastError" IS NOT NULL)::int AS failing,
             COUNT(*) FILTER (WHERE "lastRunAt" IS NULL AND enabled)::int AS never_run,
             COUNT(*) FILTER (WHERE "lastRunAt" >= now() - INTERVAL '24 hours')::int AS ran24,
             MIN("lastRunAt") FILTER (WHERE enabled) AS oldest,
             MAX("lastRunAt") AS newest
      FROM "Source"`),

    prisma.$queryRawUnsafe<Row[]>(`
      SELECT COALESCE(label, token) AS label, kind, "lastError" AS error, "lastRunAt"
      FROM "Source" WHERE "lastError" IS NOT NULL AND enabled
      ORDER BY "lastRunAt" DESC NULLS LAST LIMIT 12`),

    prisma.$queryRawUnsafe<Row[]>(`SELECT pg_database_size(current_database())::float8 AS bytes`),

    // The monthly quota rows are the only durable record of search volume: the
    // hourly burst rows expire within the hour by design.
    prisma.$queryRawUnsafe<Row[]>(`
      SELECT REPLACE("key", 'q:', '') AS user_id, "count"::int AS count
      FROM "Usage"
      WHERE "key" LIKE 'q:%' AND "window" = to_char(now(), 'YYYY-MM')`),

    prisma.$queryRawUnsafe<Row[]>(`
      SELECT u.id, u.email, u.name, u."createdAt" AS joined,
             pr."completedAt" AS onboarded,
             s.plan, s.status AS sub_status, s."currentPeriodEnd" AS expires,
             COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'success'), 0)::int AS paid_minor,
             COUNT(p.id) FILTER (WHERE p.status = 'success')::int AS payments
      FROM "User" u
      LEFT JOIN "Profile" pr ON pr."userId" = u.id
      LEFT JOIN "Subscription" s ON s."userId" = u.id
      LEFT JOIN "Payment" p ON p."userId" = u.id
      GROUP BY u.id, u.email, u.name, u."createdAt", pr."completedAt",
               s.plan, s.status, s."currentPeriodEnd"
      ORDER BY u."createdAt" DESC
      LIMIT 300`),

    prisma.$queryRawUnsafe<Row[]>(`
      SELECT p.reference, u.email, p.status, p.amount::int AS minor, p."createdAt" AS at
      FROM "Payment" p LEFT JOIN "User" u ON u.id = p."userId"
      WHERE p.status <> 'success'
      ORDER BY p."createdAt" DESC LIMIT 20`),

    // Cast out of bigint here: Prisma hands BigInt back otherwise, which does
    // not survive JSON and is not worth the precision for a byte count.
    prisma.$queryRawUnsafe<Row[]>(`
      SELECT "takenAt", "dbBytes"::float8 AS bytes, listings::int AS listings
      FROM "Snapshot" WHERE "takenAt" >= now() - INTERVAL '30 days'
      ORDER BY "takenAt" ASC`),
  ]);

  const dbLatencyMs = Date.now() - startedAt;

  const searchesByUser = new Map<string, number>();
  for (const row of usageRows) {
    searchesByUser.set(String(row.user_id), num(row.count));
  }

  const roster: PersonRow[] = rosterRows.map((r) => {
    const plan = (r.plan as string | null) ?? null;
    return {
      id: String(r.id),
      email: (r.email as string | null) ?? null,
      name: (r.name as string | null) ?? null,
      joined: new Date(r.joined as string),
      onboarded: Boolean(r.onboarded),
      plan,
      subStatus: (r.sub_status as string | null) ?? null,
      expires: date(r.expires),
      paidMinor: num(r.paid_minor),
      payments: num(r.payments),
      searches: searchesByUser.get(String(r.id)) ?? 0,
      quota: plan && plan in PLAN_SEARCH_QUOTA ? PLAN_SEARCH_QUOTA[plan as PlanId] : 0,
    };
  });

  const p = peopleRow[0] ?? {};
  const m = moneyRow[0] ?? {};
  const c = catalogueRow[0] ?? {};
  const s = sourceRow[0] ?? {};

  const total = num(p.total);
  const onboarded = roster.filter((r) => r.onboarded).length;
  const payingUsers = num(m.paying);

  const activeSubs = subRows.reduce((n, r) => n + num(r.active), 0);
  const lapsedSubs = subRows.reduce((n, r) => n + num(r.lapsed), 0);

  const oldestRunAt = date(s.oldest);
  const hoursSinceOldest = oldestRunAt
    ? Math.floor((Date.now() - oldestRunAt.getTime()) / 3_600_000)
    : null;

  // Storage projection. Growth is measured against the catalogue rather than
  // time, because a brand new database has no history to extrapolate from:
  // bytes per listing multiplied by the listings a day's crawling adds.
  const dbBytes = num(sizeRow[0]?.bytes);
  const activeListings = num(c.active);

  // Growth is measured, not guessed. The oldest and newest snapshots inside the
  // window give bytes per day; with fewer than two, or with no measurable
  // growth yet, there is no honest projection to make and the dashboard says so
  // rather than printing a number that means nothing.
  const first = snapshotRows[0];
  const last = snapshotRows[snapshotRows.length - 1];
  let bytesPerDay = 0;
  if (first && last && first !== last) {
    const spanDays =
      (new Date(last.takenAt as string).getTime() - new Date(first.takenAt as string).getTime()) /
      86_400_000;
    if (spanDays >= 0.5) bytesPerDay = (num(last.bytes) - num(first.bytes)) / spanDays;
  }
  const dbDaysLeft =
    bytesPerDay > 0
      ? Math.max(0, Math.round((SUPABASE_FREE_BYTES - dbBytes) / bytesPerDay))
      : null;

  const nowMs = Date.now();
  const expiringSoon = roster
    .filter(
      (r) =>
        r.expires !== null &&
        r.expires.getTime() > nowMs &&
        r.expires.getTime() < nowMs + 7 * 86_400_000,
    )
    .sort((a, b) => (a.expires!.getTime() - b.expires!.getTime()));

  return {
    generatedAt: new Date(),

    people: {
      total,
      today: num(p.today),
      last7: num(p.last7),
      last30: num(p.last30),
      onboarded,
      onboardRate: total > 0 ? onboarded / total : 0,
      signupSeries: signupRows.map((r) => ({ day: String(r.day), value: num(r.value) })),
    },

    money: {
      grossMinor: num(m.gross),
      monthMinor: num(m.month),
      last30Minor: num(m.last30),
      currency: process.env.PAYSTACK_CURRENCY || 'USD',
      payingUsers,
      conversionRate: total > 0 ? payingUsers / total : 0,
      arpuMinor: payingUsers > 0 ? Math.round(num(m.gross) / payingUsers) : 0,
      byStatus: statusRows.map((r) => ({
        status: String(r.status),
        count: num(r.count),
        minor: num(r.minor),
      })),
      revenueSeries: revenueRows.map((r) => ({ day: String(r.day), value: num(r.value) })),
    },

    subs: {
      active: activeSubs,
      lapsed: lapsedSubs,
      byPlan: subRows.map((r) => ({
        plan: String(r.plan),
        active: num(r.active),
        lapsed: num(r.lapsed),
      })),
      expiringSoon,
      // Everyone who has ever held a subscription, against those whose access
      // has run out. With one-off charges and no auto-renew, a lapse is the
      // only form a cancellation can take.
      churnRate: activeSubs + lapsedSubs > 0 ? lapsedSubs / (activeSubs + lapsedSubs) : 0,
      lastAccessEndsAt: date(expiryRow[0]?.last_end),
    },

    usage: {
      searchesThisMonth: [...searchesByUser.values()].reduce((a, b) => a + b, 0),
      activeSearchers: searchesByUser.size,
      busiest: [...roster].sort((a, b) => b.searches - a.searches).slice(0, 10),
    },

    catalogue: {
      active: activeListings,
      retired: num(c.retired),
      companies: num(c.companies),
      byCategory: categoryRows.map((r) => ({
        category: String(r.category),
        count: num(r.count),
      })),
      retiredLast24h: num(c.retired24),
    },

    crawl: {
      sources: num(s.total),
      enabled: num(s.enabled),
      failing: num(s.failing),
      neverRun: num(s.never_run),
      ranLast24h: num(s.ran24),
      oldestRunAt,
      newestRunAt: date(s.newest),
      hoursSinceOldest,
      failures: failureRows.map((r) => ({
        label: String(r.label),
        kind: String(r.kind),
        error: String(r.error ?? '').slice(0, 200),
        lastRunAt: date(r.lastRunAt),
      })),
    },

    limits: {
      dbBytes,
      dbLimitBytes: SUPABASE_FREE_BYTES,
      dbPercent: dbBytes / SUPABASE_FREE_BYTES,
      dbDaysLeft,
      dbBytesPerDay: bytesPerDay,
      snapshots: snapshotRows.length,
      dbLatencyMs,
    },

    people_list: roster,
    troubles: troubleRows.map((r) => ({
      reference: String(r.reference),
      email: (r.email as string | null) ?? null,
      status: String(r.status),
      minor: num(r.minor),
      at: new Date(r.at as string),
    })),
  };
}

export function money(minor: number, currency = 'USD'): string {
  const major = minor / 100;
  const symbol = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : '';
  return `${symbol}${major.toLocaleString(undefined, {
    minimumFractionDigits: major % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}${symbol ? '' : ` ${currency}`}`;
}

export function planName(id: string | null): string {
  if (!id) return '—';
  return PLANS[id as PlanId]?.name ?? id;
}
