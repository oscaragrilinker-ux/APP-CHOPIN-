-- =============================================================================
-- 00005_catalogue_schema.sql
-- Schéma catalogue — extensions initiales + archive-guard formats
--
-- Ajouts :
--   • formats.variety_id  (FK optionnelle vers varieties — supprimée en 00008)
--   • formats.description
--   • Fonction check_format_archive + trigger trg_formats_archive_guard
--   • Remplacement des policies "lecture pour tous" (auth.role = authenticated)
--     par des policies "is_active = true OR admin" sur products, varieties, formats
--
-- Tout est idempotent : ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE,
-- DROP POLICY IF EXISTS avant CREATE POLICY, DROP TRIGGER IF EXISTS avant CREATE.
-- =============================================================================

-- ── 1. Colonnes formats ───────────────────────────────────────────────────────

ALTER TABLE public.formats
  ADD COLUMN IF NOT EXISTS variety_id  uuid REFERENCES public.varieties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description text;

-- ── 2. Fonction archive-guard ─────────────────────────────────────────────────
-- Empêche d'archiver un format utilisé par des commandes actives.

CREATE OR REPLACE FUNCTION public.check_format_archive()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Déclenché uniquement lors d'un archivage (true → false)
  IF OLD.is_active = true AND NEW.is_active = false THEN
    SELECT COUNT(*) INTO v_count
    FROM public.orders
    WHERE format_id = OLD.id
      AND status IN ('in_preparation', 'ready');

    IF v_count > 0 THEN
      RAISE EXCEPTION
        'Impossible d''archiver ce format : il est lié à % commande(s) active(s) (en préparation ou prête). Clôturez ou annulez ces commandes avant d''archiver.',
        v_count;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 3. Trigger archive-guard ──────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_formats_archive_guard ON public.formats;
CREATE TRIGGER trg_formats_archive_guard
  BEFORE UPDATE ON public.formats
  FOR EACH ROW EXECUTE FUNCTION public.check_format_archive();

-- ── 4. Policies catalogue — remplacement is_active OR admin ──────────────────
-- 00004 avait créé des policies "lecture pour tous" sans filtre is_active.
-- On les remplace par des policies qui cachent les éléments archivés aux non-admins.

-- products
DROP POLICY IF EXISTS "products: lecture pour tous" ON public.products;
DROP POLICY IF EXISTS "products: lecture"            ON public.products;
CREATE POLICY "products: lecture"
  ON public.products FOR SELECT
  USING (
    is_active = true
    OR get_user_role() = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
  );

-- varieties
DROP POLICY IF EXISTS "varieties: lecture pour tous" ON public.varieties;
DROP POLICY IF EXISTS "varieties: lecture"            ON public.varieties;
CREATE POLICY "varieties: lecture"
  ON public.varieties FOR SELECT
  USING (
    is_active = true
    OR get_user_role() = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
  );

-- formats
DROP POLICY IF EXISTS "formats: lecture pour tous" ON public.formats;
DROP POLICY IF EXISTS "formats: lecture"            ON public.formats;
CREATE POLICY "formats: lecture"
  ON public.formats FOR SELECT
  USING (
    is_active = true
    OR get_user_role() = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
  );
