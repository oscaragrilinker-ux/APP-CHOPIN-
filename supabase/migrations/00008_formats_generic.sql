-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 00008 — Formats génériques
--
-- Décision métier : un contenant (carton, bigbag, sac…) est réutilisable
-- pour toutes les variétés. On casse le lien formats.variety_id et on ajoute
-- formats.product_id (nullable) pour regrouper par produit si besoin.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ajouter product_id avant de migrer les données existantes
ALTER TABLE public.formats
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

-- 2. Migrer les données : récupérer le product_id de la variété parente
UPDATE public.formats f
SET product_id = v.product_id
FROM public.varieties v
WHERE f.variety_id = v.id
  AND f.product_id IS NULL;

-- 3. Supprimer variety_id devenu obsolète
ALTER TABLE public.formats
  DROP COLUMN IF EXISTS variety_id;

-- 4. Index de performance pour les listes par produit
CREATE INDEX IF NOT EXISTS idx_formats_product_id ON public.formats(product_id);
