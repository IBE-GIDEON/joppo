/**
 * Applies prisma/indexes.sql after `prisma db push`.
 *
 * Prisma's schema cannot express GIN, trigram or partial indexes, and those are
 * exactly the ones search depends on. Every statement is idempotent so this
 * runs safely on every deploy.
 *
 * A failure here is logged but never fails the build: a deploy that ships
 * without an index is slow, while a deploy that does not ship at all is down.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const file = path.join(process.cwd(), 'prisma', 'indexes.sql');

if (!fs.existsSync(file)) {
  console.log('  no prisma/indexes.sql, nothing to apply');
  process.exit(0);
}

if (!/^postgres(ql)?:\/\//i.test(process.env.DATABASE_URL ?? '')) {
  console.log('  DATABASE_URL is not Postgres, skipping index setup');
  process.exit(0);
}

// Strip comments, then split on statement boundaries.
const statements = fs
  .readFileSync(file, 'utf8')
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);

const prisma = new PrismaClient({ log: ['error'] });

let applied = 0;
let failed = 0;

for (const statement of statements) {
  const name = statement.match(/(?:INDEX|EXTENSION)\s+(?:IF NOT EXISTS\s+)?"?(\w+)"?/i)?.[1] ?? '?';
  try {
    await prisma.$executeRawUnsafe(statement);
    applied++;
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed++;
    console.log(`  WARN ${name}: ${err instanceof Error ? err.message.split('\n')[0] : err}`);
  }
}

console.log(`  ${applied} index statements applied, ${failed} skipped`);
await prisma.$disconnect();
