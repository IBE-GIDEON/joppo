import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PLAN_LIST } from '@/lib/plans';
import { cn } from '@/lib/utils';

export function Pricing() {
  return (
    <section id="pricing" className="relative px-5 py-24 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="eyebrow">Pricing</p>
          <h2 className="h-section mt-4">Priced like a coffee, not a course.</h2>
          <p className="lede mt-4">
            One price, everything unlocked. All five categories, every listing, every
            apply link. Cancel whenever you land.
          </p>
        </div>

        <div className="mt-14 grid gap-3 md:grid-cols-3">
          {PLAN_LIST.map((plan) => {
            const featured = plan.id === 'MONTHLY';
            return (
              <div
                key={plan.id}
                className={cn(
                  'panel panel-hover relative flex flex-col overflow-hidden p-7',
                  featured && 'border-white/[0.22] bg-white/[0.05] md:-my-3 md:py-10',
                )}
              >
                <div className="relative flex items-center justify-between">
                  <h3 className="text-[15px] font-medium text-white/85">{plan.name}</h3>
                  {plan.badge ? (
                    <span
                      className={cn(
                        'rounded-[4px] border px-2 py-1 text-[10.5px] font-medium',
                        featured
                          ? 'border-white/20 bg-white/[0.09] text-white/80'
                          : 'border-white/[0.09] bg-white/[0.04] text-white/45',
                      )}
                    >
                      {plan.badge}
                    </span>
                  ) : null}
                </div>

                <div className="relative mt-6 flex items-baseline gap-1">
                  <span className="text-[44px] font-semibold leading-none tracking-tightest text-white">
                    ${plan.price}
                  </span>
                  <span className="text-[14px] text-white/35">{plan.cadence}</span>
                </div>
                <p className="relative mt-2.5 text-[13px] text-white/40">{plan.tagline}</p>

                <ul className="relative mt-7 flex-1 space-y-3">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2.5 text-[13.5px] text-white/55">
                      <Check
                        className={cn(
                          'mt-[3px] size-3.5 shrink-0',
                          featured ? 'text-white/55' : 'text-white/30',
                        )}
                      />
                      {perk}
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  variant={featured ? 'primary' : 'secondary'}
                  className="relative mt-8 w-full"
                >
                  <Link href={`/login?intent=start&plan=${plan.id}`}>
                    {featured ? 'Start searching' : 'Choose this plan'}
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-[12.5px] text-white/25">
          Paid securely through Paystack. Cards, bank transfer and mobile money accepted.
        </p>
      </div>
    </section>
  );
}
