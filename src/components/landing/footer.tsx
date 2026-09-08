import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Wordmark } from '@/components/landing/wordmark';

export function ClosingCta() {
  return (
    <section className="relative overflow-hidden border-t border-white/[0.06] px-5 pb-16 pt-28">
      <div className="bloom left-1/2 top-0 h-64 w-[44rem] -translate-x-1/2 bg-iris-600/35" />
      <div className="relative mx-auto max-w-2xl text-center">
        <h2 className="h-section">Stop competing with everyone.</h2>
        <p className="lede mt-4">
          The opportunities worth having were never on the boards. Three dollars gets
          you a week of looking where nobody else is.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/login?intent=start">
              Get started <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
            <a href="#pricing">See pricing</a>
          </Button>
        </div>
        <p className="mt-4 text-[12px] text-white/25">
          From $3. Cancel any time. No auto-renew trap.
        </p>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden px-5 pb-0 pt-14">
      <div className="mx-auto max-w-5xl">
        <div className="rule" />
        <div className="flex flex-col items-center justify-between gap-6 py-8 sm:flex-row">
          <Wordmark />
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {[
              { href: '#pricing', label: 'Pricing' },
              { href: '#faq', label: 'FAQ' },
              { href: '/terms', label: 'Terms' },
              { href: '/privacy', label: 'Privacy' },
              { href: '/refunds', label: 'Refunds' },
              { href: '/login', label: 'Sign in' },
            ].map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-[13px] text-white/35 transition-colors hover:text-white/75"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <p className="text-[12px] text-white/25">
            &copy; {new Date().getFullYear()} Joppo
          </p>
        </div>

        {/* oversized watermark, clipped by the viewport edge */}
        <div
          aria-hidden
          className="pointer-events-none select-none overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.95), transparent 92%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.95), transparent 92%)',
          }}
        >
          <p className="translate-y-[18%] text-center font-semibold tracking-tightest text-white/[0.13] [font-size:clamp(5rem,20vw,15rem)] [line-height:1]">
            joppo
          </p>
        </div>
      </div>
    </footer>
  );
}
