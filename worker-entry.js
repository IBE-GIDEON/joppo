/**
 * The Worker entry point.
 *
 * OpenNext generates a worker that exports `fetch` and nothing else. A
 * Cloudflare cron trigger does not send an HTTP request, though: it invokes
 * `scheduled()`. With no such export the trigger fired on the hour into
 * nothing, which is why the crawl had not run for nineteen hours while the
 * deploy, the health check and every page all looked fine.
 *
 * So this wraps the generated worker rather than replacing it. Requests are
 * handed straight through, the Durable Objects OpenNext relies on are
 * re-exported untouched, and the only addition is the missing handler.
 */
import nextWorker, {
  DOQueueHandler,
  DOShardedTagCache,
  BucketCachePurge,
} from './.open-next/worker.js';

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge };

/**
 * The crawl runs through the app's own route rather than importing the
 * ingestion code directly. A scheduled run and a manual curl then take exactly
 * the same path, so testing one tests the other. It is an in-process call, not
 * a network round trip.
 */
async function runScheduledCrawl(env, ctx) {
  if (!env.CRON_SECRET) {
    console.error('[cron] CRON_SECRET is not set, so the crawl endpoint would refuse this.');
    return;
  }

  // The host only has to parse; routing is by pathname. NEXTAUTH_URL is used
  // when present so anything reading the request origin sees the real site.
  const origin = env.NEXTAUTH_URL || 'https://joppo.invalid';
  const request = new Request(new URL('/api/cron/ingest', origin), {
    method: 'POST',
    headers: { authorization: `Bearer ${env.CRON_SECRET}` },
  });

  try {
    const response = await nextWorker.fetch(request, env, ctx);
    const body = (await response.text()).slice(0, 1000);
    console.log(`[cron] crawl finished ${response.status} ${body}`);
  } catch (err) {
    console.error('[cron] crawl threw', err instanceof Error ? err.stack : err);
  }
}

export default {
  fetch(request, env, ctx) {
    return nextWorker.fetch(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    const work = runScheduledCrawl(env, ctx);
    // Both, deliberately. waitUntil keeps the isolate alive if the runtime
    // decides scheduled() is done; awaiting keeps the invocation itself open.
    ctx.waitUntil(work);
    await work;
  },
};
