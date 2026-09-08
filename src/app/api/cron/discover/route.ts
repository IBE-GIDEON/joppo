import { NextResponse } from 'next/server';
import { discover, candidatesFromCatalogue } from '@/scrapers/discover';
import { CANDIDATE_TOKENS } from '@/scrapers/candidates';
import { positiveInt } from '@/scrapers/core';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Board discovery. Probes candidate tokens against every applicant tracking
 * system and adds the ones that answer with a real board to the crawl list.
 *
 * Safe to call repeatedly: boards already on the list are skipped, so each run
 * works through fresh candidates. `?dry=1` reports what it would add without
 * writing. `?catalogue=1` probes names taken from companies already indexed,
 * which finds the same company on platforms not yet checked.
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not set.' }, { status: 503 });
  }

  const url = new URL(req.url);
  const authorised =
    req.headers.get('authorization') === `Bearer ${secret}` ||
    url.searchParams.get('token') === secret;

  if (!authorised) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const maxProbes = positiveInt(url.searchParams.get('probes') ?? undefined, 0) || 300;
  const kindParam = url.searchParams.get('kind');

  try {
    const candidates = url.searchParams.get('catalogue') === '1'
      ? await candidatesFromCatalogue()
      : CANDIDATE_TOKENS;

    const result = await discover({
      candidates,
      kinds: kindParam ? [kindParam] : undefined,
      maxProbes,
      timeBudgetMs: (maxDuration - 12) * 1000,
      dryRun: url.searchParams.get('dry') === '1',
    });

    return NextResponse.json(
      {
        ok: true,
        probed: result.probed,
        found: result.found,
        added: result.added,
        skippedKnown: result.skippedKnown,
        estimatedListings: result.estimatedListings,
        seconds: Math.round(result.durationMs / 1000),
        // True when every candidate has been tried and the list needs growing.
        candidatesExhausted: result.exhausted,
        boards: result.discoveries.slice(0, 25),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Discovery failed.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
