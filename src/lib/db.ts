import { PrismaClient } from '@prisma/client';

/**
 * One Prisma client, built the right way for wherever this is running.
 *
 * On Node, Prisma loads a native query engine binary and talks to Postgres
 * itself. Cloudflare Workers run in V8 isolates with no filesystem and no
 * native modules, so that binary cannot load at all. There, queries go through
 * a JavaScript Postgres driver instead, wired in as a driver adapter.
 *
 * The rest of the application is unaware of the difference: every query, the
 * crawler and the search layer are identical on both.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Workers set this; Node does not. */
function isWorkerRuntime(): boolean {
  return (
    typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair !== 'undefined' ||
    process.env.NEXT_RUNTIME === 'edge'
  );
}

function createClient(): PrismaClient {
  const log = process.env.NODE_ENV === 'development' ? (['warn', 'error'] as const) : (['error'] as const);

  if (isWorkerRuntime()) {
    // Required lazily so bundling for Node never pulls the Workers driver in.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaPg } = require('@prisma/adapter-pg-worker') as typeof import('@prisma/adapter-pg-worker');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Pool } = require('@prisma/pg-worker') as typeof import('@prisma/pg-worker');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    return new PrismaClient({ adapter: new PrismaPg(pool), log: [...log] });
  }

  return new PrismaClient({ log: [...log] });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
