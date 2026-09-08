/**
 * Board discovery.
 *
 * Adding companies by hand does not scale. Applicant tracking systems expose
 * each customer's board at a predictable URL keyed by a short token, usually
 * derived from the company name, so a token can simply be tried. A probe is one
 * cheap request that either returns a board with jobs on it or does not.
 *
 * Hit rates on hand-written candidate names run around a third, so a list of a
 * few thousand plausible tokens yields hundreds of real boards, each carrying
 * roughly 150 to 200 listings.
 */
import { prisma } from '../lib/db';
import { pool, positiveInt } from './core';
import { CANDIDATE_TOKENS } from './candidates';

const UA = process.env.INGEST_USER_AGENT || 'JoppoBot/0.1 (+https://joppo.app/bot)';

/** How to reach each platform's board, and how to count what came back. */
const PROBES: Record<string, { url: (t: string) => string; count: (body: unknown) => number }> = {
  greenhouse: {
    url: (t) => `https://boards-api.greenhouse.io/v1/boards/${t}/jobs`,
    count: (b) => arrayLength((b as { jobs?: unknown[] })?.jobs),
  },
  lever: {
    url: (t) => `https://api.lever.co/v0/postings/${t}?mode=json`,
    count: (b) => (Array.isArray(b) ? b.length : 0),
  },
  ashby: {
    url: (t) => `https://api.ashbyhq.com/posting-api/job-board/${t}`,
    count: (b) => arrayLength((b as { jobs?: unknown[] })?.jobs),
  },
  workable: {
    url: (t) => `https://apply.workable.com/api/v1/widget/accounts/${t}?details=true`,
    count: (b) => arrayLength((b as { jobs?: unknown[] })?.jobs),
  },
  smartrecruiters: {
    url: (t) => `https://api.smartrecruiters.com/v1/companies/${t}/postings?limit=1`,
    count: (b) => {
      const total = (b as { totalFound?: number })?.totalFound;
      return typeof total === 'number' ? total : arrayLength((b as { content?: unknown[] })?.content);
    },
  },
  recruitee: {
    url: (t) => `https://${t}.recruitee.com/api/offers/`,
    count: (b) => arrayLength((b as { offers?: unknown[] })?.offers),
  },
};

export const DISCOVERABLE_KINDS = Object.keys(PROBES);

function arrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

export interface Discovery {
  kind: string;
  token: string;
  listings: number;
}

export interface DiscoverOptions {
  /** Tokens to try. Defaults to the built-in candidate list. */
  candidates?: string[];
  /** Platforms to probe. Defaults to all of them. */
  kinds?: string[];
  /** Stop after this many probes. */
  maxProbes?: number;
  /** Give up starting new probes after this much wall clock. */
  timeBudgetMs?: number;
  concurrency?: number;
  /** Work out what to add without writing anything. */
  dryRun?: boolean;
  onLog?: (line: string) => void;
}

export interface DiscoverResult {
  probed: number;
  found: number;
  added: number;
  skippedKnown: number;
  estimatedListings: number;
  durationMs: number;
  discoveries: Discovery[];
  exhausted: boolean;
}

/** One probe. Anything other than a board with jobs on it counts as a miss. */
async function probe(kind: string, token: string): Promise<number> {
  const spec = PROBES[kind];
  if (!spec) return 0;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(spec.url(token), {
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return 0;

    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('json')) return 0;

    return spec.count(await res.json());
  } catch {
    // A miss and a network failure are the same thing here: no board found.
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Normalise a company name into the token shapes an ATS is likely to use.
 * "Acme Robotics, Inc." yields acmerobotics, acme-robotics and acme.
 */
export function tokenVariants(name: string): string[] {
  const cleaned = name
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/\b(inc|llc|ltd|limited|corp|corporation|gmbh|bv|plc|sa|ag|co|company|group|holdings|technologies|technology|labs|the)\b/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const out = new Set<string>();
  out.add(words.join(''));
  if (words.length > 1) {
    out.add(words.join('-'));
    out.add(words[0]);
  }
  return [...out].filter((t) => t.length >= 2 && t.length <= 40);
}

export async function discover(options: DiscoverOptions = {}): Promise<DiscoverResult> {
  const started = Date.now();
  const {
    candidates = CANDIDATE_TOKENS,
    kinds = DISCOVERABLE_KINDS,
    maxProbes = 400,
    timeBudgetMs,
    concurrency = positiveInt(process.env.DISCOVER_CONCURRENCY, 8),
    dryRun = false,
    onLog = () => {},
  } = options;

  // Never re-probe a board already on the crawl list.
  const existing = await prisma.source.findMany({ select: { kind: true, token: true } });
  const known = new Set(existing.map((s) => `${s.kind}:${s.token}`));

  const jobs: { kind: string; token: string }[] = [];
  let skippedKnown = 0;

  outer: for (const token of candidates) {
    for (const kind of kinds) {
      if (known.has(`${kind}:${token}`)) {
        skippedKnown++;
        continue;
      }
      jobs.push({ kind, token });
      if (jobs.length >= maxProbes) break outer;
    }
  }

  const exhausted = jobs.length < maxProbes;
  const discoveries: Discovery[] = [];
  let probed = 0;

  await pool(jobs, concurrency, async ({ kind, token }) => {
    if (timeBudgetMs && Date.now() - started > timeBudgetMs) return;
    probed++;

    const listings = await probe(kind, token);
    // One or two hits are usually a parked or abandoned board.
    if (listings >= 3) {
      discoveries.push({ kind, token, listings });
      onLog(`  found ${kind}/${token} (${listings})`);
    }
  });

  let added = 0;
  if (!dryRun) {
    for (const d of discoveries) {
      await prisma.source.upsert({
        where: { kind_token: { kind: d.kind, token: d.token } },
        create: {
          kind: d.kind,
          token: d.token,
          // The crawler reads the real company name off the board itself.
          label: null,
          category: 'JOB',
        },
        update: { enabled: true },
      });
      added++;
    }
  }

  return {
    probed,
    found: discoveries.length,
    added,
    skippedKnown,
    estimatedListings: discoveries.reduce((sum, d) => sum + d.listings, 0),
    durationMs: Date.now() - started,
    discoveries: discoveries.sort((a, b) => b.listings - a.listings),
    exhausted,
  };
}

/**
 * Companies already in the catalogue are strong candidates on platforms we have
 * not yet checked, and their names often differ from the token that found them.
 */
export async function candidatesFromCatalogue(limit = 500): Promise<string[]> {
  const companies = await prisma.company.findMany({
    select: { slug: true, name: true },
    take: limit,
  });

  const out = new Set<string>();
  for (const c of companies) {
    out.add(c.slug);
    for (const variant of tokenVariants(c.name)) out.add(variant);
  }
  return [...out];
}
