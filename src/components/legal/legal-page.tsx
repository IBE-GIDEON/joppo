import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Wordmark } from '@/components/landing/wordmark';
import { LEGAL } from '@/lib/legal';

/** Shared shell so the three policy pages read as one document set. */
export function LegalPage({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen px-5 pb-24 pt-10">
      <div className="bloom left-1/2 top-[-14rem] h-[24rem] w-[38rem] -translate-x-1/2 bg-iris-600/20" />

      <div className="relative mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Wordmark />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[12.5px] text-white/40 transition-colors hover:text-white/80"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </Link>
        </div>

        <header className="mt-14">
          <h1 className="text-[34px] font-semibold leading-tight tracking-tightest text-white">
            {title}
          </h1>
          <p className="mt-3 text-[14.5px] leading-relaxed text-white/50">{summary}</p>
          <p className="mt-5 text-[12px] text-white/30">Last updated {LEGAL.lastUpdated}</p>
        </header>

        <div className="rule mt-8" />

        <article className="prose-legal mt-10">{children}</article>

        <div className="rule mt-14" />

        <nav className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
          <Link href="/terms" className="text-white/40 transition-colors hover:text-white/80">
            Terms of Service
          </Link>
          <Link href="/privacy" className="text-white/40 transition-colors hover:text-white/80">
            Privacy Policy
          </Link>
          <Link href="/refunds" className="text-white/40 transition-colors hover:text-white/80">
            Refund Policy
          </Link>
        </nav>
      </div>
    </main>
  );
}

export function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-[17px] font-semibold tracking-tight text-white">
        <span className="mr-2.5 text-white/25">{n}.</span>
        {title}
      </h2>
      <div className="space-y-3.5 text-[14.5px] leading-[1.7] text-white/60">{children}</div>
    </section>
  );
}
