import { redirect } from 'next/navigation';
import { currentUserId } from '@/lib/auth';
import { getEntitlement } from '@/lib/entitlement';
import { prisma } from '@/lib/db';
import { Wordmark } from '@/components/landing/wordmark';
import { OnboardingWizard } from '@/components/app/onboarding-wizard';

export const metadata = { title: 'Set up your search' };
export const dynamic = 'force-dynamic';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; edit?: string }>;
}) {
  const params = await searchParams;
  const userId = await currentUserId();
  if (!userId) redirect('/login');

  const entitlement = await getEntitlement(userId);

  // Finished already and not deliberately editing: move them along.
  if (entitlement.onboarded && !params.edit) {
    redirect(entitlement.subscribed ? '/search' : '/unlock');
  }

  const totals = await prisma.listing.count({ where: { active: true } });

  return (
    <main className="relative min-h-screen px-5 py-12">
      <div className="bloom left-1/2 top-[-12rem] h-[30rem] w-[44rem] -translate-x-1/2 bg-iris-600/30" />

      <div className="relative mx-auto flex max-w-lg flex-col items-center">
        <Wordmark className="mb-10" />
        <OnboardingWizard totalListings={totals} plan={params.plan} />
      </div>
    </main>
  );
}
