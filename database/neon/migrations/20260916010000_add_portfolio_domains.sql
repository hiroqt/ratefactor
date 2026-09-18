-- Portfolio Domains: a second, independent classification describing a
-- portfolio's visual/interaction/technical experience (e.g. "Three.js",
-- "GSAP"), separate from the existing `category` and `tech_stack` columns.
-- Existing rows have no domain classification and get an empty array —
-- deliberately not inferred/backfilled from category, tech_stack, or
-- anything else.
ALTER TABLE public.portfolios
ADD COLUMN IF NOT EXISTS domains text[] NOT NULL DEFAULT '{}'::text[];

-- GIN index to serve the array-containment filter used by
-- GET /api/portfolios?domain=... (`domains @> ARRAY[$1]`).
CREATE INDEX IF NOT EXISTS idx_portfolios_domains ON public.portfolios USING gin (domains);
