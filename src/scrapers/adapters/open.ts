/**
 * Adapters for sources that are not applicant tracking systems.
 *
 * grantsgov  live public API, no key, covers US federal funding calls and tenders
 * jsonld     generic: reads schema.org JobPosting blocks off any career page,
 *            which is how most self-hosted career pages expose their listings
 * curated    reads a local JSON file, for categories with no public API yet
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  fetchJson,
  fetchText,
  cleanDescription,
  inferArrangement,
  inferEmploymentType,
  inferSeniority,
  companySlugFor,
  safeDate,
  dedupeTags,
  type Adapter,
  type RawListing,
} from '../core';
import { isCategory, type Category } from '../../lib/types';

// ------------------------------------------------------------------ grants.gov

interface GrantHit {
  id: string;
  number?: string;
  title: string;
  agencyCode?: string;
  agency?: string;
  openDate?: string;
  closeDate?: string;
  oppStatus?: string;
  docType?: string;
  cfdaList?: string[];
}

/** US date strings come back as MM/DD/YYYY. */
function usDate(value?: string): Date | null {
  if (!value) return null;
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return safeDate(value);
  return safeDate(`${m[3]}-${m[1]}-${m[2]}T00:00:00Z`);
}

export const grantsgov: Adapter = async ({ token, category }) => {
  // token is used as the keyword filter; an empty token pulls everything posted.
  const rows = 200;
  const out: RawListing[] = [];

  for (let start = 0; start < 600; start += rows) {
    const body = await fetchJson<{ data?: { oppHits?: GrantHit[]; hitCount?: number } }>(
      'https://api.grants.gov/v1/api/search2',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows,
          startRecordNum: start,
          keyword: token === '*' ? '' : token,
          oppStatuses: 'posted',
        }),
      },
    );

    const hits = body.data?.oppHits ?? [];
    if (hits.length === 0) break;

    for (const hit of hits) {
      const agency = hit.agency || hit.agencyCode || 'US Federal Government';
      out.push({
        externalId: hit.id,
        source: 'grantsgov',
        category,
        title: hit.title,
        description: [
          hit.number ? `Opportunity number ${hit.number}.` : '',
          `Issued by ${agency}.`,
          hit.cfdaList?.length ? `CFDA ${hit.cfdaList.join(', ')}.` : '',
          hit.closeDate ? `Closes ${hit.closeDate}.` : '',
        ]
          .filter(Boolean)
          .join(' '),
        applyUrl: `https://www.grants.gov/search-results-detail/${hit.id}`,
        companyName: agency,
        companySlug: companySlugFor(agency, hit.agencyCode || 'gov'),
        locations: ['United States'],
        remote: false,
        workArrangement: null,
        employmentType: null,
        seniority: null,
        tags: dedupeTags([hit.docType, ...(hit.cfdaList ?? [])]),
        funder: agency,
        deadline: usDate(hit.closeDate),
        postedAt: usDate(hit.openDate),
      });
    }

    const total = body.data?.hitCount ?? 0;
    if (start + rows >= total) break;
  }

  return out;
};

// ------------------------------------------------------------------ json-ld

interface JobPostingLd {
  '@type'?: string | string[];
  identifier?: unknown;
  title?: string;
  description?: string;
  datePosted?: string;
  validThrough?: string;
  employmentType?: string | string[];
  hiringOrganization?: { name?: string; logo?: unknown; sameAs?: string };
  jobLocation?: unknown;
  applicantLocationRequirements?: unknown;
  jobLocationType?: string;
  baseSalary?: {
    currency?: string;
    value?: { minValue?: number; maxValue?: number; value?: number };
  };
  url?: string;
  skills?: string | string[];
  industry?: string;
}

function collectLdNodes(raw: unknown, acc: JobPostingLd[] = []): JobPostingLd[] {
  if (!raw) return acc;
  if (Array.isArray(raw)) {
    for (const item of raw) collectLdNodes(item, acc);
    return acc;
  }
  if (typeof raw === 'object') {
    const node = raw as Record<string, unknown>;
    const type = node['@type'];
    const types = Array.isArray(type) ? type : [type];
    if (types.includes('JobPosting')) acc.push(node as JobPostingLd);
    if (node['@graph']) collectLdNodes(node['@graph'], acc);
    if (node.itemListElement) collectLdNodes(node.itemListElement, acc);
    if (node.item) collectLdNodes(node.item, acc);
  }
  return acc;
}

function ldLocations(node: JobPostingLd): string[] {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (!value) return;
    if (Array.isArray(value)) return value.forEach(walk);
    if (typeof value === 'string') return void out.push(value);
    if (typeof value === 'object') {
      const v = value as Record<string, any>;
      if (v.address) return walk(v.address);
      const parts = [v.addressLocality, v.addressRegion, v.addressCountry]
        .map((p) => (typeof p === 'object' && p ? p.name : p))
        .filter((p): p is string => typeof p === 'string');
      if (parts.length) out.push(parts.join(', '));
      else if (typeof v.name === 'string') out.push(v.name);
    }
  };
  walk(node.jobLocation);
  walk(node.applicantLocationRequirements);
  return dedupeTags(out, 5);
}

/**
 * Reads schema.org JobPosting markup off a page. Works on the listing page of
 * most self-hosted career sites and on individual posting pages.
 */
export const jsonld: Adapter = async ({ token, label, category }) => {
  const html = await fetchText(token);
  const pattern = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;

  const nodes: JobPostingLd[] = [];
  let block: RegExpExecArray | null;
  while ((block = pattern.exec(html)) !== null) {
    try {
      nodes.push(...collectLdNodes(JSON.parse(block[1].trim())));
    } catch {
      // A malformed block on one page should not abort the whole source.
    }
  }

  const origin = new URL(token).origin;

  return nodes
    .filter((n) => n.title)
    .map((n, i): RawListing => {
      const org = n.hiringOrganization?.name || label || new URL(token).hostname;
      const locations = ldLocations(n);
      const description = cleanDescription(n.description ?? '');
      const explicitRemote = /TELECOMMUTE/i.test(n.jobLocationType ?? '') || undefined;
      const { remote, workArrangement } = inferArrangement(
        `${n.title} ${locations.join(' ')} ${description.slice(0, 800)}`,
        explicitRemote,
      );
      const salaryValue = n.baseSalary?.value;

      const identifier =
        (typeof n.identifier === 'string' && n.identifier) ||
        (typeof n.identifier === 'object' && n.identifier
          ? String((n.identifier as Record<string, unknown>).value ?? '')
          : '') ||
        n.url ||
        `${token}#${i}`;

      const employmentType = Array.isArray(n.employmentType)
        ? n.employmentType.join(' ')
        : n.employmentType;

      return {
        externalId: identifier.slice(0, 180),
        source: 'jsonld',
        category,
        title: String(n.title),
        description,
        applyUrl: n.url ? new URL(n.url, origin).toString() : token,
        companyName: org,
        companySlug: companySlugFor(org, new URL(token).hostname),
        industry: n.industry ?? null,
        locations,
        remote,
        workArrangement,
        employmentType: inferEmploymentType(employmentType, String(n.title)),
        seniority: inferSeniority(String(n.title)),
        tags: dedupeTags(
          Array.isArray(n.skills) ? n.skills : typeof n.skills === 'string' ? n.skills.split(',') : [],
        ),
        salaryMin: salaryValue?.minValue ?? null,
        salaryMax: salaryValue?.maxValue ?? salaryValue?.value ?? null,
        salaryCurrency: n.baseSalary?.currency ?? null,
        deadline: safeDate(n.validThrough),
        postedAt: safeDate(n.datePosted),
      };
    });
};

// ------------------------------------------------------------------ curated

export interface CuratedRecord {
  externalId: string;
  category: string;
  title: string;
  organisation: string;
  description: string;
  url: string;
  locations?: string[];
  remote?: boolean;
  tags?: string[];
  amountMin?: number;
  amountMax?: number;
  amountCurrency?: string;
  deadline?: string;
  postedAt?: string;
}

/**
 * Partnership and investment calls have no equivalent of an ATS API. Until a
 * per-source crawler exists for them, they are loaded from a checked-in file
 * so the categories are populated and the shape is settled.
 * token is the filename inside src/scrapers/data.
 */
export const curated: Adapter = async ({ token }) => {
  const file = path.join(process.cwd(), 'src', 'scrapers', 'data', token);
  if (!fs.existsSync(file)) return [];

  const records = JSON.parse(fs.readFileSync(file, 'utf8')) as CuratedRecord[];

  return records
    .filter((r) => isCategory(r.category))
    .map((r): RawListing => ({
      externalId: r.externalId,
      source: 'curated',
      category: r.category as Category,
      title: r.title,
      description: r.description,
      applyUrl: r.url,
      companyName: r.organisation,
      companySlug: companySlugFor(r.organisation, r.externalId),
      locations: r.locations ?? [],
      remote: r.remote ?? false,
      workArrangement: r.remote ? 'Remote' : null,
      employmentType: null,
      seniority: null,
      tags: dedupeTags(r.tags ?? []),
      amountMin: r.amountMin ?? null,
      amountMax: r.amountMax ?? null,
      amountCurrency: r.amountCurrency ?? null,
      funder: r.organisation,
      deadline: safeDate(r.deadline),
      postedAt: safeDate(r.postedAt) ?? new Date(),
    }));
};
