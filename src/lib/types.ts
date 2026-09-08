export const CATEGORIES = ['JOB', 'GRANT', 'PARTNERSHIP', 'INVESTMENT', 'CONTRACT'] as const;
export type Category = (typeof CATEGORIES)[number];

/**
 * Categories carry no colour of their own. Colour is reserved for state the
 * user controls, which means one accent for what is selected and nothing else.
 * A category reads as a small label, not as a coloured badge.
 */
export const CATEGORY_META: Record<Category, { label: string; short: string; blurb: string }> = {
  JOB: {
    label: 'Jobs',
    short: 'Jobs',
    blurb: 'Roles posted on company career pages, not on the big boards.',
  },
  GRANT: {
    label: 'Grants & tenders',
    short: 'Grants',
    blurb: 'Public funding calls, tenders and requests for proposals.',
  },
  PARTNERSHIP: {
    label: 'Partnerships',
    short: 'Partners',
    blurb: 'Reseller, distributor, affiliate and channel openings.',
  },
  INVESTMENT: {
    label: 'Investment',
    short: 'Investment',
    blurb: 'Accelerators, pitch competitions and open investor calls.',
  },
  CONTRACT: {
    label: 'Contracts',
    short: 'Contracts',
    blurb: 'Freelance briefs, RFQs and one-off paid project work.',
  },
};

export const EMPLOYMENT_TYPES = [
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'TEMPORARY', label: 'Temporary' },
];

export const SENIORITY = [
  { value: '0-2', label: '0–2 years' },
  { value: '2-5', label: '2–5 years' },
  { value: '5-10', label: '5–10 years' },
  { value: '10+', label: '10+ years' },
];

export const WORK_ARRANGEMENTS = [
  { value: 'Remote', label: 'Remote' },
  { value: 'Hybrid', label: 'Hybrid' },
  { value: 'On-site', label: 'On-site' },
];

export const DATE_POSTED = [
  { value: '1', label: 'Last 24 hours' },
  { value: '3', label: 'Last 3 days' },
  { value: '7', label: 'Last week' },
  { value: '30', label: 'Last month' },
];

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}
