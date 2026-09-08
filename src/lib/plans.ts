export type PlanId = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Plan {
  id: PlanId;
  name: string;
  price: number; // major units
  currency: string;
  cadence: string;
  days: number;
  tagline: string;
  badge?: string;
  /** Monthly search allowance. Mirrors PLAN_SEARCH_QUOTA in rate-limit.ts. */
  searches: number;
  perks: string[];
}

export const CURRENCY = process.env.PAYSTACK_CURRENCY || 'USD';

export const PLANS: Record<PlanId, Plan> = {
  WEEKLY: {
    id: 'WEEKLY',
    name: 'Week pass',
    price: 3,
    currency: 'USD',
    cadence: '/week',
    days: 7,
    tagline: 'For a short, hard push.',
    searches: 1_000,
    perks: [
      '1,000 searches',
      'Every listing, unblurred',
      'Apply links straight to the source',
      'All five categories',
      'One payment, no auto-renew',
    ],
  },
  MONTHLY: {
    id: 'MONTHLY',
    name: 'Monthly',
    price: 10,
    currency: 'USD',
    cadence: '/month',
    days: 30,
    badge: 'Most popular',
    tagline: 'The realistic length of a search.',
    searches: 5_000,
    perks: [
      '5,000 searches a month',
      'Everything in Week pass',
      'Save listings to a shortlist',
      'Saved searches you can re-run',
      'Catalogue refreshed every hour',
      'Dead listings removed automatically',
    ],
  },
  YEARLY: {
    id: 'YEARLY',
    name: 'Yearly',
    price: 40,
    currency: 'USD',
    cadence: '/year',
    days: 365,
    badge: 'Best value',
    tagline: 'Two-thirds off. Never think about it again.',
    searches: 20_000,
    perks: [
      '20,000 searches a month',
      'Everything in Monthly',
      'Under $3.34 a month',
      'Sort grants and tenders by closing date',
      'A full year at one price',
      'One payment, no auto-renew',
    ],
  },
};

export const PLAN_LIST: Plan[] = [PLANS.WEEKLY, PLANS.MONTHLY, PLANS.YEARLY];

export function planFrom(value: unknown): Plan | null {
  if (typeof value !== 'string') return null;
  const key = value.toUpperCase() as PlanId;
  return PLANS[key] ?? null;
}
