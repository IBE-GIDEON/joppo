import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { toList } from '@/lib/utils';
import { CATEGORIES, type Category } from '@/lib/types';
import { z } from 'zod';

export const searchSchema = z.object({
  q: z.string().trim().max(200).optional(),
  /**
   * Independent interests, matched with OR. The onboarding chips land here:
   * somebody who says "solar engineer" and "climate" wants either, not both.
   * The free-text `q` box above stays AND, which is what a search box should do.
   */
  anyKeywords: z.array(z.string().trim().min(1).max(60)).max(8).optional(),
  categories: z.array(z.enum(CATEGORIES)).optional(),
  locations: z.array(z.string().max(120)).max(10).optional(),
  workArrangement: z.array(z.string().max(20)).max(4).optional(),
  employmentTypes: z.array(z.string().max(24)).max(6).optional(),
  seniority: z.array(z.string().max(10)).max(5).optional(),
  remoteOnly: z.boolean().optional(),
  /** Restrict to listings this user has bookmarked. */
  savedOnly: z.boolean().optional(),
  /** Also scan the full posting text. Slower; off by default. */
  searchDescriptions: z.boolean().optional(),
  salaryMin: z.number().int().min(0).max(1_000_000).optional(),
  datePosted: z.number().int().min(1).max(365).optional(),
  sort: z.enum(['RELEVANCE', 'NEWEST', 'DEADLINE']).default('NEWEST'),
  page: z.number().int().min(1).max(500).default(1),
  pageSize: z.number().int().min(1).max(60).default(24),
});

export type SearchInput = z.infer<typeof searchSchema>;

/** Categories that describe a role, and so carry seniority, type and salary. */
const ROLE_CATEGORIES = ['JOB', 'CONTRACT'];

/**
 * Apply a role-only condition without discarding categories that cannot
 * satisfy it. A grant is not excluded by a seniority filter; it is simply
 * outside that filter's scope.
 */
function roleScoped(condition: Prisma.ListingWhereInput): Prisma.ListingWhereInput {
  return { OR: [condition, { category: { notIn: ROLE_CATEGORIES } }] };
}

/**
 * SQLite matches `contains` case-insensitively for ASCII, so searching
 * "engineer" finds "Engineer". Postgres does not: there `contains` compiles to
 * a case-sensitive LIKE, and you need ILIKE via `mode: 'insensitive'`.
 *
 * Prisma rejects `mode` outright on SQLite, so it cannot simply be set always.
 * Detecting the provider from the connection string keeps search behaving
 * identically on a local SQLite file and on Supabase.
 */
const IS_POSTGRES = /^postgres(ql)?:\/\//i.test(process.env.DATABASE_URL ?? '');

/** Case-insensitive substring match on either provider. */
function like(term: string) {
  return (
    IS_POSTGRES ? { contains: term, mode: 'insensitive' } : { contains: term }
  ) as { contains: string };
}

/**
 * One word, matched across the short, indexed fields.
 *
 * `description` is deliberately excluded. It holds up to 6,000 characters per
 * row, and an ILIKE with a leading wildcard cannot use a btree index, so
 * including it forced a full scan of every description on every word of every
 * query. On 7,600 rows that already cost about 700ms per extra word; at the
 * scale board discovery brings it would be unusable. Titles, company names,
 * skill tags and funders carry trigram indexes and cover what people actually
 * search for. Pass searchDescriptions to opt back in for a narrow query.
 */
function anyFieldContains(term: string, includeDescription = false): Prisma.ListingWhereInput {
  const targets: Prisma.ListingWhereInput[] = [
    { title: like(term) },
    { companyName: like(term) },
    { tags: like(term) },
    { funder: like(term) },
  ];
  if (includeDescription) targets.push({ description: like(term) });
  return { OR: targets };
}

export function buildWhere(input: SearchInput): Prisma.ListingWhereInput {
  const and: Prisma.ListingWhereInput[] = [{ active: true }];

  if (input.q) {
    // Every word must appear somewhere, which is what a search box should do.
    for (const term of input.q.split(/\s+/).filter(Boolean).slice(0, 6)) {
      and.push(anyFieldContains(term, input.searchDescriptions ?? false));
    }
  }

  if (input.anyKeywords?.length) {
    // Across chips: OR, because they are separate interests.
    // Within a chip: AND on its words, so "solar engineer" matches a listing
    // that mentions both rather than only that exact phrase.
    const chips = input.anyKeywords
      .map((chip) => chip.split(/\s+/).filter(Boolean).slice(0, 4))
      .filter((words) => words.length > 0)
      .map((words) => ({
        AND: words.map((word) => anyFieldContains(word, input.searchDescriptions ?? false)),
      }));

    if (chips.length) and.push({ OR: chips });
  }

  if (input.categories?.length) and.push({ category: { in: input.categories } });
  if (input.remoteOnly) and.push({ remote: true });

  // Seniority, employment type and salary describe a role. A grant call or a
  // partner programme has none of them, so applying these as flat filters
  // would silently delete those categories from the results. Scope them to the
  // categories where they actually mean something.
  if (input.workArrangement?.length) {
    and.push(roleScoped({ workArrangement: { in: input.workArrangement } }));
  }
  if (input.employmentTypes?.length) {
    and.push(roleScoped({ employmentType: { in: input.employmentTypes } }));
  }
  if (input.seniority?.length) {
    and.push(roleScoped({ seniority: { in: input.seniority } }));
  }
  if (input.salaryMin) {
    and.push(roleScoped({ salaryMax: { gte: input.salaryMin } }));
  }

  if (input.datePosted) {
    and.push({ postedAt: { gte: new Date(Date.now() - input.datePosted * 86_400_000) } });
  }

  if (input.locations?.length) {
    and.push({
      OR: input.locations.map((loc) => ({ locations: like(loc) })),
    });
  }

  // "Closing soonest" only means something for things that close. Many grant
  // calls are rolling, and SQLite would sort those nulls to the front.
  if (input.sort === 'DEADLINE') {
    and.push({ deadline: { not: null }, AND: [{ deadline: { gte: new Date() } }] });
  }

  return { AND: and };
}

function orderBy(sort: SearchInput['sort']): Prisma.ListingOrderByWithRelationInput[] {
  if (sort === 'DEADLINE') return [{ deadline: 'asc' }, { postedAt: 'desc' }];
  return [{ postedAt: 'desc' }, { id: 'desc' }];
}

export interface ListingDto {
  id: string;
  category: Category;
  title: string;
  excerpt: string;
  applyUrl: string | null;
  company: { name: string | null; slug: string | null; logoUrl: string | null; industry: string | null };
  locations: string[];
  tags: string[];
  remote: boolean;
  workArrangement: string | null;
  employmentType: string | null;
  seniority: string | null;
  salary: { min: number | null; max: number | null; currency: string | null };
  amount: { min: number | null; max: number | null; currency: string | null };
  deadline: string | null;
  postedAt: string;
  source: string;
  locked: boolean;
  saved: boolean;
}

export interface SearchResult {
  items: ListingDto[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  locked: boolean;
}

/**
 * Joppo has no free tier. For an unsubscribed caller the sensitive fields are
 * never read out of the database at all: the select list itself changes, so
 * there is nothing in the response payload to un-blur. This is the flaw that
 * blur-only paywalls leave open.
 */
export async function runSearch(
  input: SearchInput,
  unlocked: boolean,
  userId?: string | null,
): Promise<SearchResult> {
  const base = buildWhere(input);
  const where: Prisma.ListingWhereInput =
    input.savedOnly && userId
      ? { AND: [base, { saved: { some: { userId } } }] }
      : base;
  const skip = (input.page - 1) * input.pageSize;

  const [total, rows] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy: orderBy(input.sort),
      skip,
      take: input.pageSize,
      select: {
        id: true,
        category: true,
        title: true,
        locations: true,
        tags: true,
        remote: true,
        workArrangement: true,
        employmentType: true,
        seniority: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        amountMin: true,
        amountMax: true,
        amountCurrency: true,
        deadline: true,
        postedAt: true,
        source: true,
        // Only this user's bookmark row, so the card can render its state.
        ...(userId ? { saved: { where: { userId }, select: { id: true }, take: 1 } } : {}),
        // Locked fields. Requested only when the caller has paid.
        ...(unlocked
          ? {
              description: true,
              applyUrl: true,
              companyName: true,
              company: { select: { name: true, slug: true, logoUrl: true, industry: true } },
            }
          : {}),
      },
    }),
  ]);

  const items = rows.map((row): ListingDto => {
    const anyRow = row as typeof row & {
      description?: string;
      applyUrl?: string;
      companyName?: string | null;
      company?: { name: string; slug: string; logoUrl: string | null; industry: string | null } | null;
      saved?: { id: string }[];
    };

    return {
      id: row.id,
      category: row.category as Category,
      title: row.title,
      excerpt: unlocked ? (anyRow.description ?? '').slice(0, 260) : '',
      applyUrl: unlocked ? (anyRow.applyUrl ?? null) : null,
      company: unlocked
        ? {
            name: anyRow.company?.name ?? anyRow.companyName ?? null,
            slug: anyRow.company?.slug ?? null,
            logoUrl: anyRow.company?.logoUrl ?? null,
            industry: anyRow.company?.industry ?? null,
          }
        : { name: null, slug: null, logoUrl: null, industry: null },
      locations: toList(row.locations),
      tags: toList(row.tags).slice(0, 6),
      remote: row.remote,
      workArrangement: row.workArrangement,
      employmentType: row.employmentType,
      seniority: row.seniority,
      salary: { min: row.salaryMin, max: row.salaryMax, currency: row.salaryCurrency },
      amount: { min: row.amountMin, max: row.amountMax, currency: row.amountCurrency },
      deadline: row.deadline ? row.deadline.toISOString() : null,
      postedAt: row.postedAt.toISOString(),
      source: row.source,
      locked: !unlocked,
      saved: (anyRow.saved?.length ?? 0) > 0,
    };
  });

  return {
    items,
    total,
    page: input.page,
    pageSize: input.pageSize,
    hasMore: skip + items.length < total,
    locked: !unlocked,
  };
}

/** Count matches for a saved profile. Used for the number shown at the paywall. */
export async function countMatches(input: Partial<SearchInput>): Promise<number> {
  const parsed = searchSchema.parse({ sort: 'NEWEST', page: 1, pageSize: 24, ...input });
  return prisma.listing.count({ where: buildWhere(parsed) });
}

export interface ProfileLike {
  categories: string;
  roles: string;
  seniority: string | null;
  locations: string;
  remoteOnly: boolean;
  minSalary: number | null;
}

/**
 * One place that turns saved onboarding answers into a query. The paywall
 * count, the locked preview and the first search all call this, so the number
 * the user is sold on is the number they get.
 */
export function profileToSearch(profile: ProfileLike | null): SearchInput {
  const categories = toList(profile?.categories).filter((c): c is Category =>
    (CATEGORIES as readonly string[]).includes(c),
  );
  const locations = toList(profile?.locations);
  const roles = toList(profile?.roles);

  return searchSchema.parse({
    anyKeywords: roles.length ? roles : undefined,
    categories: categories.length ? categories : undefined,
    locations: locations.length ? locations : undefined,
    seniority: profile?.seniority ? [profile.seniority] : undefined,
    remoteOnly: profile?.remoteOnly || undefined,
    salaryMin: profile?.minSalary ?? undefined,
    sort: 'NEWEST',
    page: 1,
    pageSize: 24,
  });
}
