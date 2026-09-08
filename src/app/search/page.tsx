import { redirect } from 'next/navigation';
import { currentUserId } from '@/lib/auth';
import { getEntitlement, nextStep } from '@/lib/entitlement';
import { prisma } from '@/lib/db';
import { toList } from '@/lib/utils';
import { isCategory, type Category } from '@/lib/types';
import { SearchApp } from '@/components/app/search-app';

export const metadata = { title: 'Search' };
export const dynamic = 'force-dynamic';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ unlocked?: string }>;
}) {
  const params = await searchParams;
  const userId = await currentUserId();
  const entitlement = await getEntitlement(userId);

  // No free tier: anything short of an active subscription goes back
  // to whichever step of the funnel is unfinished.
  if (!entitlement.subscribed) redirect(nextStep(entitlement));

  const profile = await prisma.profile.findUnique({ where: { userId: userId! } });

  const categories = toList(profile?.categories).filter(isCategory) as Category[];

  return (
    <SearchApp
      justUnlocked={params.unlocked === '1'}
      expiresAt={entitlement.expiresAt ? entitlement.expiresAt.toISOString() : null}
      plan={entitlement.plan}
      defaults={{
        categories,
        roles: toList(profile?.roles),
        locations: toList(profile?.locations),
        remoteOnly: profile?.remoteOnly ?? false,
        seniority: profile?.seniority ?? null,
        salaryMin: profile?.minSalary ?? null,
      }}
    />
  );
}
