-- Migration 00016 — Table bons_de_commande + création automatique à l'acceptation
--
-- Architecture :
--   - Un BC est créé automatiquement par le trigger trg_orders_create_bc
--     à chaque INSERT dans orders (i.e. à chaque acceptation d'offre).
--   - bc_number : identité auto-incrémentée (GENERATED ALWAYS AS IDENTITY),
--     numéro métier visible sur le PDF.
--   - order_id UNIQUE : un seul BC par commande.
--   - Aucune policy INSERT : seul le trigger (SECURITY DEFINER) peut créer des BCs.
--     Les admins peuvent régénérer via la route PDF (lecture seule).

-- ── 1. Table ─────────────────────────────────────────────────────────────────

CREATE TABLE public.bons_de_commande (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  bc_number    integer     GENERATED ALWAYS AS IDENTITY UNIQUE,
  order_id     uuid        NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  bc_date      date        NOT NULL DEFAULT CURRENT_DATE,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ── 2. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.bons_de_commande ENABLE ROW LEVEL SECURITY;

-- Admin/secrétaire/super_admin : tout voir
CREATE POLICY "bc: admin peut tout voir"
  ON public.bons_de_commande FOR SELECT
  USING (public.get_user_role() IN ('admin', 'secretaire', 'super_admin'));

-- client_pro : ses propres BCs uniquement (via company de la commande)
CREATE POLICY "bc: client voit ses propres BC"
  ON public.bons_de_commande FOR SELECT
  USING (
    public.get_user_role() = 'client_pro'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = bons_de_commande.order_id
        AND o.company_id = ANY(public.get_user_company_ids())
    )
  );

-- conditionnement : peut voir tous les BCs (le PDF route supprime les prix côté applicatif)
CREATE POLICY "bc: conditionnement peut voir"
  ON public.bons_de_commande FOR SELECT
  USING (public.get_user_role() = 'conditionnement');

-- ── 3. Trigger auto-création ─────────────────────────────────────────────────
-- AFTER INSERT sur orders — déclenché par snapshot_order_from_offer.
-- SECURITY DEFINER pour bypass RLS (pas de policy INSERT — intentionnel).
-- bc_date = date d'acceptation ; generated_by = auth.uid() du signataire.
CREATE OR REPLACE FUNCTION public.create_bc_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.bons_de_commande (order_id, generated_by)
  VALUES (NEW.id, auth.uid());
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_create_bc
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_bc_on_order();

-- ── 4. Backfill commandes existantes ─────────────────────────────────────────
-- bc_date = date d'acceptation réelle de la commande (created_at::date).
-- bc_number auto-incrémenté dans l'ordre d'insertion.
INSERT INTO public.bons_de_commande (order_id, bc_date)
SELECT id, created_at::date
FROM   public.orders
WHERE  id NOT IN (SELECT order_id FROM public.bons_de_commande)
ORDER  BY created_at;
