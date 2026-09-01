-- ═════════════════════════════════════════════════════════════════════════════
-- 00017 — Correctifs sécurité + alignement des droits sur docs/permissions.md
--
-- 1. profiles.role devient inmodifiable par son propriétaire (escalade de rôle)
-- 2. Offres : écriture réservée admin/super_admin (secrétaire = lecture seule)
-- 3. Commandes : transitions de statut contraintes par rôle côté base
-- 4. Numérotation de facture séquentielle par année, réellement atomique
-- ═════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ESCALADE DE PRIVILÈGES — profiles.role
--
-- La policy "profiles: mise à jour par le propriétaire" (00004) autorise chaque
-- utilisateur à mettre à jour SA ligne, colonne `role` incluse. N'importe quel
-- compte pouvait donc se promouvoir admin via un appel PostgREST direct.
-- RLS ne sait pas restreindre par colonne : on pose un trigger.
--
-- auth.uid() IS NULL = appel service_role (server action de confiance) → permis.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL
     AND COALESCE(public.get_user_role()::text, '') NOT IN ('admin', 'super_admin')
  THEN
    RAISE EXCEPTION
      'Seul un administrateur peut modifier le rôle d''un compte.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_protect_role ON public.profiles;
CREATE TRIGGER trg_profiles_protect_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. OFFRES — la secrétaire consulte, elle ne négocie pas
--
-- docs/permissions.md : accepter / refuser / contre-proposer / annuler = Admin.
-- La lecture (SELECT) reste ouverte à la secrétaire, inchangée.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "offers: admin peut modifier (répondre, changer statut)" ON public.offers;
CREATE POLICY "offers: admin peut modifier (répondre, changer statut)"
  ON public.offers FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "offer_rounds: admin peut créer un round (contre-proposition)" ON public.offer_rounds;
CREATE POLICY "offer_rounds: admin peut créer un round (contre-proposition)"
  ON public.offer_rounds FOR INSERT
  WITH CHECK (
    public.get_user_role() IN ('admin', 'super_admin')
    AND author_role = 'admin'
    AND author_id = auth.uid()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. COMMANDES — transitions de statut par rôle
--
-- Matrice : la secrétaire ne pilote pas la préparation (accepted → ready) mais
-- gère expédition et livraison. Le conditionnement fait l'inverse : toute la
-- préparation, jamais l'expédition. Miroir de lib/actions/orders.ts.
--
-- La policy RLS du conditionnement doit d'abord couvrir 'accepted', sinon il ne
-- peut pas démarrer une préparation.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "orders: conditionnement peut mettre à jour le statut" ON public.orders;
CREATE POLICY "orders: conditionnement peut mettre à jour le statut"
  ON public.orders FOR UPDATE
  USING (
    public.get_user_role() = 'conditionnement'
    AND status IN ('accepted', 'in_preparation', 'ready')
  )
  WITH CHECK (
    public.get_user_role() = 'conditionnement'
    AND status IN ('accepted', 'in_preparation', 'ready')
  );

CREATE OR REPLACE FUNCTION public.enforce_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
DECLARE
  v_role text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Appel service_role (server action de confiance, triggers internes) : libre.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  v_role := COALESCE(public.get_user_role()::text, '');

  IF v_role IN ('admin', 'super_admin') THEN
    RETURN NEW;
  END IF;

  IF v_role = 'secretaire'
     AND (OLD.status, NEW.status) IN (('ready', 'shipped'), ('shipped', 'delivered'))
  THEN
    RETURN NEW;
  END IF;

  IF v_role = 'conditionnement'
     AND (OLD.status, NEW.status) IN (('accepted', 'in_preparation'), ('in_preparation', 'ready'))
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Transition de statut % → % non autorisée pour le rôle %.',
    OLD.status, NEW.status, v_role
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_status_transition ON public.orders;
CREATE TRIGGER trg_orders_status_transition
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_status_transition();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. NUMÉROTATION DES FACTURES
--
-- L'application appelait un RPC `increment_sequence` qui n'a jamais existé :
-- le fallback applicatif (4 derniers chiffres d'un timestamp) s'exécutait donc
-- systématiquement, produisant des numéros non séquentiels et collisionnables
-- contre la contrainte UNIQUE invoices.invoice_number.
--
-- On reprend generate_invoice_number() en la rendant :
--   • annuelle    : compteur remis à 1 chaque année (clé 'invoice_<AAAA>')
--   • atomique    : UPSERT + verrou de ligne, sûr en insertion concurrente
--   • appelable   : SECURITY DEFINER (sequence_counters est sous RLS sans policy)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text := to_char(now(), 'YYYY');
  v_seq  integer;
BEGIN
  INSERT INTO public.sequence_counters (name, value)
  VALUES ('invoice_' || v_year, 1)
  ON CONFLICT (name) DO UPDATE
    SET value = public.sequence_counters.value + 1
  RETURNING value INTO v_seq;

  RETURN 'CHOP-' || v_year || '-' || lpad(v_seq::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_invoice_number() FROM public;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO authenticated, service_role;

-- Reprise de l'existant : le compteur de l'année en cours doit repartir
-- au-dessus du plus grand numéro déjà émis, quelle que soit sa forme.
INSERT INTO public.sequence_counters (name, value)
SELECT
  'invoice_' || to_char(now(), 'YYYY'),
  COALESCE(MAX(NULLIF(regexp_replace(invoice_number, '^CHOP-\d{4}-', ''), '')::integer), 0)
FROM public.invoices
WHERE invoice_number ~ ('^CHOP-' || to_char(now(), 'YYYY') || '-\d+$')
ON CONFLICT (name) DO NOTHING;
