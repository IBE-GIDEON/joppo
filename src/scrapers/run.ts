/**
 * CLI wrapper around the ingestion engine.
 *
 *   npm run seed                        seed the source list, then crawl it all
 *   npm run ingest                      crawl every enabled source
 *   npm run ingest -- --only=GRANT      one category
 *   npm run ingest -- --kind=greenhouse one platform
 *   npm run ingest -- --limit=10        the ten stalest sources
 *   npm run ingest -- --stale=14        also retire listings unseen for 14 days
 *
 * In production the same engine runs hourly through /api/cron/ingest, so this
 * is for local work and one-off backfills.
 */
import fs from 'node:fs';
import path from 'node:path';

loadEnv();

// Imported after loadEnv so DATABASE_URL is set before Prisma initialises.
const { runIngestion, seedSources } = await import('./ingest');
const { purgeExpiredUsage } = await import('../lib/rate-limit');

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
  console.log('\n  Joppo ingestion\n  ' + '-'.repeat(52));

  if (has('seed')) {
    const n = await seedSources();
    console.log(`  seeded ${n} sources`);
  }

  const result = await runIngestion({
    only: flag('only'),
    kind: flag('kind'),
    limit: flag('limit') ? Number(flag('limit')) : undefined,
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
