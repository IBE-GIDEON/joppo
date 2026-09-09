# Joppo

A search engine for opportunities that never reach the big job boards. Joppo reads
company career pages, government funding portals and partner pages directly, then links
you to the original page so you apply at the source.

Five categories, one search: **Jobs**, **Grants & tenders**, **Partnerships**,
**Investment**, **Contracts**.

There is no free tier. Sign in, answer the onboarding questions, see how many real
matches you have, then pay to open them.

---

## Running it

```bash
npm install
npx prisma db push      # creates prisma/dev.db
npm run seed            # loads the source list and crawls it (about 4 minutes)
npm run dev             # http://localhost:3100
```

The app runs on port **3100** because port 3000 was already taken on this machine.
Change it in `package.json` and in `NEXTAUTH_URL` if you want a different one.

### "EADDRINUSE: address already in use :::3100"

An earlier `next dev` is still holding the port. Closing the terminal does not always
kill it. From PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 3100 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

Then `npm run dev` again.

### Signing in locally

With no mail server configured, the magic link is **printed to the terminal running
`npm run dev`**. Copy it from there and paste it into the browser. Nothing else is
needed to sign in.

### Paying locally

`BILLING_DEV_BYPASS="1"` in `.env` lets checkout succeed without a Paystack account, so
the whole funnel can be walked end to end. The bypass turns itself off automatically as
soon as `PAYSTACK_SECRET_KEY` is set.

---

## Configuration

Everything lives in `.env`. See `.env.example` for the full list.

| Variable | What it does |
| --- | --- |
| `DATABASE_URL` | SQLite file by default |
| `NEXTAUTH_SECRET` | Required. Generate with `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Turns on the Google sign-in button |
| `EMAIL_SERVER` | SMTP connection string. Blank prints the link to the terminal |
| `PAYSTACK_SECRET_KEY` | Turns on real checkout |
| `PAYSTACK_CURRENCY` | `USD` by default |
| `BILLING_DEV_BYPASS` | `1` to skip payment locally |
| `CRON_SECRET` | Required for the hourly crawl endpoint to run at all |
| `INGEST_BATCH` | Sources crawled per hourly run, default 10 |

### Google sign-in

Create an OAuth client at console.cloud.google.com, type Web application, with this
authorised redirect URI:

```
http://localhost:3100/api/auth/callback/google
```

### Paystack

Register the webhook in the Paystack dashboard so subscriptions activate even if the
customer closes the tab during redirect:

```
https://your-domain/api/paystack/webhook
```

The webhook signature is verified as an HMAC-SHA512 of the raw request body. Activation
is idempotent, so the webhook and the browser redirect can both run for one payment
without granting two periods.

Note on currency: Paystack settles to a Nigerian, Ghanaian, South African or Kenyan
account. Prices are configured in USD; confirm USD is enabled on your Paystack account
before launch, or switch `PAYSTACK_CURRENCY` and the numbers in `src/lib/plans.ts`.

---

## Pricing

Defined in one place, `src/lib/plans.ts`.

| Plan | Price | Length |
| --- | --- | --- |
| Week pass | $3 | 7 days |
| Monthly | $10 | 30 days |
| Yearly | $40 | 365 days |

Renewing early stacks onto the time you have left rather than overwriting it.

**These are one-off charges, not subscriptions.** Paystack takes a single
payment and access expires at the end of the period. Nothing re-bills, which is
why "no auto-renew" is on the pricing page. It also means no recurring revenue:
every customer has to come back and pay again deliberately.

Every perk listed on the pricing page is implemented. If you add one to
`plans.ts`, build it first.

---

## Where the listings come from

Every adapter hits a public endpoint that the organisation's own careers page already
calls. No keys, no HTML scraping of rendered pages, no reselling another board's feed.

| Source | Category | Status |
| --- | --- | --- |
| Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee | Jobs, Contracts | Live |
| Grants.gov search API | Grants & tenders | Live |
| schema.org `JobPosting` reader (`jsonld`) | Any | Live, point it at any career page |
| Local file (`curated`) | Partnerships, Investment | Seeded, see below |

A listing found on a career page whose employment type is a contract is filed under
**Contracts**, not Jobs. The category on the source is a default, not the last word.

**Partnerships and Investment have no public API anywhere.** They currently load from
`src/scrapers/data/partnerships.json` and `investment.json`, which hold real, verified
programmes with real links. Replace or extend those files, or add per-site crawlers, to
grow those two categories. This is the honest state of them today.

### Adding a company

One line in `src/scrapers/sources.ts`. The token is the identifier in the company's own
careers URL, for example `boards.greenhouse.io/<token>` or `jobs.ashbyhq.com/<token>`.

```ts
{ kind: 'greenhouse', token: 'notion', label: 'Notion', category: 'JOB' },
```

Then re-run `npm run seed`. Upserts are keyed on `(source, externalId)`, so re-running
never duplicates.

### Keeping the catalogue fresh (automatic)

`/api/cron/ingest` runs the same engine on a schedule with no attention from
you. `vercel.json` already schedules it hourly at 17 minutes past.

Each run takes the **least recently crawled** sources first and stops on either
the batch size or a time budget, so no single invocation runs long enough to hit
a serverless timeout. With 37 sources at 10 per run the whole list refreshes
roughly every four hours. Raise `INGEST_BATCH` as the source list grows.

Every run also retires listings not seen in 7 days, so dead postings disappear
on their own.

Set `CRON_SECRET` as a project environment variable. Vercel sends it as a bearer
token automatically. Without it the endpoint returns 503 and refuses to run.

Not on Vercel? Any scheduler works, because the endpoint also accepts the secret
as a query parameter:

```bash
curl "https://your-domain/api/cron/ingest?token=$CRON_SECRET"
```

**Vercel's Hobby plan allows a cron job to fire only once a day**, which is why
`vercel.json` is set to a daily 04:00 run. That alone is not enough for a
catalogue the pricing page says refreshes hourly, so the hourly work is done by
GitHub instead and the Vercel job stays as a daily safety net.

`.github/workflows/crawl.yml` calls the same endpoint every hour, free, with no
frequency cap. Add two repository secrets under Settings, Secrets and variables,
Actions:

- `JOPPO_URL` — your domain, for example `https://joppo.vercel.app`
- `CRON_SECRET` — the same value you set in Vercel

The workflow fails visibly in the Actions tab if a crawl breaks, and you can
trigger one by hand from there.

GitHub disables scheduled workflows on repositories with no pushes for 60 days.
If you would rather have one system doing everything, Vercel Pro lifts the cron
limit and you can delete the workflow and set `vercel.json` back to `17 * * * *`.

### Crawl commands

```bash
npm run seed                        # upsert source list, then crawl everything
npm run ingest                      # crawl every enabled source
npm run ingest -- --only=GRANT      # one category
npm run ingest -- --kind=greenhouse # one platform
npm run ingest -- --stale=14        # also retire listings not seen in 14 days
```

Run `npm run ingest -- --stale=7` on a schedule in production so dead listings disappear.

---

## How the paywall works

This is the part most competitors get wrong. A blur-only paywall still ships the real
company name and apply URL in the JSON, so anyone can read it out of the network tab.

In Joppo the **select list itself changes**. For a caller without an active
subscription, `runSearch` in `src/lib/search.ts` never asks the database for the
description, the apply URL or the company relation. There is nothing in the response to
un-blur.

Verified against the running app: an unsubscribed request returns `applyUrl: null`,
`company.name: null`, `company.slug: null` and an empty excerpt.

One honest caveat: titles are shown, and some employers put their own name in the job
title. That leaks for those specific rows and is unavoidable while showing titles at all.

---

## Layout

```
prisma/schema.prisma        one Listing table for all five categories
src/app/                    landing, login, onboarding, unlock, search
src/app/api/                auth, search, onboarding, paystack (init/callback/webhook)
src/lib/search.ts           query builder, DTO shaping, the paywall
src/lib/entitlement.ts      who may see what, and where they belong in the funnel
src/lib/plans.ts            pricing
src/scrapers/               adapters, source list, runner
src/components/landing/     marketing page
src/components/app/         onboarding wizard, plan picker, search UI
```

### Filter scoping

Seniority, employment type, workplace and salary describe a role. A grant call has none
of them. Those filters are scoped so they narrow Jobs and Contracts without deleting the
other three categories from the results. See `roleScoped` in `src/lib/search.ts`.

---

## Dependencies and security

`npm audit` reports **0 vulnerabilities**. Getting there needed three things beyond a
plain install, so do not undo them casually:

- **Next 15, not 14.** Every Next.js advisory in the 14 line is fixed only in 15.5.21 or
  later. There is no patched 14.x.
- **`overrides` in `package.json`.** `next-auth` pins `nodemailer ^7` as a peer, and
  `next` bundles an old `postcss` internally. Both are forced to patched versions.
  Joppo supplies its own `sendVerificationRequest`, so `next-auth` never calls
  `nodemailer` itself and the override is safe.
- **No `remotePatterns` in `next.config.mjs`.** A wildcard entry there is the exact
  configuration the Image Optimizer denial-of-service advisory targets. The app does not
  use `next/image`. If you add company logos later, list specific hosts rather than
  reinstating the wildcard.

Run `npm audit` after any dependency change and keep it at zero.

## Deploying to Cloudflare Workers

Vercel's Hobby plan bans commercial use in so many words: "restricted to
non-commercial personal use only", explicitly naming "any method of requesting
or processing payment". Taking money there requires Pro. Cloudflare has no such
clause, so this is the host to use once payments are live.

```bash
npx wrangler login          # once
npm run db:deploy           # create tables and indexes, once per database
npm run cf:deploy           # build and ship
```

Set the same environment variables as secrets, which are encrypted and never
appear in the dashboard or the repo:

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put DIRECT_URL
npx wrangler secret put NEXTAUTH_URL
npx wrangler secret put NEXTAUTH_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put PAYSTACK_SECRET_KEY
npx wrangler secret put CRON_SECRET
```

`npm run cf:preview` runs the real Worker locally first, which is worth doing
before every deploy.

### Two things that are different on Workers

**Prisma cannot use its native engine.** Workers run in V8 isolates with no
filesystem, so the query engine binary cannot load. `src/lib/db.ts` detects the
runtime and swaps in a JavaScript Postgres driver through Prisma's driver
adapter. Nothing else in the app changes, and Node hosts still use the fast
native path.

**The free plan allows 10ms of CPU per request.** Server rendering a page and
querying the database will exceed that on the heavier routes. The Workers Paid
plan lifts it to 30 seconds and costs $5 a month, a quarter of Vercel Pro. Do
not launch paid traffic on the free tier expecting it to hold.

Cloudflare cron has no frequency cap, so `wrangler.jsonc` schedules the crawl
hourly directly and the GitHub Actions workaround becomes unnecessary.

## Deploying to a container

`Dockerfile` builds a standalone image that runs on Cloud Run, Fly.io, Koyeb or
any VPS. Prisma keeps its native engine there, so nothing is swapped out. The
entrypoint applies schema changes on start; set `SKIP_DB_SETUP=1` to disable
that.

## Deploying to Vercel

**`.env` is gitignored and never reaches Vercel.** Every variable has to be set
again in Project Settings, Environment Variables. Set all of these:

| Variable | Production value |
| --- | --- |
| `DATABASE_URL` | Supabase transaction pooler, port 6543 |
| `DIRECT_URL` | Supabase direct or session pooler, port 5432 |
| `NEXTAUTH_URL` | **Your real domain**, not localhost |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From Google Cloud console |
| `EMAIL_SERVER` / `EMAIL_FROM` | SMTP connection string and sender |
| `PAYSTACK_SECRET_KEY` | Live key |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Live public key |
| `PAYSTACK_CURRENCY` | `USD` |
| `CRON_SECRET` | Any long random string |
| `INGEST_BATCH` | `10` |

**Do not set `BILLING_DEV_BYPASS` in production.** It disarms itself once a
Paystack key exists, but leaving it out entirely is one less thing to get wrong.

Two things that must be updated outside Vercel once you have a domain:

- **Google OAuth redirect URI** must include `https://your-domain/api/auth/callback/google`.
- **Paystack webhook URL** must be set to `https://your-domain/api/paystack/webhook`.

The build command is already `prisma generate && next build`, which Vercel needs
in order to produce a client for its own Linux runtime.

## Moving to Supabase

Supabase is Postgres, so it drops in cleanly. Use it **for the database only**.
Do not migrate to Supabase Auth: NextAuth with the Prisma adapter already
handles Google and magic links, and swapping it would mean rewriting sign-in,
sessions and the entitlement checks for no gain.

**1. Get both connection strings.** In the Supabase dashboard under Project
Settings, Database, copy:

- the **Transaction pooler** string on port `6543` → `DATABASE_URL`
- the **Session pooler** string on port `5432` → `DIRECT_URL`

Both are on the `pooler.supabase.com` host. Two reasons:

- Serverless functions open a connection per invocation and would exhaust a
  direct Postgres connection limit, so queries go through the transaction
  pooler.
- Schema changes cannot run through a *transaction* pooler, so migrations need
  the session pooler.

**Do not use the "Direct connection" string** that points at
`db.<ref>.supabase.co`. Supabase made it IPv6-only on the free plan and Vercel's
build machines are IPv4, so the hostname does not resolve there and the build
fails at `prisma db push`. The session pooler is the IPv4 equivalent.

**2. Set them in `.env`:**

```bash
DATABASE_URL="postgresql://...pooler...:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://...direct...:5432/postgres"
```

**3. Change three lines in `prisma/schema.prisma`:**

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

**4. Create the tables and refill the catalogue:**

```bash
npx prisma db push
npm run seed
```

The old SQLite file is not migrated. Re-seeding rebuilds the catalogue from the
live sources in about four minutes, which is cleaner than moving stale rows.
Accounts and payments do not carry over, so do this before you have real users.

### Two things that would otherwise bite

**Case-sensitive search.** SQLite matches `contains` case-insensitively;
Postgres does not. Without handling, searching "engineer" would stop matching
"Engineer" the moment you switched. `like()` in `src/lib/search.ts` detects the
provider from the connection string and adds `mode: 'insensitive'` on Postgres
only, because Prisma rejects that option on SQLite. Both providers behave the
same now. Route any new string filter through that helper rather than calling
`contains` directly.

**Free-tier pausing.** Supabase pauses a free project after about a week of
inactivity, which would take the site down. The hourly crawl keeps the database
active, so this only matters if you disable the cron.

## Moving to Postgres generally

Change the provider in `prisma/schema.prisma` to `postgresql`, point `DATABASE_URL` at
the database, and run `npx prisma db push`. No application code changes.

Do this before deploying to a serverless host. SQLite on a serverless filesystem will
not survive.

Array fields (`locations`, `tags`, `roles`, `categories`) are stored as JSON text so the
same schema works on both engines. `toList` and `fromList` in `src/lib/utils.ts` handle
the conversion.
