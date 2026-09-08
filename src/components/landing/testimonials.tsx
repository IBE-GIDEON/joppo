import { cn } from '@/lib/utils';
import { SocialIcon, type Platform } from '@/components/landing/social-icons';

interface Testimonial {
  name: string;
  context: string;
  platform: Platform;
  quote: string;
}

/**
 * DRAFTS AWAITING SIGN-OFF.
 *
 * The names and platforms are yours. The wording is mine, written from the
 * outcomes you described, so treat each line as a draft to send to that person
 * for approval rather than as something they have said. Get a yes from each of
 * the ten, edit the wording to sound like them, and delete any row that does
 * not get one. Reviews attributed to a named person who never gave them are
 * what gets a payment processor to close an account.
 */
const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Daniel',
    context: 'Backend engineer',
    platform: 'instagram',
    quote:
      'Two months of applying and nothing came back. Three days on Joppo and I had an interview with a company I had never heard of. I started there in March.',
  },
  {
    name: 'Steven',
    context: 'Product designer',
    platform: 'reddit',
    quote:
      'Nobody tells you that by the time a role reaches LinkedIn it already has four hundred applicants. I stopped competing and started arriving early.',
  },
  {
    name: 'Celestine',
    context: 'Freelance consultant',
    platform: 'reddit',
    quote:
      'I filtered to remote and contracts only. Found a three month brief on the Tuesday and was invoicing by the following Monday.',
  },
  {
    name: 'Porter',
    context: 'Data analyst',
    platform: 'x',
    quote:
      'Eleven applications in a week, every one on the company’s own site with no middleman. Four replies. That reply rate was unthinkable for me before.',
  },
  {
    name: 'Gideon',
    context: 'Operations lead',
    platform: 'x',
    quote:
      'Got the job in December. They called me back in July for a bigger role on the same team. Both listings came from here.',
  },
  {
    name: 'David',
    context: 'Frontend developer',
    platform: 'bluesky',
    quote:
      'I almost did not bother paying the three dollars. It is the best three dollars I have ever spent on my career.',
  },
  {
    name: 'Emmanuel',
    context: 'Solutions architect',
    platform: 'instagram',
    quote:
      'No recruiter taking a cut, no redirect chain, no dead links. You click apply and you are on the company’s own form. That is the whole product.',
  },
  {
    name: 'Chloe',
    context: 'Founder',
    platform: 'reddit',
    quote:
      'I came looking for a job and left with a grant. I did not know that side of it existed until I saw the filter sitting there.',
  },
  {
    name: 'Emeka',
    context: 'Software engineer',
    platform: 'reddit',
    quote:
      'Lagos to a fully remote United States role. I had been told repeatedly that was not realistic. It took six weeks.',
  },
  {
    name: 'Kesh Martin',
    context: 'Marketing manager',
    platform: 'reddit',
    quote:
      'Sorted by newest, applied within the hour a role went up, heard back the same day. Timing is the entire advantage and this is the only place I get it.',
  },
];

/** Deal the list into n columns so no two columns show the same card. */
function columnsOf(items: Testimonial[], n: number): Testimonial[][] {
  const cols: Testimonial[][] = Array.from({ length: n }, () => []);
  items.forEach((item, i) => cols[i % n].push(item));
  return cols;
}

export function Testimonials() {
  const columns = columnsOf(TESTIMONIALS, 3);

  return (
    <section id="reviews" className="relative overflow-hidden py-24 md:py-28">
      <div className="bloom left-1/2 top-10 h-[22rem] w-[40rem] -translate-x-1/2 bg-iris-600/20" />

      <div className="relative mx-auto max-w-5xl px-5 text-center">
        <p className="eyebrow">From people who landed</p>
        <h2 className="h-section mt-4">Ten offers, and counting.</h2>
        <p className="lede mt-4">
          Every one of them applied on the organisation&apos;s own page, to a listing the
          big boards never showed them.
        </p>
      </div>

      {/* ------------------------------------------------ sideways band */}
      <div className="marquee-hold fade-x relative mt-14 flex overflow-hidden">
        <div
          className="marquee-x flex w-max gap-4 pl-4"
          style={{ '--marquee-duration': '68s' } as React.CSSProperties}
        >
          {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
            <Card key={`x-${i}`} t={t} className="w-[350px] shrink-0 sm:w-[400px]" />
          ))}
        </div>
      </div>

      {/* ------------------------------------------------ upward columns */}
      <div className="relative mx-auto mt-4 grid max-w-6xl gap-4 px-5 sm:grid-cols-2 lg:grid-cols-3">
        {columns.map((col, ci) => (
          <div
            key={ci}
            className={cn(
              'marquee-hold fade-y h-[500px] overflow-hidden',
              ci === 1 && 'hidden sm:block',
              ci === 2 && 'hidden lg:block',
            )}
          >
            <div
              className={cn('marquee-y flex flex-col gap-4', ci === 1 && 'marquee-reverse')}
              style={{ '--marquee-duration': `${42 + ci * 13}s` } as React.CSSProperties}
            >
              {[...col, ...col].map((t, i) => (
                <Card key={`y-${ci}-${i}`} t={t} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Card({ t, className }: { t: Testimonial; className?: string }) {
  return (
    <figure className={cn('panel flex flex-col p-6', className)}>
      <blockquote className="text-[15px] leading-[1.65] text-white/75">
        &ldquo;{t.quote}&rdquo;
      </blockquote>

      <figcaption className="mt-5 flex items-center gap-3 border-t border-white/[0.07] pt-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/[0.10] bg-white/[0.05] text-[12px] font-medium text-white/60">
          {initials(t.name)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] text-white/85">{t.name}</span>
          <span className="block truncate text-[12.5px] text-white/40">{t.context}</span>
        </span>

        <SocialIcon
          platform={t.platform}
          className="size-[15px] shrink-0 text-white/40 transition-colors"
        />
      </figcaption>
    </figure>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
