/**
 * Adapters for the applicant tracking systems that companies host their own
 * career pages on. Every endpoint below is the public board API that the
 * company's own careers page calls from the browser. No key, no scraping of
 * rendered HTML, and the apply URL we store is the company's own.
 */
import {
  fetchJson,
  cleanDescription,
  inferArrangement,
  inferEmploymentType,
  inferSeniority,
  inferSalary,
  companySlugFor,
  safeDate,
  dedupeTags,
  type Adapter,
  type RawListing,
} from '../core';

// ------------------------------------------------------------------ greenhouse

interface GhJob {
  id: number;
  title: string;
  updated_at: string;
  absolute_url: string;
  content?: string;
  location?: { name?: string };
  departments?: { name?: string }[];
  offices?: { name?: string }[];
  metadata?: { name?: string; value?: unknown }[];
}

export const greenhouse: Adapter = async ({ token, label, category }) => {
  const data = await fetchJson<{ jobs?: GhJob[] }>(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`,
  );

  const name = label || token;
  return (data.jobs ?? []).map((job): RawListing => {
    const location = job.location?.name ?? '';
    const description = cleanDescription(decodeEntities(job.content ?? ''));
    const blob = `${job.title} ${location} ${description.slice(0, 1200)}`;
    const { remote, workArrangement } = inferArrangement(blob);
    const salary = inferSalary(description.slice(0, 3000));

    return {
      externalId: String(job.id),
      source: 'greenhouse',
      category,
      title: job.title,
      description,
      applyUrl: job.absolute_url,
      companyName: name,
      companySlug: companySlugFor(name, token),
      locations: location ? [location] : [],
      remote,
      workArrangement,
      employmentType: inferEmploymentType(job.title, description.slice(0, 600)),
      seniority: inferSeniority(job.title),
      tags: dedupeTags((job.departments ?? []).map((d) => d.name)),
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency,
      postedAt: safeDate(job.updated_at),
    };
  });
};

// ------------------------------------------------------------------ lever

interface LeverPost {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  createdAt?: number;
  descriptionPlain?: string;
  categories?: { commitment?: string; location?: string; team?: string; department?: string };
  workplaceType?: string;
}

export const lever: Adapter = async ({ token, label, category }) => {
  const data = await fetchJson<LeverPost[]>(
    `https://api.lever.co/v0/postings/${encodeURIComponent(token)}?mode=json`,
  );

  const name = label || token;
  return (Array.isArray(data) ? data : []).map((job): RawListing => {
    const location = job.categories?.location ?? '';
    const description = cleanDescription(job.descriptionPlain ?? '');
    const blob = `${job.text} ${location} ${job.workplaceType ?? ''} ${description.slice(0, 1200)}`;
    const explicitRemote = job.workplaceType?.toLowerCase() === 'remote' ? true : undefined;
    const { remote, workArrangement } = inferArrangement(blob, explicitRemote);
    const salary = inferSalary(description.slice(0, 3000));

    return {
      externalId: job.id,
      source: 'lever',
      category,
      title: job.text,
      description,
      applyUrl: job.applyUrl || job.hostedUrl,
      companyName: name,
      companySlug: companySlugFor(name, token),
      locations: location ? [location] : [],
      remote,
      workArrangement,
      employmentType: inferEmploymentType(job.categories?.commitment, job.text),
      seniority: inferSeniority(job.text),
      tags: dedupeTags([job.categories?.team, job.categories?.department]),
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency,
      postedAt: safeDate(job.createdAt),
    };
  });
};

// ------------------------------------------------------------------ ashby

interface AshbyJob {
  id: string;
  title: string;
  location?: string;
  secondaryLocations?: { location?: string }[];
  department?: string;
  team?: string;
  employmentType?: string;
  isRemote?: boolean;
  publishedAt?: string;
  jobUrl?: string;
  applyUrl?: string;
  descriptionPlain?: string;
  compensation?: {
    compensationTierSummary?: string;
    summaryComponents?: { minValue?: number; maxValue?: number; currencyCode?: string }[];
  };
}

export const ashby: Adapter = async ({ token, label, category }) => {
  const data = await fetchJson<{ jobs?: AshbyJob[] }>(
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(token)}?includeCompensation=true`,
  );

  const name = label || token;
  return (data.jobs ?? []).map((job): RawListing => {
    const locations = [job.location, ...(job.secondaryLocations ?? []).map((l) => l.location)]
      .filter((v): v is string => Boolean(v));
    const description = cleanDescription(job.descriptionPlain ?? '');
    const { remote, workArrangement } = inferArrangement(
      `${job.title} ${locations.join(' ')} ${description.slice(0, 800)}`,
      job.isRemote,
    );

    const comp = job.compensation?.summaryComponents?.[0];
    const fallbackSalary = inferSalary(job.compensation?.compensationTierSummary ?? '');

    return {
      externalId: job.id,
      source: 'ashby',
      category,
      title: job.title,
      description,
      applyUrl: job.applyUrl || job.jobUrl || '',
      companyName: name,
      companySlug: companySlugFor(name, token),
      locations,
      remote,
      workArrangement,
      employmentType: inferEmploymentType(job.employmentType, job.title),
      seniority: inferSeniority(job.title),
      tags: dedupeTags([job.department, job.team]),
      salaryMin: comp?.minValue ?? fallbackSalary.min,
      salaryMax: comp?.maxValue ?? fallbackSalary.max,
      salaryCurrency: comp?.currencyCode ?? fallbackSalary.currency,
      postedAt: safeDate(job.publishedAt),
    };
  });
};

// ------------------------------------------------------------------ workable

interface WorkableJob {
  id?: string;
  shortcode: string;
  title: string;
  city?: string;
  state?: string;
  country?: string;
  telecommuting?: boolean;
  employment_type?: string;
  department?: string;
  published_on?: string;
  url?: string;
  application_url?: string;
  description?: string;
  requirements?: string;
}

export const workable: Adapter = async ({ token, label, category }) => {
  const data = await fetchJson<{ name?: string; jobs?: WorkableJob[] }>(
    `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(token)}?details=true`,
  );

  const name = label || data.name || token;
  return (data.jobs ?? []).map((job): RawListing => {
    const location = [job.city, job.state, job.country].filter(Boolean).join(', ');
    const description = cleanDescription(`${job.description ?? ''} ${job.requirements ?? ''}`);
    const { remote, workArrangement } = inferArrangement(
      `${job.title} ${location} ${description.slice(0, 800)}`,
      job.telecommuting,
    );
    const salary = inferSalary(description.slice(0, 3000));

    return {
      externalId: job.shortcode || String(job.id),
      source: 'workable',
      category,
      title: job.title,
      description,
      applyUrl: job.application_url || job.url || '',
      companyName: name,
      companySlug: companySlugFor(name, token),
      locations: location ? [location] : [],
      remote,
      workArrangement,
      employmentType: inferEmploymentType(job.employment_type, job.title),
      seniority: inferSeniority(job.title),
      tags: dedupeTags([job.department]),
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency,
      postedAt: safeDate(job.published_on),
    };
  });
};

// ------------------------------------------------------------------ smartrecruiters

interface SrPosting {
  id: string;
  name: string;
  releasedDate?: string;
  location?: { city?: string; region?: string; country?: string; remote?: boolean };
  typeOfEmployment?: { label?: string };
  department?: { label?: string };
  function?: { label?: string };
  company?: { identifier?: string; name?: string };
  ref?: string;
}

export const smartrecruiters: Adapter = async ({ token, label, category }) => {
  const data = await fetchJson<{ content?: SrPosting[] }>(
    `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(token)}/postings?limit=100`,
  );

  const name = label || token;
  return (data.content ?? []).map((job): RawListing => {
    const location = [job.location?.city, job.location?.region, job.location?.country]
      .filter(Boolean)
      .join(', ');
    const { remote, workArrangement } = inferArrangement(
      `${job.name} ${location}`,
      job.location?.remote,
    );

    return {
      externalId: job.id,
      source: 'smartrecruiters',
      category,
      title: job.name,
      description: '',
      applyUrl: `https://jobs.smartrecruiters.com/${encodeURIComponent(token)}/${job.id}`,
      companyName: job.company?.name || name,
      companySlug: companySlugFor(job.company?.name || name, token),
      locations: location ? [location] : [],
      remote,
      workArrangement,
      employmentType: inferEmploymentType(job.typeOfEmployment?.label, job.name),
      seniority: inferSeniority(job.name),
      tags: dedupeTags([job.department?.label, job.function?.label]),
      postedAt: safeDate(job.releasedDate),
    };
  });
};

// ------------------------------------------------------------------ recruitee

interface RecruiteeOffer {
  id: number;
  title: string;
  slug?: string;
  careers_url?: string;
  careers_apply_url?: string;
  location?: string;
  city?: string;
  country?: string;
  employment_type_code?: string;
  department?: string;
  published_at?: string;
  description?: string;
  requirements?: string;
  remote?: boolean;
  tags?: string[];
}

export const recruitee: Adapter = async ({ token, label, category }) => {
  const data = await fetchJson<{ offers?: RecruiteeOffer[] }>(
    `https://${encodeURIComponent(token)}.recruitee.com/api/offers/`,
  );

  const name = label || token;
  return (data.offers ?? []).map((job): RawListing => {
    const location = job.location || [job.city, job.country].filter(Boolean).join(', ');
    const description = cleanDescription(`${job.description ?? ''} ${job.requirements ?? ''}`);
    const { remote, workArrangement } = inferArrangement(
      `${job.title} ${location} ${description.slice(0, 800)}`,
      job.remote,
    );

    return {
      externalId: String(job.id),
      source: 'recruitee',
      category,
      title: job.title,
      description,
      applyUrl:
        job.careers_apply_url ||
        job.careers_url ||
        `https://${token}.recruitee.com/o/${job.slug ?? job.id}`,
      companyName: name,
      companySlug: companySlugFor(name, token),
      locations: location ? [location] : [],
      remote,
      workArrangement,
      employmentType: inferEmploymentType(job.employment_type_code, job.title),
      seniority: inferSeniority(job.title),
      tags: dedupeTags([job.department, ...(job.tags ?? [])]),
      postedAt: safeDate(job.published_at),
    };
  });
};

// ------------------------------------------------------------------ helpers

/** Greenhouse returns HTML-escaped content. */
function decodeEntities(input: string): string {
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}
