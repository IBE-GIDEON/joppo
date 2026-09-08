import { Briefcase, Landmark, Handshake, TrendingUp, FileText } from 'lucide-react';
import { CATEGORY_META, CATEGORIES, type Category } from '@/lib/types';

const ICONS: Record<Category, React.ComponentType<{ className?: string }>> = {
  JOB: Briefcase,
  GRANT: Landmark,
  PARTNERSHIP: Handshake,
  INVESTMENT: TrendingUp,
  CONTRACT: FileText,
};

export function Categories({ counts }: { counts: Partial<Record<Category, number>> }) {
  return (
    <section id="categories" className="relative px-5 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="eyebrow">Five markets, one search</p>
          <h2 className="h-section mt-4">Opportunity is not just a job.</h2>
          <p className="lede mt-4">
            The same crawler that reads a career page reads a tender portal and a
            partner page. Joppo indexes all of it and puts it behind one search box.
          </p>
        </div>

        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c, i) => {
            const meta = CATEGORY_META[c];
            const Icon = ICONS[c];
            const count = counts[c] ?? 0;
            return (
              <div
                key={c}
                className={`panel panel-hover group relative overflow-hidden p-6 ${
                  i === 0 ? 'lg:col-span-2' : ''
                }`}
              >
                <div className="relative flex items-start justify-between gap-4">
                  <div className="grid size-9 place-items-center rounded-[5px] border border-white/[0.10] bg-white/[0.03] text-white/55">
                    <Icon className="size-[17px]" />
                  </div>
                  <span className="tabular-nums rounded-[4px] border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] text-white/40">
                    {count.toLocaleString()}
                  </span>
                </div>
                <h3 className="relative mt-5 text-[17px] font-semibold tracking-tight text-white">
                  {meta.label}
                </h3>
                <p className="relative mt-2 max-w-sm text-[13.5px] leading-relaxed text-white/40">
                  {meta.blurb}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
