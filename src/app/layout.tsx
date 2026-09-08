import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

/**
 * Where the site lives, for absolute URLs in metadata.
 *
 * Every candidate is tried in turn and anything unparseable is skipped, because
 * a build must never die on a malformed environment variable. Vercel supplies
 * these as empty strings rather than leaving them undefined, which defeats the
 * usual `??` fallback.
 */
function siteUrl(): URL {
  const candidates = [
    process.env.NEXTAUTH_URL?.trim(),
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    'http://localhost:3100',
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return new URL(candidate);
    } catch {
      // Malformed value; fall through to the next candidate.
    }
  }
  return new URL('http://localhost:3100');
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: 'Joppo — Opportunities the job boards never show you',
    template: '%s · Joppo',
  },
  description:
    'Joppo reads company career pages, funding portals and partner pages directly. Jobs, grants, partnerships, investment calls and freelance contracts, all in one place, linked straight to the source.',
  openGraph: {
    title: 'Joppo — Opportunities the job boards never show you',
    description:
      'Jobs, grants, partnerships, investment calls and contracts, pulled straight from the source.',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: '#07070B',
  width: 'device-width',
  initialScale: 1,
};

/**
 * No SessionProvider here on purpose. Nothing in the app calls useSession, and
 * wrapping the root layout in it pulled next-auth/react into the static render
 * of the landing and not-found pages, where its module-level URL parsing
 * crashed the build. signIn and signOut work without a provider.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
