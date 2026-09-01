-- =============================================================================
-- 00010_drop_listings.sql
-- Suppression de la vitrine listings.
-- Le catalogue produits/variétés devient la vitrine client :
--   is_active = true  → "en service" (visible clients)
--   is_active = false → "catalogue interne" (réactivable sans ressaisie)
--
-- CASCADE pour robustesse (vérif FK confirmée : rien d'autre ne référence ces tables).
-- Triggers (trg_listings_updated_at) et policies RLS → droppés automatiquement.
-- set_updated_at() est partagée → ne pas toucher.
-- =============================================================================

DROP TABLE IF EXISTS public.listing_formats CASCADE;
DROP TABLE IF EXISTS public.listings CASCADE;
