'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Wordmark } from '@/components/landing/wordmark';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '#categories', label: 'Categories' },
  { href: '#how', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          'mx-auto flex h-16 max-w-6xl items-center justify-between px-5 transition-all duration-300 md:px-6',
          scrolled &&
            'mt-3 h-14 max-w-4xl rounded-2xl border border-white/[0.07] bg-ink-900/70 backdrop-blur-2xl',
        )}
      >
        <Link href="/" className="flex items-center gap-2" aria-label="Joppo home">
          <Wordmark className="h-[18px] w-auto" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-[13px] text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white/90"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login?intent=start">Get started</Link>
          </Button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="ml-1 rounded-lg p-2 text-white/60 hover:bg-white/[0.06] md:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="mx-4 mt-2 rounded-2xl border border-white/[0.08] bg-ink-900/95 p-2 backdrop-blur-2xl md:hidden">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm text-white/60 hover:bg-white/[0.05] hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
