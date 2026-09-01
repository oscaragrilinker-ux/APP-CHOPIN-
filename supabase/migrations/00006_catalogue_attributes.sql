-- =============================================================================
-- 00006_catalogue_attributes.sql
-- Attributs étendus du catalogue produits / variétés / formats
--
-- Ajouts :
--   • products  : image_url, season
--   • varieties : caliber, quality_grade
--   • formats   : packaging_type, material, dimensions, sku
--   • Index unique partiel formats_sku_unique (WHERE sku IS NOT NULL)
--
-- Tout est idempotent : ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS.
-- =============================================================================

-- ── 1. products ───────────────────────────────────────────────────────────────

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS season    text;

-- ── 2. varieties ──────────────────────────────────────────────────────────────

ALTER TABLE public.varieties
  ADD COLUMN IF NOT EXISTS caliber       text,
  ADD COLUMN IF NOT EXISTS quality_grade text;

-- ── 3. formats ────────────────────────────────────────────────────────────────

ALTER TABLE public.formats
  ADD COLUMN IF NOT EXISTS packaging_type text,
  ADD COLUMN IF NOT EXISTS material       text,
  ADD COLUMN IF NOT EXISTS dimensions     text,
  ADD COLUMN IF NOT EXISTS sku            text;

-- ── 4. Index unique partiel sur formats.sku ───────────────────────────────────
-- Permet plusieurs formats sans SKU (NULL) tout en garantissant l'unicité
-- des SKUs non-NULL.

CREATE UNIQUE INDEX IF NOT EXISTS formats_sku_unique
  ON public.formats (sku)
  WHERE sku IS NOT NULL;
