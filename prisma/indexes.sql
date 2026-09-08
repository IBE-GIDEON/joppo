-- Indexes Prisma's schema language cannot express.
--
-- Applied by scripts/apply-indexes.mjs after `prisma db push`, on every deploy.
-- Every statement is idempotent, so re-running is free.
--
-- Why trigram indexes: search uses ILIKE '%term%'. A leading wildcard makes a
-- btree index useless, so Postgres reads every row. pg_trgm builds an index over
-- three-character sequences, which a substring match can use.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- The four short columns keyword search actually scans.
CREATE INDEX IF NOT EXISTS listing_title_trgm
  ON "Listing" USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS listing_company_name_trgm
  ON "Listing" USING gin ("companyName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS listing_tags_trgm
  ON "Listing" USING gin (tags gin_trgm_ops);

CREATE INDEX IF NOT EXISTS listing_funder_trgm
  ON "Listing" USING gin (funder gin_trgm_ops);

-- Location filtering is a substring match over a JSON array held as text.
CREATE INDEX IF NOT EXISTS listing_locations_trgm
  ON "Listing" USING gin (locations gin_trgm_ops);

-- Deliberately no index on description. It holds up to 6,000 characters per
-- row, a trigram index over it would be larger than the table, and search no
-- longer scans it by default.

-- Sorting and filtering paths. Partial indexes, because every query is scoped
-- to active listings and an index over dead rows is wasted space.
CREATE INDEX IF NOT EXISTS listing_active_posted
  ON "Listing" ("postedAt" DESC) WHERE active = true;

CREATE INDEX IF NOT EXISTS listing_active_category_posted
  ON "Listing" (category, "postedAt" DESC) WHERE active = true;

CREATE INDEX IF NOT EXISTS listing_active_deadline
  ON "Listing" (deadline) WHERE active = true AND deadline IS NOT NULL;

-- Retirement sweeps look up rows by how long ago they were last seen.
CREATE INDEX IF NOT EXISTS listing_fetched_at
  ON "Listing" ("fetchedAt") WHERE active = true;

-- The crawler picks the least recently visited sources on every run.
CREATE INDEX IF NOT EXISTS source_enabled_lastrun
  ON "Source" ("lastRunAt" NULLS FIRST) WHERE enabled = true;
