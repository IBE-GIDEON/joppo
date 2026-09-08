import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentUserId } from '@/lib/auth';
import { getEntitlement, nextStep } from '@/lib/entitlement';
import { Wordmark } from '@/components/landing/wordmark';
import { LoginForm } from '@/components/app/login-form';

export const metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; plan?: string; error?: string }>;
}) {
  const params = await searchParams;
  const userId = await currentUserId();
  if (userId) {
    const entitlement = await getEntitlement(userId);
    redirect(nextStep(entitlement));
  }

  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const smtpConfigured = Boolean(process.env.EMAIL_SERVER);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-5 py-16">
      <div className="bloom left-1/2 top-[-10rem] h-[28rem] w-[40rem] -translate-x-1/2 bg-iris-600/35" />

      <Link href="/" className="relative mb-10">
        <Wordmark />
      </Link>

      <div className="panel relative w-full max-w-[380px] p-8">
        {params.sent ? (
          <div className="text-center">
            <h1 className="text-[22px] font-semibold tracking-tight text-white">Check your inbox</h1>
            <p className="mt-3 text-[13.5px] leading-relaxed text-white/45">
              We sent you a sign-in link. It works once and expires in fifteen minutes.
            </p>
            {!smtpConfigured ? (
              <p className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.07] p-3 text-[12px] leading-relaxed text-amber-200/80">
                No mail server is configured, so the link was printed to the terminal
                running the dev server. Copy it from there.
              </p>
            ) : null}
            <Link
              href="/login"
              className="mt-6 inline-block text-[13px] text-iris-300 hover:text-iris-200"
            >
              Use a different address
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-[22px] font-semibold tracking-tight text-white">
              Get into Joppo
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-white/45">
              Two questions, then your matches. No password to remember.
            </p>

            {params.error ? (
              <p className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.07] p-3 text-[12.5px] text-red-200/85">
                That sign-in link did not work. Request a new one below.
              </p>
            ) : null}

            <LoginForm googleEnabled={googleEnabled} plan={params.plan} />
          </>
        )}
      </div>

      <p className="relative mt-6 max-w-[380px] text-center text-[11.5px] leading-relaxed text-white/25">
        By continuing you agree that Joppo may email you about your account and your
        saved searches.
      </p>
    </main>
  );
}
