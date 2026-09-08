import { Radar, Link2, BellRing, ShieldOff, Clock, Globe2 } from 'lucide-react';

const SOURCES = [
  'Greenhouse',
  'Lever',
  'Ashby',
  'Workable',
  'SmartRecruiters',
  'Recruitee',
  'Grants.gov',
  'JSON-LD',
];

const CARDS = [
  {
    icon: ShieldOff,
    title: 'No ghost listings.',
    body: 'A listing that disappears from the source disappears here on the next pass.',
  },
  {
    icon: Clock,
    title: 'Fresh within the hour.',
    body: 'Continuous ingestion, sorted newest first, so you are early instead of two hundredth.',
  },
  {
    icon: Globe2,
    title: 'Wherever you are.',
    body: 'Remote-first filtering on real location data, not a guess from the title.',
  },
];

export function How() {
  return (
    <section id="how" className="relative px-5 py-24 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="eyebrow">Straight from the source</p>
          <h2 className="h-section mt-4">No middlemen in the chain.</h2>
          <p className="lede mt-4">
            Every listing on Joppo was read off the organisation&apos;s own page and links
            back to it. Nothing is resold, rewritten, or scraped from another board.
          </p>
        </div>

        <div className="mt-14 grid gap-3 lg:grid-cols-3">
          <div className="panel panel-hover relative col-span-full overflow-hidden p-7 lg:col-span-2">
            <div className="bloom -left-16 -top-20 h-56 w-72 bg-iris-600/40" />
            <div className="relative">
              <Radar className="size-5 text-iris-300" />
              <h3 className="mt-4 text-[19px] font-semibold tracking-tight text-white">
                We crawl the source, not the middleman.
              </h3>
              <p className="mt-2.5 max-w-lg text-[14px] leading-relaxed text-white/45">
                Joppo reads applicant tracking systems, government tender portals and
                partner pages on a rolling schedule. A role posted on a company site at
                nine in the morning is searchable here before it is syndicated anywhere.
              </p>
            </div>

            <div className="relative mt-7 flex flex-wrap gap-2">
              {SOURCES.map((s) => (
                <span
                  key={s}
                  className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] text-white/45"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="panel panel-hover p-7">
            <Link2 className="size-5 text-iris-300" />
            <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-white">
              One click to the real form.
            </h3>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-white/45">
              Apply goes to the organisation&apos;s own application page. No redirect
              chain, no third-party account, no recruiter taking a cut.
            </p>
          </div>

          {CARDS.map((f) => (
            <div key={f.title} className="panel panel-hover p-7">
              <f.icon className="size-5 text-iris-300" />
              <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-white">
                {f.title}
              </h3>
              <p className="mt-2.5 text-[13.5px] leading-relaxed text-white/45">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="panel relative mt-3 overflow-hidden p-9 text-center">
          <div className="bloom left-1/2 top-0 h-40 w-96 -translate-x-1/2 bg-iris-500/30" />
          <div className="relative">
            <BellRing className="mx-auto size-5 text-iris-300" />
            <h3 className="mt-4 text-[19px] font-semibold tracking-tight text-white">
              Tell it once. It keeps looking.
            </h3>
            <p className="lede mt-2.5">
              Save a search and Joppo runs it against every new listing, then sends you
              only the matches. Grant and tender deadlines arrive with a countdown.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
