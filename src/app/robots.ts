import type { MetadataRoute } from 'next';
import { LEGAL } from '@/lib/legal';

/**
 * Crawlers get the marketing and policy pages only. Everything behind sign-in
 * is either personalised or paid, so indexing it would leak paid content into
 * search results and waste crawl budget on pages that always redirect.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXTAUTH_URL?.trim() || LEGAL.siteUrl;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/search', '/onboarding', '/unlock', '/login'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
