'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { signOut } from 'next-auth/react';
import {
  Search,
  Loader2,
  SlidersHorizontal,
  X,
  ExternalLink,
  LogOut,
  Bookmark,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Wordmark } from '@/components/landing/wordmark';
import {
  CATEGORIES,
  CATEGORY_META,
  DATE_POSTED,
  EMPLOYMENT_TYPES,
  SENIORITY,
  WORK_ARRANGEMENTS,
  type Category,
} from '@/lib/types';
import { cn, timeAgo, formatMoney } from '@/lib/utils';
import type { ListingDto, SearchResult } from '@/lib/search';

interface Defaults {
  categories: Category[];
  roles: string[];
  locations: string[];
  remoteOnly: boolean;
  seniority: string | null;
  salaryMin: number | null;
}

interface Filters {
  q: string;
  /** Onboarding interests, matched with OR. Cleared the moment the user types. */
  anyKeywords: string[];
  categories: Category[];
  workArrangement: string[];
  employmentTypes: string[];
  seniority: string[];
  locations: string[];
  remoteOnly: boolean;
  savedOnly: boolean;
  datePosted?: number;
  sort: 'NEWEST' | 'DEADLINE';
}

interface SavedSearch {
  id: string;
  name: string;
  filters: Partial<Filters>;
}

const PAGE_SIZE = 24;

/** Filters as the search API wants them. Shared by search and saved searches. */
function toRequest(f: Filters) {
  return {
    q: f.q || undefined,
    anyKeywords: f.anyKeywords.length ? f.anyKeywords : undefined,
    categories: f.categories.length ? f.categories : undefined,
    workArrangement: f.workArrangement.length ? f.workArrangement : undefined,
    employmentTypes: f.employmentTypes.length ? f.employmentTypes : undefined,
    seniority: f.seniority.length ? f.seniority : undefined,
    locations: f.locations.length ? f.locations : undefined,
    remoteOnly: f.remoteOnly || undefined,
    savedOnly: f.savedOnly || undefined,
    datePosted: f.datePosted,
    sort: f.sort,
  };
}

export function SearchApp({
  defaults,
  justUnlocked,
  expiresAt,
  plan,
}: {
  defaults: Defaults;
  justUnlocked: boolean;
  expiresAt: string | null;
  plan: string | null;
}) {
  const [filters, setFilters] = useState<Filters>({
    q: '',
    anyKeywords: defaults.roles ?? [],
    categories: defaults.categories ?? [],
    workArrangement: [],
    employmentTypes: [],
    seniority: defaults.seniority ? [defaults.seniority] : [],
    locations: defaults.locations ?? [],
    remoteOnly: defaults.remoteOnly ?? false,
    savedOnly: false,
    sort: 'NEWEST',
  });

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  const [draft, setDraft] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [items, setItems] = useState<ListingDto[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [banner, setBanner] = useState(justUnlocked);

  const requestId = useRef(0);

  const run = useCallback(
    async (nextPage: number, append: boolean) => {
      const id = ++requestId.current;
      append ? setLoadingMore(true) : setLoading(true);

      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...toRequest(filters), page: nextPage, pageSize: PAGE_SIZE }),
        });

        if (!res.ok) throw new Error('Search failed');
        const body = (await res.json()) as SearchResult;

        // Ignore a response that a newer request has already superseded.
        if (id !== requestId.current) return;

        setResult(body);
        setItems((prev) => (append ? [...prev, ...body.items] : body.items));
        setPage(nextPage);
      } catch {
        if (id === requestId.current) {
          setResult({ items: [], total: 0, page: 1, pageSize: PAGE_SIZE, hasMore: false, locked: false });
          if (!append) setItems([]);
        }
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [filters],
  );

  useEffect(() => {
    void run(1, false);
  }, [run]);

  // Bookmarks and saved searches. A failure here leaves search working.
  useEffect(() => {
    void (async () => {
      try {
        const [searches, bookmarks] = await Promise.all([
          fetch('/api/saved/search').then((r) => (r.ok ? r.json() : { items: [] })),
          fetch('/api/saved/listing').then((r) => (r.ok ? r.json() : { count: 0 })),
        ]);
        setSavedSearches(searches.items ?? []);
        setSavedCount(bookmarks.count ?? 0);
      } catch {
        /* convenience only */
      }
    })();
  }, []);

  const update = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  async function toggleSaved(item: ListingDto) {
    const next = !item.saved;
    // Flip immediately, roll back if the write fails.
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, saved: next } : i)));
    setSavedCount((n) => Math.max(0, n + (next ? 1 : -1)));

    try {
      const res = await fetch('/api/saved/listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: item.id, saved: next }),
      });
      if (!res.ok) throw new Error('save failed');
      const body = await res.json();
      if (typeof body.count === 'number') setSavedCount(body.count);
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, saved: !next } : i)));
      setSavedCount((n) => Math.max(0, n + (next ? -1 : 1)));
    }
  }

  async function saveCurrentSearch(name: string): Promise<boolean> {
    try {
      const res = await fetch('/api/saved/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, filters: toRequest(filters) }),
      });
      if (!res.ok) return false;
      const body = await res.json();
      setSavedSearches((prev) => [body.item, ...prev]);
      return true;
    } catch {
      return false;
    }
  }

  async function removeSavedSearch(id: string) {
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/saved/search?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(
      () => {},
    );
  }

  function applySavedSearch(s: SavedSearch) {
    const f = s.filters ?? {};
    setDraft(typeof f.q === 'string' ? f.q : '');
    setFilters({
      q: f.q ?? '',
      anyKeywords: f.anyKeywords ?? [],
      categories: f.categories ?? [],
      workArrangement: f.workArrangement ?? [],
      employmentTypes: f.employmentTypes ?? [],
      seniority: f.seniority ?? [],
      locations: f.locations ?? [],
      remoteOnly: f.remoteOnly ?? false,
      savedOnly: f.savedOnly ?? false,
      datePosted: f.datePosted,
      sort: f.sort ?? 'NEWEST',
    });
  }

  const toggle = <K extends 'categories' | 'workArrangement' | 'employmentTypes' | 'seniority'>(
    key: K,
    value: string,
  ) => {
    setFilters((f) => {
      const list = f[key] as string[];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...f, [key]: next } as Filters;
    });
  };

  const activeCount =
    filters.workArrangement.length +
    filters.employmentTypes.length +
    filters.seniority.length +
    filters.locations.length +
    (filters.remoteOnly ? 1 : 0) +
    (filters.datePosted ? 1 : 0);

  return (
    <div className="min-h-screen">
      {/* ---------------------------------------------------------- header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-ink-950/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-5 py-3">
          <Wordmark className="hidden shrink-0 sm:flex" />

          <form
            className="flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              // An explicit search replaces the interests carried over from onboarding.
              update({ q: draft.trim(), anyKeywords: [] });
            }}
          >
            {/* Field and action are one control, not a button dropped on top of an input. */}
            <div className="flex h-10 items-center gap-2 rounded-[6px] border border-white/[0.10] bg-white/[0.03] pl-3 pr-1 transition-colors focus-within:border-white/25 focus-within:bg-white/[0.05]">
              <Search className="size-4 shrink-0 text-white/25" />

              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Title, keyword, funder or organisation"
                aria-label="Search opportunities"
                className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] text-white outline-none placeholder:text-white/25"
              />

              {draft ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraft('');
                    update({ q: '' });
                  }}
                  className="shrink-0 rounded-[3px] p-1 text-white/30 transition-colors hover:text-white/75"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}

              <span className="h-5 w-px shrink-0 bg-white/[0.10]" />

              <button
                type="submit"
                className="h-[30px] shrink-0 rounded-[4px] bg-white/[0.08] px-3.5 text-[12.5px] font-medium text-white/75 transition-colors hover:bg-white/[0.16] hover:text-white"
              >
                Search
              </button>
            </div>
          </form>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary" size="sm" className="shrink-0">
                <LogOut className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56">
              <p className="px-1 pb-2 text-[12px] text-white/45">
                {plan ? `${titleCase(plan)} plan` : 'Active'}
                {expiresAt ? ` · renews ${new Date(expiresAt).toLocaleDateString()}` : ''}
              </p>
              <button
                onClick={() => void signOut({ callbackUrl: '/' })}
                className="w-full rounded-[4px] px-2.5 py-2 text-left text-[13px] text-white/70 hover:bg-white/[0.06] hover:text-white"
              >
                Sign out
              </button>
            </PopoverContent>
          </Popover>
        </div>

        {/* ------------------------------------------------------ filter bar */}
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 overflow-x-auto px-5 pb-3">
          <FilterChip
            label="All filters"
            icon={<SlidersHorizontal className="size-3.5" />}
            count={activeCount}
            content={
              <div className="max-h-[70vh] w-72 space-y-4 overflow-y-auto">
                <Section title="Workplace">
                  {WORK_ARRANGEMENTS.map((o) => (
                    <Check
                      key={o.value}
                      label={o.label}
                      checked={filters.workArrangement.includes(o.value)}
                      onChange={() => toggle('workArrangement', o.value)}
                    />
                  ))}
                </Section>
                <Section title="Employment type">
                  {EMPLOYMENT_TYPES.map((o) => (
                    <Check
                      key={o.value}
                      label={o.label}
                      checked={filters.employmentTypes.includes(o.value)}
                      onChange={() => toggle('employmentTypes', o.value)}
                    />
                  ))}
                </Section>
                <Section title="Experience">
                  {SENIORITY.map((o) => (
                    <Check
                      key={o.value}
                      label={o.label}
                      checked={filters.seniority.includes(o.value)}
                      onChange={() => toggle('seniority', o.value)}
                    />
                  ))}
                </Section>
                <Section title="Posted">
                  {DATE_POSTED.map((o) => (
                    <Check
                      key={o.value}
                      label={o.label}
                      radio
                      checked={filters.datePosted === Number(o.value)}
                      onChange={() =>
                        update({
                          datePosted:
                            filters.datePosted === Number(o.value) ? undefined : Number(o.value),
                        })
                      }
                    />
                  ))}
                </Section>
                {activeCount > 0 ? (
                  <button
                    onClick={() =>
                      update({
                        workArrangement: [],
                        employmentTypes: [],
                        seniority: [],
                        locations: [],
                        remoteOnly: false,
                        datePosted: undefined,
                      })
                    }
                    className="w-full rounded-[5px] border border-white/[0.10] py-2 text-[12.5px] text-white/55 hover:bg-white/[0.05] hover:text-white"
                  >
                    Clear all filters
                  </button>
                ) : null}
              </div>
            }
          />

          <span className="h-5 w-px shrink-0 bg-white/[0.09]" />

          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => toggle('categories', c)}
              className={cn('chip', filters.categories.includes(c) && 'chip-on')}
            >
              {CATEGORY_META[c].short}
            </button>
          ))}

          <button
            onClick={() => update({ remoteOnly: !filters.remoteOnly })}
            className={cn('chip', filters.remoteOnly && 'chip-on')}
          >
            Remote only
          </button>

          <button
            onClick={() => update({ savedOnly: !filters.savedOnly })}
            className={cn('chip flex items-center gap-1.5', filters.savedOnly && 'chip-on')}
          >
            <Bookmark className={cn('size-3', filters.savedOnly && 'fill-current')} />
            Saved
            {savedCount > 0 ? (
              <span className="tabular-nums rounded-[3px] bg-white/15 px-1.5 text-[10px] leading-[15px]">
                {savedCount}
              </span>
            ) : null}
          </button>

          {filters.anyKeywords.map((kw) => (
            <button
              key={kw}
              onClick={() =>
                update({ anyKeywords: filters.anyKeywords.filter((k) => k !== kw) })
              }
              className="chip chip-on flex items-center gap-1.5 pr-1.5"
              title="Remove this interest"
            >
              {kw}
              <X className="size-3 opacity-45" />
            </button>
          ))}
        </div>
      </header>

      {/* ---------------------------------------------------------- results */}
      <div className="mx-auto max-w-[1400px] px-5 py-6">
        {banner ? (
          <div className="panel mb-4 flex items-center gap-3 px-4 py-3">
            <p className="flex-1 text-[13px] text-white/60">
              You are in. Every listing below links straight to the organisation.
            </p>
            <button
              onClick={() => setBanner(false)}
              className="rounded-[3px] p-1 text-white/30 hover:text-white"
              aria-label="Dismiss"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}

        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-[13px] text-white/40">
            {loading ? (
              'Searching…'
            ) : (
              <>
                <span className="font-medium text-white/75">
                  {(result?.total ?? 0).toLocaleString()}
                </span>{' '}
                {result?.total === 1 ? 'result' : 'results'}
              </>
            )}
          </p>

          <div className="flex items-center gap-2">
            <SavedSearchMenu
              searches={savedSearches}
              onApply={applySavedSearch}
              onSave={saveCurrentSearch}
              onRemove={removeSavedSearch}
            />
            <select
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value as Filters['sort'] })}
              className="field h-9 px-2.5 text-[12.5px] text-white/70"
            >
              <option value="NEWEST">Newest first</option>
              <option value="DEADLINE">Closing soonest</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="panel h-[178px] animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="panel p-14 text-center">
            <p className="text-[15px] font-medium text-white/75">Nothing matched that.</p>
            <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-white/40">
              Try a broader keyword, drop a filter, or add another category from the row
              above.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => (
                <ListingCard key={item.id} item={item} onToggleSaved={toggleSaved} />
              ))}
            </div>

            {result?.hasMore ? (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="secondary"
                  size="lg"
                  disabled={loadingMore}
                  onClick={() => void run(page + 1, true)}
                >
                  {loadingMore ? <Loader2 className="size-4 animate-spin" /> : null}
                  Load more
                </Button>
              </div>
            ) : (
              <p className="mt-8 text-center text-[12.5px] text-white/25">
                That is everything matching this search.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ card

function ListingCard({
  item,
  onToggleSaved,
}: {
  item: ListingDto;
  onToggleSaved: (item: ListingDto) => void;
}) {
  const meta = CATEGORY_META[item.category];

  const salary =
    item.salary.min && item.salary.max
      ? `${formatMoney(item.salary.min, item.salary.currency ?? 'USD')}–${formatMoney(item.salary.max, item.salary.currency ?? 'USD')}`
      : null;
  const amount = item.amount.max
    ? `up to ${formatMoney(item.amount.max, item.amount.currency ?? 'USD')}`
    : null;

  // One quiet line of facts, rather than a row of coloured pills.
  const facts = [
    item.remote ? 'Remote' : item.workArrangement,
    item.employmentType ? labelType(item.employmentType) : null,
    salary ?? amount,
  ].filter(Boolean) as string[];

  // Sources write the location as "Remote - US" or "India - Remote", which
  // would repeat the word right under the facts line. Keep the place, drop the
  // duplicate from whichever end it sits on.
  const places = item.locations
    .map((loc) =>
      loc
        .replace(/^\s*remote\s*[-–—,/|]\s*/i, '')
        .replace(/\s*[-–—,/|]\s*remote\s*$/i, '')
        .trim(),
    )
    .filter((loc) => loc && !/^remote$/i.test(loc));

  return (
    <article className="panel panel-hover group/card flex flex-col p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.13em] text-white/35">{meta.short}</span>
        <span className="flex items-center gap-2">
          <span className="tabular-nums text-[11px] text-white/25">{timeAgo(item.postedAt)}</span>
          <button
            type="button"
            onClick={() => onToggleSaved(item)}
            aria-pressed={item.saved}
            aria-label={item.saved ? 'Remove from saved' : 'Save this listing'}
            title={item.saved ? 'Saved' : 'Save'}
            className={cn(
              'rounded-[3px] p-0.5 transition-all',
              item.saved
                ? 'text-white/75'
                : 'text-white/20 opacity-0 hover:text-white/70 focus-visible:opacity-100 group-hover/card:opacity-100',
            )}
          >
            <Bookmark className={cn('size-3.5', item.saved && 'fill-current')} />
          </button>
        </span>
      </div>

      <h3 className="mt-2.5 line-clamp-2 text-[14px] font-medium leading-snug text-white/90">
        {item.title}
      </h3>

      <p className="mt-1 truncate text-[12.5px] text-white/50">
        {item.company.name ?? 'Undisclosed'}
      </p>

      {facts.length > 0 ? (
        <p className="mt-2.5 truncate text-[11.5px] text-white/35">{facts.join('  ·  ')}</p>
      ) : null}

      {places.length > 0 ? (
        <p className="mt-1 truncate text-[11.5px] text-white/30">
          {places.slice(0, 2).join('  ·  ')}
        </p>
      ) : null}

      {item.deadline ? (
        <p className="mt-1 text-[11.5px] text-white/45">
          Closes{' '}
          {new Date(item.deadline).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
      ) : null}

      <div className="flex-1" />

      <div className="mt-4 border-t border-white/[0.07] pt-3">
        <a
          href={item.applyUrl ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 text-[12.5px] text-white/55 transition-colors hover:text-white"
        >
          Open at source
          <ExternalLink className="size-3 opacity-50 transition-opacity group-hover:opacity-100" />
        </a>
      </div>
    </article>
  );
}

// ------------------------------------------------------------------ bits

function FilterChip({
  label,
  icon,
  count,
  content,
}: {
  label: string;
  icon?: React.ReactNode;
  count?: number;
  content: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn('chip flex items-center gap-1.5', count && 'chip-on')}>
          {icon}
          {label}
          {count ? (
            <span className="tabular-nums rounded-[3px] bg-white/15 px-1.5 text-[10px] leading-[15px]">
              {count}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto">{content}</PopoverContent>
    </Popover>
  );
}

function SavedSearchMenu({
  searches,
  onApply,
  onSave,
  onRemove,
}: {
  searches: SavedSearch[];
  onApply: (s: SavedSearch) => void;
  onSave: (name: string) => Promise<boolean>;
  onRemove: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setError(null);
    const ok = await onSave(trimmed);
    if (ok) setName('');
    else setError('Could not save that one. You may have hit the limit of twenty.');
    setBusy(false);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="chip flex h-9 items-center gap-1.5">
          <Bookmark className="size-3" />
          Searches
          {searches.length ? (
            <span className="tabular-nums rounded-[3px] bg-white/15 px-1.5 text-[10px] leading-[15px]">
              {searches.length}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72">
        <form onSubmit={submit} className="flex items-center gap-1.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name this search"
            maxLength={60}
            className="field h-8 min-w-0 flex-1 px-2.5 text-[12.5px]"
          />
          <button
            type="submit"
            disabled={!name.trim() || busy}
            aria-label="Save current filters"
            className="grid size-8 shrink-0 place-items-center rounded-[4px] bg-white/[0.08] text-white/70 transition-colors hover:bg-white/[0.16] hover:text-white disabled:opacity-40"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          </button>
        </form>

        {error ? <p className="mt-2 text-[11.5px] leading-relaxed text-red-300/80">{error}</p> : null}

        {searches.length ? (
          <div className="mt-3 space-y-0.5 border-t border-white/[0.07] pt-2">
            {searches.map((s) => (
              <div key={s.id} className="group/row flex items-center gap-1">
                <button
                  onClick={() => onApply(s)}
                  className="min-w-0 flex-1 truncate rounded-[4px] px-2 py-1.5 text-left text-[13px] text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  {s.name}
                </button>
                <button
                  onClick={() => onRemove(s.id)}
                  aria-label={`Delete ${s.name}`}
                  className="shrink-0 rounded-[3px] p-1 text-white/20 opacity-0 transition-all hover:text-white/70 focus-visible:opacity-100 group-hover/row:opacity-100"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 border-t border-white/[0.07] pt-2.5 text-[11.5px] leading-relaxed text-white/35">
            Set your filters, then name them here to run the same search again later.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 px-1 text-[10.5px] uppercase tracking-[0.14em] text-white/30">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
  radio,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  radio?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex w-full items-center gap-2.5 rounded-[4px] px-2 py-1.5 text-left text-[13px] text-white/65 hover:bg-white/[0.05] hover:text-white"
    >
      <span
        className={cn(
          'grid size-[15px] shrink-0 place-items-center border transition-colors',
          radio ? 'rounded-full' : 'rounded-[3px]',
          checked ? 'border-transparent bg-white' : 'border-white/25',
        )}
      >
        {checked ? (
          <svg viewBox="0 0 10 10" className="size-2 text-ink-950" aria-hidden>
            <path
              d="M1 5l2.5 2.5L9 2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      {label}
    </button>
  );
}

function labelType(value: string): string {
  return (
    EMPLOYMENT_TYPES.find((t) => t.value === value)?.label ?? titleCase(value.replace(/_/g, ' '))
  );
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
