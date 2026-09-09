import type { ReactNode } from 'react';

/**
 * The dashboard's building blocks.
 *
 * Colour carries one meaning here and only one: how healthy a number is. Three
 * grades, no more, so that a glance down the page reads as a status rather than
 * as decoration. Everything neutral stays in the same greys as the rest of the
 * app, which keeps the eye on whatever has actually gone amber.
 */
export type Grade = 'good' | 'warn' | 'bad' | 'idle';

const GRADE_TEXT: Record<Grade, string> = {
  good: 'text-emerald-300',
  warn: 'text-amber-300',
  bad: 'text-rose-300',
  idle: 'text-white/40',
};

const GRADE_DOT: Record<Grade, string> = {
  good: 'bg-emerald-400',
  warn: 'bg-amber-400',
  bad: 'bg-rose-400',
  idle: 'bg-white/25',
};

const GRADE_BAR: Record<Grade, string> = {
  good: 'bg-emerald-400/70',
  warn: 'bg-amber-400/70',
  bad: 'bg-rose-400/70',
  idle: 'bg-white/20',
};

export function Panel({
  title,
  hint,
  children,
  className = '',
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[6px] border border-white/[0.08] bg-white/[0.022] ${className}`}
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.16em] text-white/55">
          {title}
        </h2>
        {hint ? <span className="text-[11.5px] text-white/30">{hint}</span> : null}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
  grade = 'idle',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  grade?: Grade;
}) {
  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-white/[0.022] px-4 py-3.5">
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${GRADE_DOT[grade]}`} />
        <span className="text-[11px] uppercase tracking-[0.14em] text-white/40">{label}</span>
      </div>
      <div className="mt-2 text-[26px] font-semibold leading-none tracking-tightest text-white">
        {value}
      </div>
      {sub ? <div className="mt-1.5 text-[12.5px] text-white/40">{sub}</div> : null}
    </div>
  );
}

/** A horizontal fill. Used for quota consumption and storage headroom. */
export function Meter({
  fraction,
  grade,
  label,
  right,
}: {
  fraction: number;
  grade: Grade;
  label?: ReactNode;
  right?: ReactNode;
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0)) * 100;
  return (
    <div>
      {label || right ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[12.5px]">
          <span className="text-white/55">{label}</span>
          <span className={GRADE_TEXT[grade]}>{right}</span>
        </div>
      ) : null}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
        <div className={`h-full rounded-full ${GRADE_BAR[grade]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Pill({ grade, children }: { grade: Grade; children: ReactNode }) {
  const tone: Record<Grade, string> = {
    good: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    warn: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
    bad: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
    idle: 'border-white/10 bg-white/[0.04] text-white/45',
  };
  return (
    <span
      className={`inline-flex items-center rounded-[4px] border px-1.5 py-0.5 text-[11px] ${tone[grade]}`}
    >
      {children}
    </span>
  );
}

/**
 * A thirty-day column chart, drawn with divs rather than a charting library.
 * The data is one small number per day and the page is already server
 * rendered, so shipping a plotting bundle to draw thirty rectangles would cost
 * far more than it returns.
 */
export function Bars({
  points,
  format,
  accent = 'iris',
}: {
  points: { day: string; value: number }[];
  format?: (value: number) => string;
  accent?: 'iris' | 'emerald';
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const fill = accent === 'emerald' ? 'bg-emerald-400/60' : 'bg-iris-400/60';
  const empty = 'bg-white/[0.06]';

  return (
    <div>
      <div className="flex h-24 items-end gap-[3px]">
        {points.map((p) => {
          const height = p.value > 0 ? Math.max(6, (p.value / max) * 100) : 3;
          return (
            <div
              key={p.day}
              title={`${p.day}: ${format ? format(p.value) : p.value}`}
              className={`flex-1 rounded-[2px] ${p.value > 0 ? fill : empty}`}
              style={{ height: `${height}%` }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-white/25">
        <span>{points[0]?.day.slice(5)}</span>
        <span>peak {format ? format(max) : max}</span>
        <span>{points[points.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]">{children}</tr>
  );
}

export function Th({ children, right }: { children: ReactNode; right?: boolean }) {
  return (
    <th
      className={`whitespace-nowrap px-3 py-2 text-[11px] font-medium uppercase tracking-[0.13em] text-white/35 ${
        right ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  right,
  dim,
}: {
  children: ReactNode;
  right?: boolean;
  dim?: boolean;
}) {
  return (
    <td
      className={`whitespace-nowrap px-3 py-2 text-[13px] ${right ? 'text-right' : ''} ${
        dim ? 'text-white/40' : 'text-white/80'
      }`}
    >
      {children}
    </td>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-[13px] text-white/30">{children}</p>;
}
