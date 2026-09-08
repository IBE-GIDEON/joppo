import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
