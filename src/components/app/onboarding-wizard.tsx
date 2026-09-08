'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CATEGORIES, CATEGORY_META, SENIORITY, type Category } from '@/lib/types';
import { cn } from '@/lib/utils';

const SITUATIONS = [
  { value: 'urgent', label: 'I need something now', hint: 'Out of work and the clock is running' },
  { value: 'searching', label: 'Actively looking', hint: 'Applying regularly, no deadline' },
  { value: 'switching', label: 'Employed but done', hint: 'Want out of where I am' },
  { value: 'open', label: 'Open to the right thing', hint: 'Not looking hard, would move for a good one' },
];

interface Answers {
  situation: string;
  categories: Category[];
  roles: string[];
  seniority: string | null;
  locations: string[];
  remoteOnly: boolean;
  minSalary: number | null;
}

export function OnboardingWizard({
  totalListings,
  plan,
}: {
  totalListings: number;
  plan?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [a, setA] = useState<Answers>({
    situation: '',
    categories: [],
    roles: [],
    seniority: null,
    locations: [],
    remoteOnly: false,
    minSalary: null,
  });

  const wantsRoles = a.categories.some((c) => c === 'JOB' || c === 'CONTRACT');

  const steps = useMemo(() => {
    const list: StepDef[] = [
      { id: 'situation', title: 'Where are you right now?', sub: 'This only changes what we put in front of you first.' },
      { id: 'categories', title: 'What are you looking for?', sub: 'Pick everything that applies. You can change it later.' },
      { id: 'roles', title: 'Name it in your own words.', sub: 'Titles, skills, sectors. Three or four is plenty.' },
    ];
    if (wantsRoles) {
      list.push({ id: 'seniority', title: 'How much experience?', sub: 'We use this to cut the noise, not to lock you out.' });
    }
    list.push({ id: 'where', title: 'Where should we look?', sub: 'Leave it empty to search everywhere.' });
    return list;
  }, [wantsRoles]);

  const current = steps[Math.min(step, steps.length - 1)];
  const isLast = step === steps.length - 1;

  const canAdvance =
    (current.id === 'situation' && a.situation !== '') ||
    (current.id === 'categories' && a.categories.length > 0) ||
    current.id === 'roles' ||
    current.id === 'seniority' ||
    current.id === 'where';

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          situation: a.situation,
          categories: a.categories,
          roles: a.roles,
          seniority: a.seniority,
          locations: a.locations,
          remoteOnly: a.remoteOnly,
          minSalary: a.minSalary,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Could not save your answers.');
      }

      router.push(plan ? `/unlock?plan=${encodeURIComponent(plan)}` : '/unlock');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      {/* progress */}
      <div className="mb-8 flex items-center gap-1.5">
        {steps.map((s, i) => (
          <span
            key={s.id}
            className={cn(
              'h-[3px] flex-1 rounded-full transition-colors duration-300',
              i <= step ? 'bg-white/80' : 'bg-white/[0.08]',
            )}
          />
        ))}
      </div>

      <div className="panel p-8">
        <p className="eyebrow">
          Step {step + 1} of {steps.length}
        </p>
        <h1 className="mt-3 text-[26px] font-semibold leading-tight tracking-tightest text-white">
          {current.title}
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-white/45">{current.sub}</p>

        <div className="mt-7">
          {current.id === 'situation' ? (
            <div className="space-y-2">
              {SITUATIONS.map((s) => (
                <Choice
                  key={s.value}
                  selected={a.situation === s.value}
                  onClick={() => setA({ ...a, situation: s.value })}
                  label={s.label}
                  hint={s.hint}
                />
              ))}
            </div>
          ) : null}

          {current.id === 'categories' ? (
            <div className="space-y-2">
              {CATEGORIES.map((c) => (
                <Choice
                  key={c}
                  selected={a.categories.includes(c)}
                  multi
                  onClick={() =>
                    setA({
                      ...a,
                      categories: a.categories.includes(c)
                        ? a.categories.filter((x) => x !== c)
                        : [...a.categories, c],
                    })
                  }
                  label={CATEGORY_META[c].label}
                  hint={CATEGORY_META[c].blurb}
                />
              ))}
            </div>
          ) : null}

          {current.id === 'roles' ? (
            <ChipInput
              values={a.roles}
              onChange={(roles) => setA({ ...a, roles })}
              placeholder="Product designer, fintech, solar…"
              max={8}
            />
          ) : null}

          {current.id === 'seniority' ? (
            <div className="space-y-2">
              {SENIORITY.map((s) => (
                <Choice
                  key={s.value}
                  selected={a.seniority === s.value}
                  onClick={() =>
                    setA({ ...a, seniority: a.seniority === s.value ? null : s.value })
                  }
                  label={s.label}
                />
              ))}
            </div>
          ) : null}

          {current.id === 'where' ? (
            <div className="space-y-5">
              <ChipInput
                values={a.locations}
                onChange={(locations) => setA({ ...a, locations })}
                placeholder="Lagos, London, United States…"
                max={6}
              />
              <button
                type="button"
                onClick={() => setA({ ...a, remoteOnly: !a.remoteOnly })}
                className={cn(
                  'flex w-full items-center justify-between rounded-[6px] border px-4 py-3.5 text-left transition-colors',
                  a.remoteOnly
                    ? 'border-white/25 bg-white/[0.075]'
                    : 'border-white/[0.08] bg-white/[0.025] hover:border-white/[0.15]',
                )}
              >
                <span>
                  <span className="block text-[14px] font-medium text-white/85">Remote only</span>
                  <span className="mt-0.5 block text-[12.5px] text-white/40">
                    Hide anything that needs you in an office
                  </span>
                </span>
                <span
                  className={cn(
                    'ml-4 flex h-[18px] w-[32px] shrink-0 items-center rounded-full border border-white/10 transition-colors',
                    a.remoteOnly ? 'bg-white/85' : 'bg-white/[0.07]',
                  )}
                >
                  <span
                    className={cn(
                      'block size-3 rounded-full bg-ink-950 transition-transform',
                      a.remoteOnly ? 'translate-x-[15px]' : 'translate-x-[2px]',
                    )}
                  />
                </span>
              </button>
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="mt-5 rounded-[6px] border border-red-400/20 bg-red-400/[0.07] p-3 text-[12.5px] text-red-200/85">
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex items-center gap-3">
          {step > 0 ? (
            <Button
              variant="ghost"
              size="md"
              onClick={() => setStep((s) => s - 1)}
              disabled={busy}
            >
              <ArrowLeft className="size-4" /> Back
            </Button>
          ) : null}

          <Button
            className="ml-auto"
            size="md"
            disabled={!canAdvance || busy}
            onClick={() => (isLast ? void submit() : setStep((s) => s + 1))}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {isLast ? 'Show my matches' : 'Continue'}
            {!busy && !isLast ? <ArrowRight className="size-4" /> : null}
          </Button>
        </div>
      </div>

      <p className="mt-5 text-center text-[12px] text-white/25">
        Searching {totalListings.toLocaleString()} live opportunities
      </p>
    </div>
  );
}

interface StepDef {
  id: 'situation' | 'categories' | 'roles' | 'seniority' | 'where';
  title: string;
  sub: string;
}

function Choice({
  selected,
  onClick,
  label,
  hint,
  multi,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-[6px] border px-4 py-3.5 text-left transition-colors duration-150',
        selected
          ? 'border-white/25 bg-white/[0.075]'
          : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18] hover:bg-white/[0.04]',
      )}
    >
      <span
        className={cn(
          'mt-[3px] grid size-4 shrink-0 place-items-center border transition-colors',
          multi ? 'rounded-[3px]' : 'rounded-full',
          selected ? 'border-transparent bg-white' : 'border-white/25',
        )}
      >
        {selected ? (
          <svg viewBox="0 0 10 10" className="size-2.5 text-ink-950" aria-hidden>
            <path
              d="M1 5l2.5 2.5L9 2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-medium text-white/90">{label}</span>
        {hint ? <span className="mt-0.5 block text-[12.5px] text-white/40">{hint}</span> : null}
      </span>
    </button>
  );
}

function ChipInput({
  values,
  onChange,
  placeholder,
  max,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  max: number;
}) {
  const [draft, setDraft] = useState('');

  function commit() {
    const value = draft.trim();
    if (!value || values.length >= max) return;
    if (values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...values, value]);
    setDraft('');
  }

  return (
    <div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
          }
          if (e.key === 'Backspace' && !draft && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={placeholder}
        className="field h-12 w-full px-4 text-[14px]"
      />
      <p className="mt-2 text-[11.5px] text-white/25">
        Press enter after each one. {max - values.length} left.
      </p>
      {values.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1.5 rounded-[5px] border border-white/25 bg-white/[0.09] py-1.5 pl-3 pr-2 text-[12.5px] text-white/85"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="rounded-[3px] p-0.5 text-white/40 hover:bg-white/10 hover:text-white"
                aria-label={`Remove ${v}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
