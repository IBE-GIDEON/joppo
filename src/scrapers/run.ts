/**
 * CLI wrapper around the ingestion engine.
 *
 *   npm run seed                        seed the source list, then crawl it all
 *   npm run ingest                      crawl every enabled source
 *   npm run ingest -- --only=GRANT      one category
 *   npm run ingest -- --kind=greenhouse one platform
 *   npm run ingest -- --limit=10        the ten stalest sources
 *   npm run ingest -- --stale=14        also retire listings unseen for 14 days
 *   npm run ingest -- --minutes=25      stop cleanly after twenty-five minutes
 *
 * In production the same engine runs hourly through /api/cron/ingest, so this
 * is for local work and one-off backfills.
 */
import fs from 'node:fs';
import path from 'node:path';

loadEnv();
widenPool();

/**
 * The app runs on Workers, where every request builds its own client, so
 * DATABASE_URL carries connection_limit=1. That is right there and badly wrong
 * here: this is one long-lived process, and persisting a listing costs two or
 * three round trips that all queue behind a single connection. Measured from a
 * home connection to eu-central-1 that worked out at roughly two thirds of a
 * second per listing, which is why a run of a few large boards took eleven
 * minutes and blew past its deadline.
 *
 * Supabase's transaction pooler is happy to hand out more, and only the CLI
 * takes this path, so the Worker is unaffected.
 */
function widenPool() {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  try {
    const parsed = new URL(url);
    // Enough connections for every query the run can have in flight at once:
    // sources crawled in parallel, times listings written in parallel within
    // each. Sized rather than guessed, so nothing queues behind the pool.
    const sources = positiveIntEnv(process.env.INGEST_CONCURRENCY, 4);
    const perSource = positiveIntEnv(process.env.INGEST_PERSIST, 8);
    const wanted = Math.min(30, Math.max(5, sources * perSource));
    parsed.searchParams.set('connection_limit', String(wanted));
    parsed.searchParams.set('pool_timeout', '30');
    process.env.DATABASE_URL = parsed.toString();
  } catch {
    // An unparseable URL is Prisma's problem to report, not ours to crash on.
  }
}

function positiveIntEnv(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : undefined;
};
const has = (name: string) => argv.includes(`--${name}`);

/** tsx does not read .env, so do it here without pulling in a dependency. */
function loadEnv() {
  const file = path.join(process.cwd(), '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const value = m[2].replace(/^["'](.*)["']$/, '$1');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

async function main() {
  // Imported here rather than at the top of the file, for two reasons. Prisma
  // reads DATABASE_URL as it initialises, so loadEnv() has to have run first.
  // And this file compiles to CommonJS, where a top-level await is a build
  // error, which is what made `npm run ingest` fail outright.
  const { runIngestion, seedSources } = await import('./ingest');
  const { purgeExpiredUsage } = await import('../lib/rate-limit');
  const { takeSnapshot } = await import('../lib/snapshot');

  console.log('\n  Joppo ingestion\n  ' + '-'.repeat(52));

  if (has('seed')) {
    const n = await seedSources();
    console.log(`  seeded ${n} sources`);
  }

  // A source can take anywhere from seconds to several minutes depending on how
  // large its board is, so a run's length cannot be predicted from the number of
  // sources alone. --minutes stops the run cleanly at a deadline, finishing the
  // source in hand, which degrades to fewer sources this pass rather than to a
  // scheduler killing the job halfway through one.
  const minutes = flag('minutes') ? Number(flag('minutes')) : undefined;

  const result = await runIngestion({
    only: flag('only'),
    kind: flag('kind'),
    limit: flag('limit') ? Number(flag('limit')) : undefined,
    timeBudgetMs: minutes && minutes > 0 ? minutes * 60_000 : undefined,
    staleDays: flag('stale') ? Number(flag('stale')) : 0,
    onLog: (line) => console.log(line),
  });

  console.log('  ' + '-'.repeat(52));
  console.log(
    `  ingested ${result.listingsUpserted} in ${Math.round(result.durationMs / 1000)}s, ` +
      `${result.sourcesFailed} source(s) failed`,
  );
  if (result.retired) console.log(`  retired ${result.retired} stale listings`);

  // Rate limiting writes a row per caller per hour. The crawl is the scheduled
  // job that runs often enough to be the natural place to sweep them, and it is
  // no longer reached through /api/cron/ingest, which used to do this.
  const usagePurged = await purgeExpiredUsage();
  if (usagePurged) console.log(`  purged ${usagePurged} expired rate-limit rows`);

  // Database size and catalogue size leave no trace of their own history, so
  // "how fast is this growing, and when does it run out of room" can only be
  // answered by writing the reading down as it happens.
  const snapshot = await takeSnapshot();
  if (snapshot) {
    console.log(`  snapshot: ${(snapshot.dbBytes / 1024 / 1024).toFixed(1)} MB, ${snapshot.listings} listings`);
  }
  console.log(
    `  catalogue: ${result.totals.active} active listings, ${result.totals.companies} organisations`,
  );
  for (const [category, count] of Object.entries(result.totals.byCategory).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`    ${category.padEnd(14)} ${count}`);
  }
  console.log('');
}

main().catch((err) => {
  console.error('\n  fatal:', err);
  process.exitCode = 1;
});
