import type { MetadataRoute } from 'next';
import { LEGAL } from '@/lib/legal';

/** Only the pages a search engine should actually hold. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXTAUTH_URL?.trim() || LEGAL.siteUrl;
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/refunds`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
