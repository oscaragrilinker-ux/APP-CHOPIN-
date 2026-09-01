-- =============================================================================
-- 00011_offers_constraints.sql
-- Correctifs structurels moteur de négociation (étape 4)
--
-- Changements :
--   • Enum price_basis  : per_tonne | per_container | total
--   • offers.price_basis : base de prix constante sur toute la négociation
--   • offers.variety_id  : NOT NULL (était nullable)
--   • offers.format_id   : NOT NULL (était nullable)
--   • offer_rounds       : UNIQUE (offer_id, round_number)
--
-- Idempotent : DO/EXCEPTION sur l'enum, ADD COLUMN IF NOT EXISTS,
-- SET NOT NULL précédé d'un garde NULL, CREATE UNIQUE INDEX IF NOT EXISTS.
-- =============================================================================

-- ── 1. Enum price_basis ───────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.price_basis AS ENUM ('per_tonne', 'per_container', 'total');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. offers.price_basis ─────────────────────────────────────────────────────
-- Le DEFAULT transitoire sécurise l'ADD COLUMN sur d'éventuelles lignes
-- existantes, puis est immédiatement supprimé : l'app fournit toujours
-- price_basis explicitement ; un INSERT sans la colonne doit échouer.

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS price_basis public.price_basis NOT NULL DEFAULT 'per_tonne';

ALTER TABLE public.offers
  ALTER COLUMN price_basis DROP DEFAULT;

-- ── 3. offers.variety_id / format_id → NOT NULL ───────────────────────────────
-- Garde préventif : avorte avec message explicite si des NULL existent.
-- Base vierge attendue — ce bloc sert de filet pour un replay sur données réelles.

DO $$
DECLARE
  v_null_count integer;
BEGIN
  SELECT COUNT(*) INTO v_null_count
  FROM public.offers
  WHERE variety_id IS NULL OR format_id IS NULL;

  IF v_null_count > 0 THEN
    RAISE EXCEPTION
      'Migration 00011 annulée : % ligne(s) avec variety_id ou format_id NULL '
      'dans la table offers. Corrigez ces lignes avant de relancer.',
      v_null_count;
  END IF;
END $$;

ALTER TABLE public.offers
  ALTER COLUMN variety_id SET NOT NULL,
  ALTER COLUMN format_id  SET NOT NULL;

-- ── 4. Unicité (offer_id, round_number) sur offer_rounds ─────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS offer_rounds_offer_id_round_number_unique
  ON public.offer_rounds (offer_id, round_number);
