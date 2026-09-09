import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { adminEnabled, isAdmin } from '@/lib/admin';
import { collectMetrics, money, planName, type PersonRow } from '@/lib/metrics';
import { Gate, SignOut } from '@/components/admin/gate';
import {
  Bars,
  Empty,
  Meter,
  Panel,
  Pill,
  Row,
  Stat,
  Td,
  Th,
  type Grade,
} from '@/components/admin/ui';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Keeps the page out of search results and out of the sitemap even if the URL
// is guessed or shared by accident.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// ------------------------------------------------------------------ helpers

function pct(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

function bytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024).toFixed(0)} KB`;
}

function ago(date: Date | null): string {
  if (!date) return 'never';
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function until(date: Date | null): string {
  if (!date) return '—';
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  if (seconds <= 0) return 'expired';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function day(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : '—';
}

/** Grades that read the same way everywhere: below is better unless inverted. */
function grade(value: number, warn: number, bad: number, invert = false): Grade {
  if (!Number.isFinite(value)) return 'idle';
  if (invert) return value >= warn ? 'good' : value >= bad ? 'warn' : 'bad';
  return value <= warn ? 'good' : value <= bad ? 'warn' : 'bad';
}

function personLabel(p: PersonRow): string {
  return p.email ?? p.name ?? p.id.slice(0, 10);
}

// --------------------------------------------------------------------- page

export default async function AdminPage() {
  if (!adminEnabled()) notFound();
  if (!(await isAdmin())) return <Gate />;

  const m = await collectMetrics();
  const cur = m.money.currency;

  const freshness: Grade =
    m.crawl.hoursSinceOldest === null
      ? 'idle'
      : grade(m.crawl.hoursSinceOldest, 6, 24);

  const storage = grade(m.limits.dbPercent, 0.6, 0.85);
  const churn = grade(m.subs.churnRate, 0.2, 0.4);
  const failing = grade(m.crawl.failing, 0, 3);

  const stuck = m.money.byStatus
    .filter((s) => s.status !== 'success')
    .reduce((n, s) => n + s.count, 0);

  return (
    <main className="mx-auto max-w-[1180px] px-5 py-8">
      {/* ------------------------------------------------------------ head */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tightest text-white">
            Joppo monitor
          </h1>
          <p className="mt-0.5 text-[12.5px] text-white/35">
            Read {ago(m.generatedAt)} · database answered in {m.limits.dbLatencyMs}ms
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/admin"
            className="rounded-[5px] border border-white/[0.09] px-2.5 py-1.5 text-[12px] text-white/45 transition-colors hover:border-white/20 hover:text-white/85"
          >
            Refresh
          </a>
          <SignOut />
        </div>
      </header>

      {/* --------------------------------------------------------- headline */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="People"
          value={m.people.total.toLocaleString()}
          sub={`+${m.people.today} today · +${m.people.last7} this week`}
          grade={m.people.last7 > 0 ? 'good' : 'idle'}
        />
        <Stat
          label="Paying"
          value={m.money.payingUsers.toLocaleString()}
          sub={`${pct(m.money.conversionRate)} of signups`}
          grade={m.money.payingUsers > 0 ? 'good' : 'idle'}
        />
        <Stat
          label="Gross"
          value={money(m.money.grossMinor, cur)}
          sub={`${money(m.money.monthMinor, cur)} this month`}
          grade={m.money.grossMinor > 0 ? 'good' : 'idle'}
        />
        <Stat
          label="Active plans"
          value={m.subs.active.toLocaleString()}
          sub={
            m.subs.lastAccessEndsAt
              ? `last one ends ${day(m.subs.lastAccessEndsAt)}`
              : 'nobody has access'
          }
          grade={m.subs.active > 0 ? 'good' : 'idle'}
        />
      </div>

      {/* ------------------------------------------------ runway and limits */}
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Panel title="When things run out" hint="the ceilings that matter" className="lg:col-span-2">
          <div className="space-y-4">
            <Meter
              fraction={m.limits.dbPercent}
              grade={storage}
              label={`Database — ${bytes(m.limits.dbBytes)} of ${bytes(m.limits.dbLimitBytes)} (Supabase free)`}
              right={
                m.limits.dbDaysLeft === null
                  ? m.limits.snapshots < 2
                    ? 'measuring'
                    : 'not growing'
                  : `${m.limits.dbDaysLeft} days left`
              }
            />
            <p className="-mt-2 text-[11.5px] text-white/25">
              {m.limits.snapshots < 2
                ? 'Growth needs two readings to compare. One is taken at the end of every crawl, so this fills in on its own.'
                : `Growing ${bytes(Math.max(0, m.limits.dbBytesPerDay))} a day, measured across ${m.limits.snapshots} readings.`}
            </p>

            <Meter
              fraction={
                m.crawl.enabled > 0 ? m.crawl.ranLast24h / m.crawl.enabled : 0
              }
              grade={
                m.crawl.enabled > 0
                  ? grade(m.crawl.ranLast24h / m.crawl.enabled, 0.9, 0.5, true)
                  : 'idle'
              }
              label="Crawl coverage — sources visited in the last 24h"
              right={`${m.crawl.ranLast24h} of ${m.crawl.enabled}`}
            />

            <div className="grid gap-3 pt-1 sm:grid-cols-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-white/35">
                  Catalogue age
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Pill grade={freshness}>
                    {m.crawl.hoursSinceOldest === null
                      ? 'never crawled'
                      : `${m.crawl.hoursSinceOldest}h stale`}
                  </Pill>
                </div>
                <div className="mt-1 text-[11.5px] text-white/25">
                  last run {ago(m.crawl.newestRunAt)}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-white/35">
                  Broken sources
                </div>
                <div className="mt-1">
                  <Pill grade={failing}>{m.crawl.failing} failing</Pill>
                </div>
                <div className="mt-1 text-[11.5px] text-white/25">
                  {m.crawl.neverRun} never run
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-white/35">
                  Paid access
                </div>
                <div className="mt-1">
                  <Pill grade={m.subs.active > 0 ? 'good' : 'idle'}>
                    {m.subs.lastAccessEndsAt ? until(m.subs.lastAccessEndsAt) : 'none'}
                  </Pill>
                </div>
                <div className="mt-1 text-[11.5px] text-white/25">
                  until the last plan lapses
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Churn" hint="one-off charges, so a lapse is a cancellation">
          <div className="text-[26px] font-semibold leading-none tracking-tightest text-white">
            {pct(m.subs.churnRate, 0)}
          </div>
          <p className="mt-1.5 text-[12.5px] text-white/40">
            {m.subs.lapsed} lapsed · {m.subs.active} still active
          </p>
          <div className="mt-3">
            <Meter fraction={m.subs.churnRate} grade={churn} />
          </div>

          <div className="mt-4 border-t border-white/[0.06] pt-3">
            <div className="text-[11px] uppercase tracking-[0.14em] text-white/35">
              Expiring within 7 days
            </div>
            {m.subs.expiringSoon.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-white/30">Nobody.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {m.subs.expiringSoon.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12.5px] text-white/70">
                      {personLabel(p)}
                    </span>
                    <span className="shrink-0 text-[12px] text-amber-300">
                      {until(p.expires)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>

      {/* ----------------------------------------------------------- trends */}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel title="Signups" hint="last 30 days">
          <Bars points={m.people.signupSeries} />
          <div className="mt-3 flex gap-5 border-t border-white/[0.06] pt-3 text-[12.5px]">
            <span className="text-white/40">
              Onboarded <span className="text-white/80">{m.people.onboarded}</span>
            </span>
            <span className="text-white/40">
              Completion <span className="text-white/80">{pct(m.people.onboardRate, 0)}</span>
            </span>
            <span className="text-white/40">
              30d <span className="text-white/80">+{m.people.last30}</span>
            </span>
          </div>
        </Panel>

        <Panel title="Revenue" hint="last 30 days">
          <Bars
            points={m.money.revenueSeries}
            accent="emerald"
            format={(v) => money(v, cur)}
          />
          <div className="mt-3 flex gap-5 border-t border-white/[0.06] pt-3 text-[12.5px]">
            <span className="text-white/40">
              ARPU <span className="text-white/80">{money(m.money.arpuMinor, cur)}</span>
            </span>
            <span className="text-white/40">
              30d <span className="text-white/80">{money(m.money.last30Minor, cur)}</span>
            </span>
            <span className="text-white/40">
              Conversion{' '}
              <span className="text-white/80">{pct(m.money.conversionRate)}</span>
            </span>
          </div>
        </Panel>
      </div>

      {/* ------------------------------------------------------ plans, usage */}
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Panel title="Plans">
          {m.subs.byPlan.length === 0 ? (
            <Empty>Nobody has bought anything yet.</Empty>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Plan</Th>
                  <Th right>Active</Th>
                  <Th right>Lapsed</Th>
                </tr>
              </thead>
              <tbody>
                {m.subs.byPlan.map((p) => (
                  <Row key={p.plan}>
                    <Td>{planName(p.plan)}</Td>
                    <Td right>{p.active}</Td>
                    <Td right dim>
                      {p.lapsed}
                    </Td>
                  </Row>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Payments" hint={stuck > 0 ? `${stuck} not settled` : 'all settled'}>
          {m.money.byStatus.length === 0 ? (
            <Empty>No payments recorded.</Empty>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Status</Th>
                  <Th right>Count</Th>
                  <Th right>Value</Th>
                </tr>
              </thead>
              <tbody>
                {m.money.byStatus.map((s) => (
                  <Row key={s.status}>
                    <Td>
                      <Pill grade={s.status === 'success' ? 'good' : s.status === 'pending' ? 'warn' : 'bad'}>
                        {s.status}
                      </Pill>
                    </Td>
                    <Td right>{s.count}</Td>
                    <Td right dim>
                      {money(s.minor, cur)}
                    </Td>
                  </Row>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Catalogue">
          <div className="flex items-baseline gap-4">
            <div>
              <div className="text-[22px] font-semibold leading-none tracking-tightest text-white">
                {m.catalogue.active.toLocaleString()}
              </div>
              <div className="mt-1 text-[11.5px] text-white/35">live listings</div>
            </div>
            <div>
              <div className="text-[22px] font-semibold leading-none tracking-tightest text-white/70">
                {m.catalogue.companies.toLocaleString()}
              </div>
              <div className="mt-1 text-[11.5px] text-white/35">organisations</div>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3">
            {m.catalogue.byCategory.map((c) => (
              <li key={c.category} className="flex justify-between text-[12.5px]">
                <span className="text-white/50">{c.category.toLowerCase()}</span>
                <span className="text-white/80">{c.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-white/[0.06] pt-2 text-[11.5px] text-white/25">
            {m.catalogue.retiredLast24h.toLocaleString()} retired in 24h ·{' '}
            {m.catalogue.retired.toLocaleString()} dead in total
          </p>
        </Panel>
      </div>

      {/* ------------------------------------------------------------ usage */}
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Panel title="Search usage" hint="this month" className="lg:col-span-1">
          <Stat
            label="Searches"
            value={m.usage.searchesThisMonth.toLocaleString()}
            sub={`${m.usage.activeSearchers} people searching`}
            grade={m.usage.searchesThisMonth > 0 ? 'good' : 'idle'}
          />
          <p className="mt-3 text-[11.5px] text-white/25">
            Counted from the monthly quota rows. The hourly burst counters expire
            within the hour by design, so they are not a history.
          </p>
        </Panel>

        <Panel title="Heaviest users" hint="searches against plan quota" className="lg:col-span-2">
          {m.usage.busiest.filter((p) => p.searches > 0).length === 0 ? (
            <Empty>Nobody has searched yet this month.</Empty>
          ) : (
            <div className="space-y-3">
              {m.usage.busiest
                .filter((p) => p.searches > 0)
                .map((p) => {
                  const frac = p.quota > 0 ? p.searches / p.quota : 0;
                  return (
                    <Meter
                      key={p.id}
                      fraction={frac}
                      grade={p.quota === 0 ? 'idle' : grade(frac, 0.7, 0.9)}
                      label={personLabel(p)}
                      right={
                        p.quota > 0
                          ? `${p.searches.toLocaleString()} / ${p.quota.toLocaleString()}`
                          : `${p.searches.toLocaleString()} (no plan)`
                      }
                    />
                  );
                })}
            </div>
          )}
        </Panel>
      </div>

      {/* ----------------------------------------------------------- people */}
      <div className="mt-3">
        <Panel
          title="Everyone"
          hint={`${m.people_list.length} shown, newest first`}
        >
          {m.people_list.length === 0 ? (
            <Empty>No signups yet.</Empty>
          ) : (
            <div className="-mx-4 overflow-x-auto px-4">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <Th>Person</Th>
                    <Th>Joined</Th>
                    <Th>Onboarded</Th>
                    <Th>Plan</Th>
                    <Th right>Paid</Th>
                    <Th right>Payments</Th>
                    <Th right>Searches</Th>
                    <Th right>Access</Th>
                  </tr>
                </thead>
                <tbody>
                  {m.people_list.map((p) => {
                    const live = p.expires !== null && p.expires.getTime() > Date.now();
                    return (
                      <Row key={p.id}>
                        <Td>{personLabel(p)}</Td>
                        <Td dim>{day(p.joined)}</Td>
                        <Td>
                          {p.onboarded ? (
                            <Pill grade="good">yes</Pill>
                          ) : (
                            <Pill grade="idle">no</Pill>
                          )}
                        </Td>
                        <Td dim>{planName(p.plan)}</Td>
                        <Td right>
                          {p.paidMinor > 0 ? money(p.paidMinor, cur) : <span className="text-white/25">—</span>}
                        </Td>
                        <Td right dim>
                          {p.payments || '—'}
                        </Td>
                        <Td right dim>
                          {p.searches ? p.searches.toLocaleString() : '—'}
                        </Td>
                        <Td right>
                          {p.expires === null ? (
                            <span className="text-white/25">—</span>
                          ) : (
                            <Pill grade={live ? 'good' : 'bad'}>
                              {live ? until(p.expires) : 'lapsed'}
                            </Pill>
                          )}
                        </Td>
                      </Row>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {/* --------------------------------------------------------- problems */}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel title="Payments needing attention">
          {m.troubles.length === 0 ? (
            <Empty>Nothing stuck.</Empty>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Person</Th>
                  <Th>Status</Th>
                  <Th right>Amount</Th>
                  <Th right>When</Th>
                </tr>
              </thead>
              <tbody>
                {m.troubles.map((t) => (
                  <Row key={t.reference}>
                    <Td>{t.email ?? t.reference.slice(0, 16)}</Td>
                    <Td>
                      <Pill grade={t.status === 'pending' ? 'warn' : 'bad'}>{t.status}</Pill>
                    </Td>
                    <Td right dim>
                      {money(t.minor, cur)}
                    </Td>
                    <Td right dim>
                      {ago(t.at)}
                    </Td>
                  </Row>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Sources failing">
          {m.crawl.failures.length === 0 ? (
            <Empty>Every source is healthy.</Empty>
          ) : (
            <ul className="space-y-2.5">
              {m.crawl.failures.map((f) => (
                <li key={`${f.kind}-${f.label}`} className="text-[12.5px]">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-white/75">{f.label}</span>
                    <span className="shrink-0 text-[11.5px] text-white/25">
                      {f.kind} · {ago(f.lastRunAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11.5px] text-rose-300/70">{f.error}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <p className="mt-6 text-center text-[11.5px] text-white/20">
        Joppo monitor · nothing on this page is public
      </p>
    </main>
  );
}
