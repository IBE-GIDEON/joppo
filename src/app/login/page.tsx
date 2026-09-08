import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentUserId, googleEnabled } from '@/lib/auth';
import { getEntitlement, nextStep } from '@/lib/entitlement';
import { Wordmark } from '@/components/landing/wordmark';
import { LoginForm } from '@/components/app/login-form';
import { LEGAL } from '@/lib/legal';

export const metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; error?: string }>;
}) {
  const params = await searchParams;
  const userId = await currentUserId();
  if (userId) {
    const entitlement = await getEntitlement(userId);
    redirect(nextStep(entitlement));
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-5 py-16">
      <div className="bloom left-1/2 top-[-10rem] h-[28rem] w-[40rem] -translate-x-1/2 bg-iris-600/35" />

      <Link href="/" className="relative mb-10">
        <Wordmark />
      </Link>

      <div className="panel relative w-full max-w-[380px] p-8">
        <h1 className="text-[22px] font-semibold tracking-tight text-white">Get into Joppo</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-white/45">
          A few quick questions, then your matches.
        </p>

        {params.error ? (
          <p className="mt-5 rounded-[6px] border border-red-400/20 bg-red-400/[0.07] p-3 text-[12.5px] leading-relaxed text-red-200/85">
            That sign-in did not complete. Try again, and if it keeps failing, email us at{' '}
            {LEGAL.contactEmail}.
          </p>
        ) : null}

        <LoginForm googleEnabled={googleEnabled} plan={params.plan} />
      </div>

      <p className="relative mt-6 max-w-[380px] text-center text-[11.5px] leading-relaxed text-white/25">
        By continuing you agree to our{' '}
        <Link
          href="/terms"
          className="text-white/45 underline-offset-2 hover:text-white/70 hover:underline"
        >
          Terms
        </Link>{' '}
        and{' '}
        <Link
          href="/privacy"
          className="text-white/45 underline-offset-2 hover:text-white/70 hover:underline"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}
