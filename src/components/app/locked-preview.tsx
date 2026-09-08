import { Lock } from 'lucide-react';
import { CATEGORY_META, type Category } from '@/lib/types';
import { timeAgo } from '@/lib/utils';

export interface TeaserItem {
  id: string;
  title: string;
  category: Category;
  locations: string[];
  remote: boolean;
  workArrangement: string | null;
  postedAt: string;
}

/**
 * Real matching rows with the employer withheld. The company name and the
 * apply link are never queried for an unsubscribed viewer, so there is nothing
 * hidden in the markup to recover.
 */
export function LockedPreview({ items }: { items: TeaserItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="panel relative mt-12 overflow-hidden">
      <div className="divide-y divide-white/[0.06]">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3.5 px-4 py-3.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-[4px] border border-white/[0.10] bg-white/[0.03]">
              <Lock className="size-3 text-white/35" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] text-white/85">{item.title}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="redacted inline-block h-2.5 w-24" />
                <span className="text-[11.5px] text-white/30">
                  {item.remote
                    ? 'Remote'
                    : item.locations[0]?.split(',')[0] || item.workArrangement || 'On-site'}
                </span>
              </div>
            </div>

            <span className="hidden shrink-0 text-[10px] uppercase tracking-[0.13em] text-white/30 sm:inline-block">
              {CATEGORY_META[item.category].short}
            </span>
            <span className="tabular-nums shrink-0 text-[11px] text-white/25">
              {timeAgo(item.postedAt)}
            </span>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink-950 to-transparent" />
    </div>
  );
}
