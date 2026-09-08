import { prisma } from '@/lib/db';
import { PLANS, type PlanId } from '@/lib/plans';

/**
 * Rate limiting and plan quotas.
 *
 * Counting happens in the database rather than in process memory. Serverless
 * instances each hold their own memory and are created and destroyed
 * constantly, so an in-memory counter would let an attacker reset the limit
 * simply by being routed to a fresh instance.
 *
 * Two limits apply:
 *
 *   Burst   an hourly cap keyed on IP for anonymous callers, or on user id for
 *           signed-in ones. This is what stops scraping and hammering.
 *   Quota   a monthly cap keyed on user id, set by the plan they bought. This
 *           is what the pricing cards advertise.
 *
 * One upsert per request covers whichever limit applies, so the cost is a
 * single indexed write.
 */

/** Hourly burst caps. Generous for a person, tight for a script. */
export const BURST_LIMITS = {
  anonymous: 60,
  signedIn: 300,
  subscribed: 900,
} as const;

/** Monthly search allowance per plan, advertised on the pricing cards. */
export const PLAN_SEARCH_QUOTA: Record<PlanId, number> = {
  WEEKLY: 1_000,
  MONTHLY: 5_000,
  YEARLY: 20_000,
};

export interface RateResult {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets, for the Retry-After header. */
  retryAfter: number;
  reason?: 'burst' | 'quota';
}

function hourWindow(now = new Date()): string {
  return now.toISOString().slice(0, 13); // YYYY-MM-DDTHH
}

function monthWindow(now = new Date()): string {
  return now.toISOString().slice(0, 7); // YYYY-MM
}

function secondsToNextHour(now = new Date()): number {
  return 3600 - (now.getMinutes() * 60 + now.getSeconds());
}

function secondsToNextMonth(now = new Date()): number {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return Math.max(60, Math.round((next.getTime() - now.getTime()) / 1000));
}

/**
 * Increment a counter and report whether it is over its limit.
 *
 * The upsert is atomic, so two simultaneous requests cannot both read the same
 * count and both decide they are under the limit.
 */
async function bump(
  key: string,
  window: string,
  limit: number,
  ttlSeconds: number,
): Promise<{ count: number; ok: boolean }> {
  try {
    const row = await prisma.usage.upsert({
      where: { key_window: { key, window } },
      create: {
        key,
        window,
        count: 1,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
      update: { count: { increment: 1 } },
      select: { count: true },
    });
    return { count: row.count, ok: row.count <= limit };
  } catch {
    // A limiter that cannot reach the database must not take the site down.
    // Failing open is the right trade here: the paywall still holds, and the
    // database being unreachable is already the larger problem.
    return { count: 0, ok: true };
  }
}

/** The caller's IP, from the headers the platform sets in front of us. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('cf-connecting-ip') ??
    'unknown'
  );
}

export interface LimitContext {
  userId: string | null;
  plan: PlanId | null;
  subscribed: boolean;
}

/** Check both limits for a search request. Returns the first one that trips. */
export async function checkSearchLimit(
  req: Request,
  ctx: LimitContext,
): Promise<RateResult> {
  const now = new Date();

  // 1. Burst. Anonymous callers are keyed on IP, everyone else on user id, so
  //    one person on a shared network is not limited by their neighbours.
  const burstLimit = ctx.subscribed
    ? BURST_LIMITS.subscribed
    : ctx.userId
      ? BURST_LIMITS.signedIn
      : BURST_LIMITS.anonymous;

  const burstKey = ctx.userId ? `u:${ctx.userId}` : `ip:${clientIp(req)}`;
  const burst = await bump(burstKey, hourWindow(now), burstLimit, 3600);

  if (!burst.ok) {
    return {
      ok: false,
      limit: burstLimit,
      remaining: 0,
      retryAfter: secondsToNextHour(now),
      reason: 'burst',
    };
  }

  // 2. Monthly plan quota, for paying users only. Anonymous and unpaid callers
  //    are already held by the burst limit and see nothing but locked rows.
  if (ctx.subscribed && ctx.plan) {
    const quota = PLAN_SEARCH_QUOTA[ctx.plan] ?? PLAN_SEARCH_QUOTA.MONTHLY;
    const used = await bump(`q:${ctx.userId}`, monthWindow(now), quota, secondsToNextMonth(now));

    if (!used.ok) {
      return {
        ok: false,
        limit: quota,
        remaining: 0,
        retryAfter: secondsToNextMonth(now),
        reason: 'quota',
      };
    }

    return {
      ok: true,
      limit: quota,
      remaining: Math.max(0, quota - used.count),
      retryAfter: 0,
    };
  }

  return {
    ok: true,
    limit: burstLimit,
    remaining: Math.max(0, burstLimit - burst.count),
    retryAfter: 0,
  };
}

/** Headers that tell a well-behaved client where it stands. */
export function rateHeaders(result: RateResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
  };
  if (!result.ok) headers['Retry-After'] = String(result.retryAfter);
  return headers;
}

/** Drop expired counters. Called from the crawl, which already runs hourly. */
export async function purgeExpiredUsage(): Promise<number> {
  try {
    const { count } = await prisma.usage.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return count;
  } catch {
    return 0;
  }
}

export function quotaFor(plan: PlanId): number {
  return PLAN_SEARCH_QUOTA[plan] ?? PLAN_SEARCH_QUOTA.MONTHLY;
}

export { PLANS };
