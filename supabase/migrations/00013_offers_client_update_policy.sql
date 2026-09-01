-- Migration 00013 — Policy UPDATE client_pro + trigger de transitions
--
-- Problème : aucune policy UPDATE n'existait pour client_pro sur offers.
-- Contournement illégal : lib/actions/offers.ts utilisait le service role (bypass RLS).
--
-- Solution en deux parties :
--   1. Policy permissive : contrôle quelle ligne le client peut cibler
--   2. Trigger BEFORE UPDATE : contrôle quelles transitions sont autorisées
--      (la RLS pure ne peut pas encoder "depuis quel état" car USING et WITH CHECK
--       s'évaluent indépendamment dans des policies OR-combinées)

-- ── 1. Policy UPDATE ────────────────────────────────────────────────────────
-- USING  : offre de son entreprise, non clôturée
-- WITH CHECK : le nouveau statut doit être un statut client-initiable.
--   'cancelled' → annulation
--   'pending'   → contre-proposition client (tour revient à Chopin)
--   'accepted'  → acceptation d'une contre-prop Chopin
--   'refused' délibérément absent : refuser = action Chopin uniquement.
CREATE POLICY "offers: client_pro peut modifier le statut de ses offres"
  ON public.offers FOR UPDATE
  USING (
    public.get_user_role() = 'client_pro'
    AND company_id = ANY(public.get_user_company_ids())
    AND status NOT IN ('accepted', 'refused', 'cancelled')
  )
  WITH CHECK (
    public.get_user_role() = 'client_pro'
    AND company_id = ANY(public.get_user_company_ids())
    AND status IN ('cancelled', 'pending', 'accepted')
  );

-- ── 2. Trigger de transitions ───────────────────────────────────────────────
-- Matrice autorisée pour client_pro :
--   pending          → cancelled      ✓ annulation en attente d'une réponse
--   counter_proposed → cancelled      ✓ annulation après contre-prop Chopin
--   counter_proposed → pending        ✓ contre-proposition client
--   counter_proposed → accepted       ✓ acceptation de la contre-prop Chopin
--
--   pending → accepted    ✗ auto-acceptation (snapshot trigger créerait une commande)
--   pending → pending     ✗ contre-prop depuis le tour de Chopin
--   *       → refused     ✗ refus = Chopin uniquement
--
-- NULL guard via IS DISTINCT FROM : si get_user_role() retourne NULL dans un
-- contexte système, != 'client_pro' vaudrait NULL et n'arrêterait pas la fonction.
-- IS DISTINCT FROM gère NULL correctement (NULL IS DISTINCT FROM 'client_pro' = TRUE).
CREATE OR REPLACE FUNCTION public.enforce_client_offer_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF public.get_user_role() IS DISTINCT FROM 'client_pro' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'refused' THEN
    RAISE EXCEPTION 'transition_not_allowed'
      USING DETAIL = 'Le refus est une action réservée à Chopin Conditionnement.';
  END IF;

  IF OLD.status = 'pending' AND NEW.status != 'cancelled' THEN
    RAISE EXCEPTION 'transition_not_allowed'
      USING DETAIL = 'En attente de la réponse de Chopin : seule l''annulation est autorisée depuis cet état.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_offers_client_transition_check
  BEFORE UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_client_offer_transitions();
