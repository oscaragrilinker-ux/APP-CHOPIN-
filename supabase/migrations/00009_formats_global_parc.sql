-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 00009 — Parc de formats global + table variety_formats
--
-- Décision métier finale : formats = bibliothèque autonome de l'usine.
-- On retire formats.product_id (introduit par 00008). On crée la liaison
-- variety_formats (variété ↔ formats cochés par l'admin).
-- ON DELETE CASCADE des deux côtés : supprimer un format ou une variété
-- nettoie automatiquement les liaisons.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Supprimer l'index et la colonne product_id introduits par 00008
--    (le seul format existant a product_id = NULL — aucune perte de données)
DROP INDEX IF EXISTS public.idx_formats_product_id;

ALTER TABLE public.formats
  DROP COLUMN IF EXISTS product_id;

-- 2. Table de liaison variety_formats
--    Pas d'UPDATE policy — resync = DELETE + INSERT (pattern identique à listing_formats)
CREATE TABLE public.variety_formats (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variety_id  uuid NOT NULL REFERENCES public.varieties(id) ON DELETE CASCADE,
  format_id   uuid NOT NULL REFERENCES public.formats(id)  ON DELETE CASCADE,
  UNIQUE (variety_id, format_id)
);

-- 3. RLS variety_formats
ALTER TABLE public.variety_formats ENABLE ROW LEVEL SECURITY;

-- SELECT : variété active OU admin/super_admin (standard projet)
CREATE POLICY "variety_formats: lecture si variété visible"
  ON public.variety_formats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.varieties v
      WHERE v.id = variety_id
        AND (
          v.is_active = true
          OR get_user_role() = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
        )
    )
  );

-- INSERT : admin et super_admin uniquement
CREATE POLICY "variety_formats: insertion admin"
  ON public.variety_formats FOR INSERT
  TO authenticated
  WITH CHECK ( get_user_role() = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]) );

-- DELETE : admin et super_admin uniquement
CREATE POLICY "variety_formats: suppression admin"
  ON public.variety_formats FOR DELETE
  TO authenticated
  USING ( get_user_role() = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]) );

-- 4. Index de performance
CREATE INDEX idx_variety_formats_variety_id ON public.variety_formats(variety_id);
CREATE INDEX idx_variety_formats_format_id  ON public.variety_formats(format_id);

-- 5. Aucune migration de données possible :
--    variety_id avait été supprimé par 00008 sans liaison récupérable,
--    0 listing_formats existants → variety_formats démarre vide.
