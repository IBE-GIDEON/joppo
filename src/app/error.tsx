'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Wordmark } from '@/components/landing/wordmark';

/**
 * Shown when a page throws. Without this, a crash renders an unstyled Next.js
 * error screen, which for a paying user looks like the site is gone.
 *
 * The digest is Next's own identifier for the underlying error. It is safe to
 * display and it is the only way a user can tell us which failure they hit,
 * since the real message is never sent to the browser in production.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Page error:', error);
  }, [error]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-5 py-16">
      <div className="bloom left-1/2 top-[-10rem] h-[26rem] w-[38rem] -translate-x-1/2 bg-iris-600/25" />

      <Link href="/" className="relative mb-10">
        <Wordmark />
      </Link>

      <div className="panel relative w-full max-w-[420px] p-8 text-center">
        <h1 className="text-[21px] font-semibold tracking-tight text-white">
          Something went wrong on our side.
        </h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-white/45">
          This is not your fault and nothing you did caused it. Try again, and if it keeps
          happening the reference below tells us exactly what broke.
        </p>

        {error.digest ? (
          <p className="mt-5 rounded-[6px] border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-mono text-[11.5px] text-white/40">
            {error.digest}
          </p>
        ) : null}

        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Button onClick={reset}>
            <RefreshCw className="size-4" />
            Try again
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Back to the start</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
