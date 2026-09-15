ALTER TABLE public.portfolios
ADD COLUMN IF NOT EXISTS thumbnail_public_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'portfolios_thumbnail_public_id_key'
      AND conrelid = 'public.portfolios'::regclass
  ) THEN
    ALTER TABLE public.portfolios
    ADD CONSTRAINT portfolios_thumbnail_public_id_key UNIQUE (thumbnail_public_id);
  END IF;
END
$$;
