import type { Category } from '../lib/types';

export interface SourceSeed {
  kind: string;
  token: string;
  label?: string;
  category: Category;
}

/**
 * The starting crawl list. Every entry below was checked against its live
 * endpoint. Add to it freely: `npm run seed` upserts, it never duplicates.
 *
 * Adding a company is one line. Find its board token in the URL of its own
 * careers page, for example boards.greenhouse.io/<token> or
 * jobs.ashbyhq.com/<token>.
 */
export const SOURCE_SEEDS: SourceSeed[] = [
  // ---------------------------------------------------------- greenhouse
  ...[
    ['stripe', 'Stripe'],
    ['figma', 'Figma'],
    ['databricks', 'Databricks'],
    ['coinbase', 'Coinbase'],
    ['dropbox', 'Dropbox'],
    ['reddit', 'Reddit'],
    ['cloudflare', 'Cloudflare'],
    ['discord', 'Discord'],
    ['brex', 'Brex'],
    ['asana', 'Asana'],
    ['samsara', 'Samsara'],
    ['affirm', 'Affirm'],
    ['airtable', 'Airtable'],
    ['anthropic', 'Anthropic'],
    ['instacart', 'Instacart'],
    ['robinhood', 'Robinhood'],
    ['duolingo', 'Duolingo'],
    ['wise', 'Wise'],
    ['gusto', 'Gusto'],
    ['flexport', 'Flexport'],
    ['lyft', 'Lyft'],
  ].map(([token, label]) => ({ kind: 'greenhouse', token, label, category: 'JOB' as Category })),

  // ---------------------------------------------------------- lever
  ...[
    ['spotify', 'Spotify'],
    ['palantir', 'Palantir'],
    ['matchgroup', 'Match Group'],
    ['shieldai', 'Shield AI'],
  ].map(([token, label]) => ({ kind: 'lever', token, label, category: 'JOB' as Category })),

  // ---------------------------------------------------------- ashby
  ...[
    ['openai', 'OpenAI'],
    ['ramp', 'Ramp'],
    ['linear', 'Linear'],
    ['vanta', 'Vanta'],
    ['posthog', 'PostHog'],
    ['supabase', 'Supabase'],
    ['replit', 'Replit'],
    ['cursor', 'Cursor'],
  ].map(([token, label]) => ({ kind: 'ashby', token, label, category: 'JOB' as Category })),

  // ---------------------------------------------------------- smartrecruiters
  { kind: 'smartrecruiters', token: 'BoschGroup', label: 'Bosch', category: 'JOB' },

  // ---------------------------------------------------------- grants and tenders
  // "*" pulls every currently posted opportunity rather than filtering by keyword.
  { kind: 'grantsgov', token: '*', label: 'Grants.gov', category: 'GRANT' },

  // ---------------------------------------------------------- partnerships / investment
  // No public API exists for these yet, so they load from a local file.
  // Replace or extend src/scrapers/data/*.json, or add a `jsonld` source
  // pointing at a page that publishes schema.org markup.
  { kind: 'curated', token: 'partnerships.json', label: 'Partner programmes', category: 'PARTNERSHIP' },
  { kind: 'curated', token: 'investment.json', label: 'Investment calls', category: 'INVESTMENT' },
];
