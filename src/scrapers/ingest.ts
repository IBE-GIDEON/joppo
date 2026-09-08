/**
 * The ingestion engine, callable from both the CLI and the hourly cron route.
 *
 * Serverless functions have a hard time limit, so a run never tries to crawl
 * everything. It takes the least-recently-crawled sources first and stops when
 * either the batch size or the time budget is reached. Run it often enough and
 * every source stays fresh without any single invocation running long.
 */
import { prisma } from '../lib/db';
import { pool, positiveInt, type Adapter, type RawListing } from './core';
import { greenhouse, lever, ashby, workable, smartrecruiters, recruitee } from './adapters/ats';
import { grantsgov, jsonld, curated } from './adapters/open';
import { fromList } from '../lib/utils';
import { isCategory } from '../lib/types';
import { SOURCE_SEEDS } from './sources';

const ADAPTERS: Record<string, Adapter> = {
  greenhouse,
  lever,
  ashby,
  workable,
  smartrecruiters,
  recruitee,
  grantsgov,
  jsonld,
  curated,
};

export interface IngestOptions {
  /** Max sources to crawl in this run. */
  limit?: number;
  /** Stop starting new sources once this much wall clock has passed. */
  timeBudgetMs?: number;
  /** Restrict to one category or one adapter kind. */
  only?: string;
  kind?: string;
  /** Mark listings not seen in this many days as inactive. 0 disables. */
  staleDays?: number;
  concurrency?: number;
  /** Re-seed the crawl list even when sources already exist. */
  forceSeed?: boolean;
  onLog?: (line: string) => void;
}

export interface IngestResult {
  /** Diagnostics: what the crawl list looked like before and after. */
  sourcesTotal: number;
  sourcesEnabled: number;
  sourcesSeeded: number;
  sourcesRun: number;
  sourcesFailed: number;
  listingsUpserted: number;
  retired: number;
  durationMs: number;
  totals: { active: number; companies: number; byCategory: Record<string, number> };
  perSource: { source: string; count: number; error?: string }[];
}

const companyCache = new Map<string, string>();

async function upsertCompany(raw: RawListing): Promise<string | null> {
  const slug = raw.companySlug;
  const name = raw.companyName;
  if (!slug || !name) return null;

  const cached = companyCache.get(slug);
  if (cached) return cached;

  const company = await prisma.company.upsert({
    where: { slug },
    create: {
      slug,
      name,
      logoUrl: raw.companyLogo ?? null,
      domain: raw.companyDomain ?? null,
      industry: raw.industry ?? null,
      source: raw.source,
    },
    update: {
      name,
      ...(raw.companyLogo ? { logoUrl: raw.companyLogo } : {}),
      ...(raw.industry ? { industry: raw.industry } : {}),
    },
    select: { id: true },
  });

  companyCache.set(slug, company.id);
  return company.id;
}

/** A contract role found on a career page belongs in Contracts, not Jobs. */
function resolveCategory(raw: RawListing): string {
  if (raw.category === 'JOB' && raw.employmentType === 'CONTRACT') return 'CONTRACT';
  return raw.category;
}

async function persist(raw: RawListing): Promise<boolean> {
  if (!raw.title?.trim() || !raw.applyUrl?.trim() || !raw.externalId) return false;

  const companyId = await upsertCompany(raw);

  const shared = {
    category: resolveCategory(raw),
    title: raw.title.trim().slice(0, 300),
    description: raw.description ?? '',
    applyUrl: raw.applyUrl.trim(),
    companyId,
    companyName: raw.companyName ?? null,
    locations: fromList(raw.locations),
    remote: raw.remote ?? false,
    workArrangement: raw.workArrangement ?? null,
    employmentType: raw.employmentType ?? null,
    seniority: raw.seniority ?? null,
    tags: fromList(raw.tags),
    salaryMin: raw.salaryMin ?? null,
    salaryMax: raw.salaryMax ?? null,
    salaryCurrency: raw.salaryCurrency ?? null,
    amountMin: raw.amountMin ?? null,
    amountMax: raw.amountMax ?? null,
    amountCurrency: raw.amountCurrency ?? null,
    deadline: raw.deadline ?? null,
    funder: raw.funder ?? null,
    postedAt: raw.postedAt ?? new Date(),
    fetchedAt: new Date(),
    active: true,
  };

  await prisma.listing.upsert({
    where: { source_externalId: { source: raw.source, externalId: raw.externalId } },
    create: { externalId: raw.externalId, source: raw.source, ...shared },
    update: shared,
  });

  return true;
}

/** Load the crawl list. Safe to call repeatedly; it upserts. */
export async function seedSources(): Promise<number> {
  for (const seed of SOURCE_SEEDS) {
    await prisma.source.upsert({
      where: { kind_token: { kind: seed.kind, token: seed.token } },
      create: {
        kind: seed.kind,
        token: seed.token,
        label: seed.label ?? null,
        category: seed.category,
      },
      update: { label: seed.label ?? null, category: seed.category, enabled: true },
    });
  }
  return SOURCE_SEEDS.length;
}

export async function runIngestion(options: IngestOptions = {}): Promise<IngestResult> {
  const started = Date.now();
  const {
    limit,
    timeBudgetMs,
    only,
    kind,
    staleDays = 0,
    forceSeed = false,
    concurrency = positiveInt(process.env.INGEST_CONCURRENCY, 4),
    onLog = () => {},
  } = options;

  // A fresh deployment has tables but no crawl list. Seed it on the first run
  // so the catalogue fills itself without anyone running a command by hand.
  let seeded = 0;
  const sourcesBefore = await prisma.source.count();
  if (sourcesBefore === 0 || forceSeed) {
    seeded = await seedSources();
    onLog(`  seeded ${seeded} sources`);
  }

  const sources = await prisma.source.findMany({
    where: {
      enabled: true,
      ...(only ? { category: only.toUpperCase() } : {}),
      ...(kind ? { kind } : {}),
    },
    // Least recently crawled first, so a partial run still covers everything
    // over time instead of hammering the same boards.
    orderBy: [{ lastRunAt: { sort: 'asc', nulls: 'first' } }, { id: 'asc' }],
    ...(limit ? { take: limit } : {}),
  });

  let listingsUpserted = 0;
  let sourcesFailed = 0;
  let sourcesRun = 0;
  const perSource: IngestResult['perSource'] = [];

  await pool(sources, concurrency, async (source) => {
    if (timeBudgetMs && Date.now() - started > timeBudgetMs) return;

    const adapter = ADAPTERS[source.kind];
    const label = `${source.kind}/${source.token}`;

    if (!adapter || !isCategory(source.category)) {
      perSource.push({ source: label, count: 0, error: 'no adapter or bad category' });
      return;
    }

    try {
      const raws = await adapter({
        token: source.token,
        label: source.label,
        category: source.category,
      });

      let saved = 0;
      for (const raw of raws) {
        try {
          if (await persist(raw)) saved++;
        } catch {
          // One malformed record must not lose the rest of the batch.
        }
      }

      listingsUpserted += saved;
      sourcesRun++;
      perSource.push({ source: label, count: saved });
      onLog(`  ok  ${label.padEnd(34)} ${String(saved).padStart(5)}`);

      await prisma.source.update({
        where: { id: source.id },
        data: { lastRunAt: new Date(), lastCount: saved, lastError: null },
      });
    } catch (err) {
      sourcesFailed++;
      const message = err instanceof Error ? err.message : String(err);
      perSource.push({ source: label, count: 0, error: message.slice(0, 200) });
      onLog(`  ERR ${label.padEnd(34)} ${message.slice(0, 60)}`);

      await prisma.source.update({
        where: { id: source.id },
        // Still stamp lastRunAt so one broken source cannot block the queue.
        data: { lastRunAt: new Date(), lastError: message.slice(0, 300) },
      });
    }
  });

  let retired = 0;
  if (staleDays > 0) {
    const cutoff = new Date(Date.now() - staleDays * 86_400_000);
    const result = await prisma.listing.updateMany({
      where: { fetchedAt: { lt: cutoff }, active: true },
      data: { active: false },
    });
    retired = result.count;
  }

  const [active, companies, grouped] = await Promise.all([
    prisma.listing.count({ where: { active: true } }),
    prisma.company.count(),
    prisma.listing.groupBy({
      by: ['category'],
      where: { active: true },
      _count: { _all: true },
    }),
  ]);

  const byCategory: Record<string, number> = {};
  for (const row of grouped) byCategory[row.category] = row._count._all;

  const sourcesTotal = await prisma.source.count();
  const sourcesEnabled = await prisma.source.count({ where: { enabled: true } });

  return {
    sourcesTotal,
    sourcesEnabled,
    sourcesSeeded: seeded,
    sourcesRun,
    sourcesFailed,
    listingsUpserted,
    retired,
    durationMs: Date.now() - started,
    totals: { active, companies, byCategory },
    perSource,
  };
}
