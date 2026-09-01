-- ═════════════════════════════════════════════════════════════════════════════
-- 00020 — Logistique transport + poste de travail atelier
--
-- 1. Carnet de transporteurs (contacts, pas de comptes)
-- 2. Commandes : transporteur, lieux d'enlèvement et de livraison, épinglage
-- 3. Fiches palette : type de palette, colis, cerclage, n° de BL
-- 4. Numérotation séquentielle des bons de livraison
-- 5. Droits du rôle responsable_conditionnement
--
-- Les comparaisons de rôle passent par ::text : la valeur d'enum
-- 'responsable_conditionnement' vient d'être créée en 00019 et ne peut pas être
-- référencée directement selon l'ordre d'exécution.
-- ═════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TRANSPORTEURS
--
-- Un transporteur n'est pas un utilisateur de l'application : c'est une fiche
-- contact à qui l'on envoie un récapitulatif de chargement.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.carriers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  contact_name  text,
  email         text,
  phone         text,
  address_line1 text,
  postal_code   text,
  city          text,
  notes         text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_carriers_active ON public.carriers (is_active, name);

DROP TRIGGER IF EXISTS trg_carriers_updated_at ON public.carriers;
CREATE TRIGGER trg_carriers_updated_at
  BEFORE UPDATE ON public.carriers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;

-- L'atelier voit le nom du transporteur sur sa file de préparation.
DROP POLICY IF EXISTS "carriers: lecture interne" ON public.carriers;
CREATE POLICY "carriers: lecture interne"
  ON public.carriers FOR SELECT
  USING (public.get_user_role()::text IN (
    'admin', 'secretaire', 'super_admin', 'conditionnement', 'responsable_conditionnement'
  ));

DROP POLICY IF EXISTS "carriers: ecriture Chopin" ON public.carriers;
CREATE POLICY "carriers: ecriture Chopin"
  ON public.carriers FOR INSERT
  WITH CHECK (public.get_user_role()::text IN ('admin', 'secretaire', 'super_admin'));

DROP POLICY IF EXISTS "carriers: modification Chopin" ON public.carriers;
CREATE POLICY "carriers: modification Chopin"
  ON public.carriers FOR UPDATE
  USING (public.get_user_role()::text IN ('admin', 'secretaire', 'super_admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. COMMANDES — organisation du transport
--
-- pickup_location  : lieu de cargaison (site Chopin par défaut, ou autre dépôt)
-- delivery_location: lieu de livraison (souvent l'adresse du client)
-- priority_pinned_at : commande épinglée en tête de file d'atelier ;
--                      NULL = ordre naturel par date de livraison.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS carrier_id         uuid REFERENCES public.carriers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pickup_location    text,
  ADD COLUMN IF NOT EXISTS delivery_location  text,
  ADD COLUMN IF NOT EXISTS delivery_time      time,
  ADD COLUMN IF NOT EXISTS transport_notes    text,
  ADD COLUMN IF NOT EXISTS priority_pinned_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_priority
  ON public.orders (priority_pinned_at DESC NULLS LAST, delivery_date NULLS LAST);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. FICHES PALETTE
--
-- Vocabulaires fermés : sur une tablette d'atelier manipulée avec des gants,
-- une liste déroulante vaut mieux qu'un champ libre.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.pallet_kind AS ENUM ('europe', 'perdue', 'plastique', 'demi_palette', 'autre');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.strapping_kind AS ENUM ('film', 'cerclage_plastique', 'cerclage_metal', 'coiffe_cerclage', 'aucun');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.pallet_sheets
  ADD COLUMN IF NOT EXISTS bl_number      text,
  ADD COLUMN IF NOT EXISTS pallet_kind    public.pallet_kind NOT NULL DEFAULT 'europe',
  ADD COLUMN IF NOT EXISTS packaging_type text,
  ADD COLUMN IF NOT EXISTS parcel_count   integer CHECK (parcel_count IS NULL OR parcel_count > 0),
  ADD COLUMN IF NOT EXISTS strapping      public.strapping_kind NOT NULL DEFAULT 'film',
  ADD COLUMN IF NOT EXISTS net_weight_kg  numeric(10,3) CHECK (net_weight_kg IS NULL OR net_weight_kg >= 0),
  -- La tablette est un poste partagé : prepared_by porte le compte « Atelier »,
  -- operator_name la personne qui a réellement monté la palette.
  ADD COLUMN IF NOT EXISTS operator_name  text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pallet_sheets_bl
  ON public.pallet_sheets (bl_number)
  WHERE bl_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pallet_sheets_order ON public.pallet_sheets (order_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. NUMÉROTATION DES BONS DE LIVRAISON — BL-AAAA-NNNN
--
-- Même mécanique que les factures (00017) : compteur annuel, incrément atomique.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_bl_number()
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
  VALUES ('bl_' || v_year, 1)
  ON CONFLICT (name) DO UPDATE
    SET value = public.sequence_counters.value + 1
  RETURNING value INTO v_seq;

  RETURN 'BL-' || v_year || '-' || lpad(v_seq::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_bl_number() FROM public;
GRANT EXECUTE ON FUNCTION public.generate_bl_number() TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. DROITS DU RESPONSABLE CONDITIONNEMENT
--
-- Il lit les mêmes données que l'atelier (jamais les prix) et pilote l'ordre
-- de passage. La vue reste la seule porte d'entrée sur les commandes.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.orders_for_conditionnement AS
SELECT
  o.id,
  o.company_id,
  o.product_id,
  o.variety_id,
  o.format_id,
  o.product_name,
  o.variety_name,
  o.format_name,
  o.quantity,
  -- unit_price et total_price EXCLUS intentionnellement
  o.status,
  o.delivery_date,
  o.delivery_time,
  o.pickup_location,
  o.delivery_location,
  o.transport_notes,
  o.priority_pinned_at,
  o.carrier_id,
  o.notes,
  o.created_at,
  o.updated_at,
  c.name AS company_name,
  tr.name AS carrier_name,
  f.weight_kg AS format_weight_kg
FROM public.orders o
JOIN public.companies c ON c.id = o.company_id
LEFT JOIN public.carriers tr ON tr.id = o.carrier_id
LEFT JOIN public.formats  f  ON f.id = o.format_id
WHERE public.get_user_role()::text IN ('conditionnement', 'responsable_conditionnement');

-- Lecture des fiches palette
DROP POLICY IF EXISTS "pallet_sheets: conditionnement voit tout" ON public.pallet_sheets;
CREATE POLICY "pallet_sheets: conditionnement voit tout"
  ON public.pallet_sheets FOR SELECT
  USING (public.get_user_role()::text IN ('conditionnement', 'responsable_conditionnement'));

-- Le client récupère les fiches palette de ses propres commandes
-- (docs/permissions.md : « Fiches palette · Générer / télécharger · Client ✅ »).
DROP POLICY IF EXISTS "pallet_sheets: client voit les siennes" ON public.pallet_sheets;
CREATE POLICY "pallet_sheets: client voit les siennes"
  ON public.pallet_sheets FOR SELECT
  USING (
    public.get_user_role()::text = 'client_pro'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.company_id = ANY(public.get_user_company_ids())
    )
  );

DROP POLICY IF EXISTS "pallet_sheets: conditionnement peut créer" ON public.pallet_sheets;
CREATE POLICY "pallet_sheets: conditionnement peut créer"
  ON public.pallet_sheets FOR INSERT
  WITH CHECK (public.get_user_role()::text IN (
    'admin', 'secretaire', 'super_admin', 'conditionnement', 'responsable_conditionnement'
  ));

-- L'atelier corrige sa saisie tant que le bon de livraison n'est pas émis.
DROP POLICY IF EXISTS "pallet_sheets: admin peut modifier" ON public.pallet_sheets;
CREATE POLICY "pallet_sheets: atelier et Chopin peuvent modifier"
  ON public.pallet_sheets FOR UPDATE
  USING (
    public.get_user_role()::text IN ('admin', 'secretaire', 'super_admin')
    OR (
      public.get_user_role()::text IN ('conditionnement', 'responsable_conditionnement')
      AND bl_number IS NULL
    )
  );

-- Commandes : l'atelier agit sur la phase de préparation
DROP POLICY IF EXISTS "orders: conditionnement peut mettre à jour le statut" ON public.orders;
CREATE POLICY "orders: conditionnement peut mettre à jour le statut"
  ON public.orders FOR UPDATE
  USING (
    public.get_user_role()::text IN ('conditionnement', 'responsable_conditionnement')
    AND status IN ('accepted', 'in_preparation', 'ready')
  )
  WITH CHECK (
    public.get_user_role()::text IN ('conditionnement', 'responsable_conditionnement')
    AND status IN ('accepted', 'in_preparation', 'ready')
  );

-- Colonnes que l'atelier peut toucher.
-- L'opérateur : statut et notes. Le responsable : plus l'épinglage de priorité.
CREATE OR REPLACE FUNCTION public.enforce_conditionnement_allowed_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
DECLARE
  v_role text := COALESCE(public.get_user_role()::text, '');
BEGIN
  IF v_role NOT IN ('conditionnement', 'responsable_conditionnement') THEN
    RETURN NEW;
  END IF;

  IF NEW.company_id     IS DISTINCT FROM OLD.company_id
  OR NEW.offer_id       IS DISTINCT FROM OLD.offer_id
  OR NEW.product_id     IS DISTINCT FROM OLD.product_id
  OR NEW.variety_id     IS DISTINCT FROM OLD.variety_id
  OR NEW.format_id      IS DISTINCT FROM OLD.format_id
  OR NEW.product_name   IS DISTINCT FROM OLD.product_name
  OR NEW.variety_name   IS DISTINCT FROM OLD.variety_name
  OR NEW.format_name    IS DISTINCT FROM OLD.format_name
  OR NEW.quantity       IS DISTINCT FROM OLD.quantity
  OR NEW.unit_price     IS DISTINCT FROM OLD.unit_price
  OR NEW.total_price    IS DISTINCT FROM OLD.total_price
  OR NEW.delivery_date  IS DISTINCT FROM OLD.delivery_date
  OR NEW.carrier_id     IS DISTINCT FROM OLD.carrier_id
  OR NEW.pickup_location   IS DISTINCT FROM OLD.pickup_location
  OR NEW.delivery_location IS DISTINCT FROM OLD.delivery_location
  THEN
    RAISE EXCEPTION
      'L''atelier ne peut modifier que : statut, notes%.',
      CASE WHEN v_role = 'responsable_conditionnement' THEN ', priorité' ELSE '' END
      USING ERRCODE = '42501';
  END IF;

  IF v_role = 'conditionnement'
     AND NEW.priority_pinned_at IS DISTINCT FROM OLD.priority_pinned_at
  THEN
    RAISE EXCEPTION
      'Seul un responsable peut épingler une commande en tête de file.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- Transitions de statut : le responsable pilote la préparation comme l'atelier.
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

  IF v_role IN ('conditionnement', 'responsable_conditionnement')
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

-- Le responsable lit aussi profils, catalogue et entreprises comme l'atelier.
DROP POLICY IF EXISTS "profiles: lecture par le propriétaire ou admin" ON public.profiles;
CREATE POLICY "profiles: lecture par le propriétaire ou admin"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.get_user_role()::text IN (
      'admin', 'secretaire', 'super_admin', 'responsable_conditionnement'
    )
  );
