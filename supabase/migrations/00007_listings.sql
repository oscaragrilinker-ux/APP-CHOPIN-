-- =============================================================================
-- 00007_listings.sql
-- Vitrine publique Chopin (étape 3).
-- NE TOUCHE PAS à : offers, offer_rounds, offer_status, offer_round_role,
-- notify_admins_on_new_offer, snapshot_order_from_offer, leurs triggers.
-- =============================================================================

-- ─── 1. Table listings ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.listings (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id  uuid        NOT NULL REFERENCES public.products(id),
  variety_id  uuid                 REFERENCES public.varieties(id),
  title       text,
  description text,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. Table listing_formats (many-to-many contenants) ──────────────────────

CREATE TABLE IF NOT EXISTS public.listing_formats (
  id          uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id  uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  format_id   uuid NOT NULL REFERENCES public.formats(id),
  UNIQUE (listing_id, format_id)
);

-- ─── 3. Trigger updated_at — réutilise public.set_updated_at() existante ─────

DROP TRIGGER IF EXISTS trg_listings_updated_at ON public.listings;
CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 4. RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE public.listings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_formats ENABLE ROW LEVEL SECURITY;

-- listings : SELECT
-- Tout authentifié voit les actives ; admin/super_admin voient aussi les inactives.
CREATE POLICY "listings: lecture authentifiée"
  ON public.listings FOR SELECT
  USING (
    is_active = true
    OR get_user_role() = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
  );

-- listings : INSERT
CREATE POLICY "listings: création admin"
  ON public.listings FOR INSERT
  WITH CHECK (
    get_user_role() = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
  );

-- listings : UPDATE
CREATE POLICY "listings: modification admin"
  ON public.listings FOR UPDATE
  USING     (get_user_role() = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]));

-- listings : pas de DELETE (soft-delete via is_active)

-- listing_formats : SELECT (hérite de la visibilité du listing parent)
CREATE POLICY "listing_formats: lecture si listing visible"
  ON public.listing_formats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id
        AND (
          l.is_active = true
          OR get_user_role() = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
        )
    )
  );

-- listing_formats : INSERT
CREATE POLICY "listing_formats: gestion admin"
  ON public.listing_formats FOR INSERT
  WITH CHECK (
    get_user_role() = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
  );

-- listing_formats : DELETE (suppression d'un contenant d'une offre)
CREATE POLICY "listing_formats: suppression admin"
  ON public.listing_formats FOR DELETE
  USING (
    get_user_role() = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
  );
