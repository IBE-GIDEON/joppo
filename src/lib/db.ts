import { PrismaClient } from '@prisma/client';

/**
 * One Prisma client, built the right way for wherever this is running, and
 * built at the right moment.
 *
 * Two things differ on Cloudflare Workers. There is no filesystem, no native
 * module loading and no eval, so Prisma's native query engine cannot run and a
 * JavaScript Postgres driver is wired in as a driver adapter instead. And
 * environment variables arrive from the Cloudflare bindings only once a request
 * is being handled, not at module load.
 *
 * That second point is what matters here. Creating the client at module scope
 * ran before DATABASE_URL or RUNTIME_TARGET existed, so it silently chose the
 * native engine and then threw EvalError deep inside Prisma on the first query.
 * The client is therefore created lazily, on first use, which is always inside
 * a request.
 *
 * The proxy keeps every call site unchanged: `prisma.listing.findMany()` reads
 * the same as before and simply builds the client on the first property access.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function onCloudflare(): boolean {
  if (process.env.RUNTIME_TARGET === 'cloudflare') return true;
  return typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair !== 'undefined';
}

function createClient(): PrismaClient {
  const log = (process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']) as never;

  if (onCloudflare()) {
    // Required rather than imported so a Node build never resolves a module
    // whose own dependency, cloudflare:sockets, exists only inside a Worker.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaPg } = require('@prisma/adapter-pg-worker') as typeof import('@prisma/adapter-pg-worker');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Pool } = require('@prisma/pg-worker') as typeof import('@prisma/pg-worker');

    // Deliberately not '@prisma/client'. Its exports map sends the `workerd`
    // condition to the same native build Node uses, which needs eval and a
    // filesystem and throws EvalError the moment a client is constructed
    // inside a Worker. The generated wasm build is the one that runs there.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient: WasmPrismaClient } = require('.prisma/client/wasm') as {
      PrismaClient: typeof PrismaClient;
    };

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    return new WasmPrismaClient({ adapter: new PrismaPg(pool), log });
  }

  return new PrismaClient({ log });
}

let client: PrismaClient | undefined;

/**
 * On Node the client is a long-lived singleton, which is what you want: it
 * holds a connection pool and reuses it.
 *
 * On Cloudflare it deliberately is not. A Worker ties every socket to the
 * request that opened it, so a pooled connection carried over from an earlier
 * request cannot be used again: the query never resolves and the runtime kills
 * the request with "your Worker's code had hung". That produced roughly a 40%
 * failure rate that cleared on refresh, because a refresh sometimes landed on a
 * fresh isolate.
 *
 * Building a client per request costs one connection setup and removes the
 * failure entirely.
 */
function getClient(): PrismaClient {
  if (onCloudflare()) return createClient();

  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  if (!client) {
    client = createClient();
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const instance = getClient();
    const value = Reflect.get(instance, property, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
