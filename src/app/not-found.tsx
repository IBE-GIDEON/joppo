import Link from 'next/link';
import { Wordmark } from '@/components/landing/wordmark';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-5 py-16">
      <div className="bloom left-1/2 top-[-10rem] h-[26rem] w-[38rem] -translate-x-1/2 bg-iris-600/25" />

      <Link href="/" className="relative mb-10">
        <Wordmark />
      </Link>

      <div className="panel relative w-full max-w-[420px] p-8 text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-3 text-[21px] font-semibold tracking-tight text-white">
          There is nothing here.
        </h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-white/45">
          The page you were after has moved or never existed. A listing you followed may
          also have been taken down by the organisation that posted it.
        </p>

        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/search">Search opportunities</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
