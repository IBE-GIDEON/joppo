import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
// Imported rather than referenced as "/showcase.png" so Next derives the
// dimensions at build time and generates the blur placeholder.
import showcase from '../../../public/showcase.png';

export function Hero({ counts }: { counts: { total: number; companies: number } }) {
  return (
    <section className="relative overflow-hidden px-5 pb-16 pt-32 md:pt-40 lg:pt-44">
      {/* bloom */}
      <div className="bloom left-1/2 top-[-14rem] h-[34rem] w-[52rem] -translate-x-1/2 bg-iris-600/45" />
      <div className="bloom left-1/2 top-[-6rem] h-[20rem] w-[30rem] -translate-x-1/2 bg-iris-400/25" />

      <div className="relative mx-auto max-w-4xl text-center">
        <p className="eyebrow animate-fade-up">The hidden opportunity market</p>

        <h1 className="h-display mt-5 animate-fade-up [animation-delay:60ms]">
          Find what the job boards
          <br className="hidden sm:block" /> never list.
        </h1>

        <p className="lede mt-6 animate-fade-up [animation-delay:120ms]">
          Joppo reads company career pages, funding portals and partner pages directly.
          Jobs, grants, partnerships, investment calls and contracts, linked straight to
          the source. No recruiters, no reposts, no dead listings.
        </p>

        <div className="mt-9 flex animate-fade-up flex-col items-center justify-center gap-3 [animation-delay:180ms] sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/login?intent=start">
              Find my opportunities <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
            <a href="#categories">See what we cover</a>
          </Button>
        </div>

        <p className="mt-5 animate-fade-up text-[12.5px] text-white/30 [animation-delay:220ms]">
          <Sparkles className="mr-1 inline size-3 text-iris-300/70" />
          {counts.total.toLocaleString()} live opportunities from{' '}
          {counts.companies.toLocaleString()} organisations
        </p>
      </div>

      <div className="relative mx-auto mt-14 max-w-5xl animate-fade-up [animation-delay:260ms]">
        <div className="bloom left-1/2 top-6 h-[22rem] w-[42rem] -translate-x-1/2 bg-iris-600/30" />
        {/* The screenshot carries its own window chrome, so it is not framed again here. */}
        <Image
          src={showcase}
          alt="The Joppo search screen listing contract roles at Stripe, Databricks and Samsara, each linking straight to the employer's own posting"
          priority
          placeholder="blur"
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="relative w-full rounded-[10px] border border-white/[0.07] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.95)]"
        />
      </div>
    </section>
  );
}
