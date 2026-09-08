import { NextResponse } from 'next/server';
import { runIngestion } from '@/scrapers/ingest';

export const dynamic = 'force-dynamic';
// Vercel caps this by plan. The run also self-limits with a time budget, so a
// lower cap degrades to fewer sources per run rather than a failed job.
export const maxDuration = 60;

/**
 * Hourly crawl. Each run takes the least-recently-crawled sources first and
 * stops on either the batch size or the time budget, so no single invocation
 * runs long and every source stays fresh over the course of a few hours.
 *
 * Scheduled in vercel.json. Vercel sends `Authorization: Bearer $CRON_SECRET`.
 * A `?token=` query parameter is accepted too, for hosts that cannot set a
 * header (cron-job.org, GitHub Actions, a plain crontab with curl).
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not set, so the crawl endpoint is disabled.' },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const bearer = req.headers.get('authorization');
  const authorised =
    bearer === `Bearer ${secret}` || url.searchParams.get('token') === secret;

  if (!authorised) {
    return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });
  }

  const batch = Number(url.searchParams.get('limit') ?? process.env.INGEST_BATCH ?? 10);
  // Retire listings not seen for a week. The crawl cycle is a few hours, so a
  // listing missing for seven days is genuinely gone from the source.
  const staleDays = Number(url.searchParams.get('stale') ?? 7);

  try {
    const result = await runIngestion({
      limit: Number.isFinite(batch) && batch > 0 ? batch : 10,
      timeBudgetMs: (maxDuration - 12) * 1000,
      staleDays: Number.isFinite(staleDays) ? staleDays : 7,
      forceSeed: url.searchParams.get('seed') === '1',
    });

    return NextResponse.json(
      {
        ok: true,
        sources: {
          total: result.sourcesTotal,
          enabled: result.sourcesEnabled,
          seeded: result.sourcesSeeded,
        },
        crawled: result.sourcesRun,
        failed: result.sourcesFailed,
        upserted: result.listingsUpserted,
        retired: result.retired,
        seconds: Math.round(result.durationMs / 1000),
        catalogue: result.totals,
        // Surfaces per-source failures so a broken adapter is visible from the
        // response instead of only in the platform logs.
        errors: result.perSource.filter((s) => s.error).slice(0, 5),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ingestion failed.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
