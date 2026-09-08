import { stripHtml, slugify } from '../lib/utils';
import type { Category } from '../lib/types';

/** What every adapter must produce. The runner handles persistence. */
export interface RawListing {
  externalId: string;
  source: string;
  category: Category;
  title: string;
  description: string;
  applyUrl: string;

  companyName?: string | null;
  companySlug?: string | null;
  companyLogo?: string | null;
  companyDomain?: string | null;
  industry?: string | null;

  locations?: string[];
  remote?: boolean;
  workArrangement?: string | null;
  employmentType?: string | null;
  seniority?: string | null;
  tags?: string[];

  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;

  amountMin?: number | null;
  amountMax?: number | null;
  amountCurrency?: string | null;
  deadline?: Date | null;
  funder?: string | null;

  postedAt?: Date | null;
}

export interface AdapterContext {
  token: string;
  label?: string | null;
  category: Category;
}

export type Adapter = (ctx: AdapterContext) => Promise<RawListing[]>;

const UA = process.env.INGEST_USER_AGENT || 'JoppoBot/0.1 (+https://joppo.app/bot)';

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Fetch with a timeout, a real user agent and one retry on 5xx or network error. */
export async function fetchJson<T = unknown>(
  url: string,
  init: RequestInit = {},
  attempt = 0,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'application/json, text/plain, */*',
        ...(init.headers as Record<string, string> | undefined),
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      if (res.status >= 500 && attempt < 1) {
        await sleep(900);
        return fetchJson<T>(url, init, attempt + 1);
      }
      throw new HttpError(`${res.status} ${res.statusText} for ${url}`, res.status);
    }

    return (await res.json()) as T;
  } catch (err) {
    if (attempt < 1 && !(err instanceof HttpError)) {
      await sleep(900);
      return fetchJson<T>(url, init, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      cache: 'no-store',
    });
    if (!res.ok) throw new HttpError(`${res.status} for ${url}`, res.status);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Read a positive integer from the environment.
 *
 * Hosting platforms hand over a variable that exists but has no value as an
 * empty string rather than leaving it undefined, and `'' ?? fallback` keeps the
 * empty string, which `Number()` then turns into 0. That silently reduced the
 * crawler's worker count to zero: no work done, no error raised.
 */
export function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt((value ?? '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Run tasks with a bounded number in flight. */
export async function pool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

// ------------------------------------------------------------------ inference

const REMOTE_RE =
  /\b(remote|work from home|wfh|distributed|anywhere|telecommut\w*|home[- ]based)\b/i;
const HYBRID_RE = /\bhybrid\b/i;
const ONSITE_RE = /\b(on[- ]?site|in[- ]office|in person)\b/i;

export function inferArrangement(
  text: string,
  explicitRemote?: boolean,
): { remote: boolean; workArrangement: string } {
  if (explicitRemote === true) return { remote: true, workArrangement: 'Remote' };
  if (HYBRID_RE.test(text)) return { remote: false, workArrangement: 'Hybrid' };
  if (REMOTE_RE.test(text)) return { remote: true, workArrangement: 'Remote' };
  if (ONSITE_RE.test(text)) return { remote: false, workArrangement: 'On-site' };
  return { remote: false, workArrangement: 'On-site' };
}

const SENIOR_RE = /\b(senior|sr\.?|lead|principal|staff|head of|director|vp|chief)\b/i;
const MID_RE = /\b(mid[- ]level|ii|iii|specialist|manager)\b/i;
const JUNIOR_RE = /\b(junior|jr\.?|graduate|entry[- ]level|intern|trainee|apprentice|associate)\b/i;
const EXEC_RE = /\b(chief|c[teofi]o|vp of|vice president|head of department|partner)\b/i;

export function inferSeniority(title: string): string | null {
  if (EXEC_RE.test(title)) return '10+';
  if (SENIOR_RE.test(title)) return '5-10';
  if (JUNIOR_RE.test(title)) return '0-2';
  if (MID_RE.test(title)) return '2-5';
  return null;
}

const TYPE_MAP: [RegExp, string][] = [
  [/\b(full[- ]?time|permanent|regular|fulltime)\b/i, 'FULL_TIME'],
  [/\b(part[- ]?time|parttime)\b/i, 'PART_TIME'],
  [/\b(contract|contractor|freelance|consult\w*|temp to perm|b2b)\b/i, 'CONTRACT'],
  [/\b(intern|internship|placement|co[- ]op)\b/i, 'INTERNSHIP'],
  [/\b(temporary|seasonal|fixed[- ]term|maternity cover|locum)\b/i, 'TEMPORARY'],
];

export function inferEmploymentType(...sources: (string | null | undefined)[]): string | null {
  const text = sources.filter(Boolean).join(' ');
  for (const [re, value] of TYPE_MAP) if (re.test(text)) return value;
  return null;
}

/** Pull a rough salary range out of free text. Conservative on purpose. */
export function inferSalary(text: string): {
  min: number | null;
  max: number | null;
  currency: string | null;
} {
  const m = text.match(
    /([$€£])\s?(\d{2,3}(?:[,.]\d{3})+|\d{2,3}k)\s*(?:-|–|to)\s*([$€£])?\s?(\d{2,3}(?:[,.]\d{3})+|\d{2,3}k)/i,
  );
  if (!m) return { min: null, max: null, currency: null };

  const cur = m[1] === '€' ? 'EUR' : m[1] === '£' ? 'GBP' : 'USD';
  const parse = (v: string) =>
    /k$/i.test(v) ? parseInt(v, 10) * 1000 : parseInt(v.replace(/[,.]/g, ''), 10);

  const min = parse(m[2]);
  const max = parse(m[4]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 1000 || max < min) {
    return { min: null, max: null, currency: null };
  }
  return { min, max, currency: cur };
}

export function cleanDescription(input: string | null | undefined, limit = 6000): string {
  if (!input) return '';
  const text = /<[a-z][\s\S]*>/i.test(input) ? stripHtml(input) : input.replace(/\s+/g, ' ').trim();
  return text.slice(0, limit);
}

export function companySlugFor(name: string, fallback: string): string {
  return slugify(name) || slugify(fallback) || 'unknown';
}

export function safeDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dedupeTags(tags: (string | null | undefined)[], limit = 18): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const t = (raw ?? '').trim();
    if (!t || t.length > 40) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}
