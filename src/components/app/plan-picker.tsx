'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PLAN_LIST, type PlanId } from '@/lib/plans';
import { cn } from '@/lib/utils';

export function PlanPicker({ initialPlan }: { initialPlan?: string }) {
  const valid = PLAN_LIST.find((p) => p.id === initialPlan?.toUpperCase());
  const [selected, setSelected] = useState<PlanId>(valid?.id ?? 'MONTHLY');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/paystack/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selected }),
      });
      const body = await res.json();

      if (!res.ok || !body.authorizationUrl) {
        throw new Error(body.error || 'Could not start checkout.');
      }
      window.location.href = body.authorizationUrl as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout.');
      setBusy(false);
    }
  }

  const plan = PLAN_LIST.find((p) => p.id === selected)!;

  return (
    <div className="mt-12">
      <div className="grid gap-3 md:grid-cols-3">
        {PLAN_LIST.map((p) => {
          const active = p.id === selected;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={cn(
                'panel relative overflow-hidden p-6 text-left transition-colors duration-150',
                active
                  ? 'border-white/25 bg-white/[0.06]'
                  : 'hover:border-white/[0.16] hover:bg-white/[0.04]',
              )}
            >
              <div className="relative flex items-center justify-between">
                <span className="text-[14px] font-medium text-white/85">{p.name}</span>
                <span
                  className={cn(
                    'grid size-[18px] place-items-center rounded-full border transition-colors',
                    active ? 'border-transparent bg-white' : 'border-white/25',
                  )}
                >
                  {active ? <Check className="size-3 text-ink-950" /> : null}
                </span>
              </div>

              <div className="relative mt-4 flex items-baseline gap-1">
                <span className="text-[34px] font-semibold leading-none tracking-tightest text-white">
                  ${p.price}
                </span>
                <span className="text-[13px] text-white/35">{p.cadence}</span>
              </div>

              <p className="relative mt-2 text-[12.5px] text-white/40">{p.tagline}</p>

              {p.badge ? (
                <span className="relative mt-4 inline-block rounded-[4px] border border-white/20 bg-white/[0.07] px-2 py-1 text-[10.5px] font-medium text-white/70">
                  {p.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="panel mt-3 p-6">
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {plan.perks.map((perk) => (
            <li key={perk} className="flex items-start gap-2.5 text-[13.5px] text-white/60">
              <Check className="mt-[3px] size-3.5 shrink-0 text-white/45" />
              {perk}
            </li>
          ))}
        </ul>

        {error ? (
          <p className="mt-5 rounded-[6px] border border-red-400/20 bg-red-400/[0.07] p-3 text-[12.5px] leading-relaxed text-red-200/85">
            {error}
          </p>
        ) : null}

        <Button size="lg" className="mt-6 w-full" onClick={checkout} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Unlock for ${plan.price}
        </Button>
      </div>
    </div>
  );
}
