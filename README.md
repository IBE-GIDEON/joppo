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

## Moving to Postgres

Change the provider in `prisma/schema.prisma` to `postgresql`, point `DATABASE_URL` at
the database, and run `npx prisma db push`. No application code changes.

Do this before deploying to a serverless host. SQLite on a serverless filesystem will
not survive.

Array fields (`locations`, `tags`, `roles`, `categories`) are stored as JSON text so the
same schema works on both engines. `toList` and `fromList` in `src/lib/utils.ts` handle
the conversion.
