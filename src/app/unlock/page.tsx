import { redirect } from 'next/navigation';
import { currentUserId } from '@/lib/auth';
import { getEntitlement } from '@/lib/entitlement';
import { prisma } from '@/lib/db';
import { toList } from '@/lib/utils';
import { buildWhere, profileToSearch } from '@/lib/search';
import type { Category } from '@/lib/types';
import { Wordmark } from '@/components/landing/wordmark';
import { PlanPicker } from '@/components/app/plan-picker';
import { LockedPreview } from '@/components/app/locked-preview';

export const metadata = { title: 'Unlock your matches' };
export const dynamic = 'force-dynamic';

const ERRORS: Record<string, string> = {
  payment_failed: 'That payment did not go through. Nothing was charged.',
  verification_failed:
    'We could not confirm that payment. If you were charged, contact support and we will sort it out.',
  missing_reference: 'The payment session expired before it completed.',
};

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; error?: string }>;
}) {
  const params = await searchParams;
  const userId = await currentUserId();
  if (!userId) redirect('/login');

  const entitlement = await getEntitlement(userId);
  if (!entitlement.onboarded) redirect('/onboarding');
  if (entitlement.subscribed) redirect('/search');

  const profile = await prisma.profile.findUnique({ where: { userId } });
  const roles = toList(profile?.roles);

  // The preview and the headline number come from one query, so the rows
  // shown are literally a sample of the matches being counted.
  const where = buildWhere(profileToSearch(profile));

  const [matchCount, teaser] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy: { postedAt: 'desc' },
      take: 6,
      select: {
        id: true,
        title: true,
        category: true,
        locations: true,
        remote: true,
        workArrangement: true,
        postedAt: true,
      },
    }),
  ]);

  return (
    <main className="relative min-h-screen px-5 py-12">
      <div className="bloom left-1/2 top-[-12rem] h-[32rem] w-[48rem] -translate-x-1/2 bg-iris-600/35" />

      <div className="relative mx-auto max-w-4xl">
        <div className="flex flex-col items-center">
          <Wordmark className="mb-10" />
        </div>

        <div className="text-center">
          <p className="eyebrow">Your search is ready</p>
          <h1 className="mt-4 text-balance font-semibold tracking-tightest text-white [font-size:clamp(2rem,5vw,3.25rem)] [line-height:1.05]">
            {matchCount > 0 ? (
              <>
                <span className="text-iris-300">{matchCount.toLocaleString()}</span>{' '}
                {matchCount === 1 ? 'match is' : 'matches are'} waiting.
              </>
            ) : (
              <>Your search is set up.</>
            )}
          </h1>
          <p className="lede mt-4">
            {matchCount > 0 ? (
              <>
                {roles.length > 0
                  ? `Built from what you told us about ${listPhrase(roles)}.`
                  : 'Built from the answers you just gave us.'}{' '}
                Unlock to see who is hiring, read the full posting and apply at the
                source.
              </>
            ) : (
              <>
                Nothing matches those answers yet. Unlock to widen the filters and search
                all {' '}
                {(await prisma.listing.count({ where: { active: true } })).toLocaleString()}{' '}
                live opportunities.
              </>
            )}
          </p>
        </div>

        {params.error ? (
          <p className="mx-auto mt-7 max-w-md rounded-xl border border-red-400/20 bg-red-400/[0.07] p-3.5 text-center text-[13px] text-red-200/85">
            {ERRORS[params.error] ?? 'Something went wrong with that payment.'}
          </p>
        ) : null}

        <LockedPreview
          items={teaser.map((t) => ({
            id: t.id,
            title: t.title,
            category: t.category as Category,
            locations: toList(t.locations),
            remote: t.remote,
            workArrangement: t.workArrangement,
            postedAt: t.postedAt.toISOString(),
          }))}
        />

        <PlanPicker initialPlan={params.plan} />

        <p className="mx-auto mt-8 max-w-md text-center text-[12px] leading-relaxed text-white/25">
          Payment is handled by Paystack. Joppo never sees your card details. Access runs
          to the end of the period you paid for, and there is no auto-renew trap.
        </p>
      </div>
    </main>
  );
}

function listPhrase(items: string[]): string {
  const shown = items.slice(0, 3);
  if (shown.length === 1) return shown[0];
  if (shown.length === 2) return `${shown[0]} and ${shown[1]}`;
  return `${shown[0]}, ${shown[1]} and ${shown[2]}`;
}
