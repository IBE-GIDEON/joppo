/** Local board discovery. See src/scrapers/discover.ts for how it works. */
import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), '.env');
if (fs.existsSync(file)) {
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["'](.*)["']$/, '$1');
    }
  }
}

const { discover } = await import('./discover');

const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];

const result = await discover({
  maxProbes: Number(arg('probes') ?? 300),
  dryRun: process.argv.includes('--dry'),
  onLog: (l) => console.log(l),
});

console.log(`\n  probed ${result.probed}, found ${result.found}, added ${result.added}`);
console.log(`  roughly ${result.estimatedListings} new listings available`);
if (result.exhausted) console.log('  candidate list exhausted — add more to src/scrapers/candidates.ts');
