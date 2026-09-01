-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY — APP CHOPIN
-- Une policy par opération (SELECT/INSERT/UPDATE/DELETE)
-- pour faciliter le debug. Pas de policy ALL générique.
--
-- Matrice complète : docs/permissions.md
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- Helpers auth — fonctions utilitaires appelées dans les policies
-- SECURITY DEFINER pour contourner RLS sur profiles elle-même
-- ─────────────────────────────────────────────────────────────

-- Retourne le rôle de l'utilisateur courant.
-- STABLE : Postgres peut cacher le résultat pour toute la durée d'une requête,
--          évite N appels pour N lignes évaluées par RLS.
-- SECURITY DEFINER : s'exécute avec les droits du définisseur (pas de l'appelant)
--          → contourne RLS sur profiles, sinon boucle infinie :
--          policy profiles → user_role() → SELECT profiles → policy profiles...
-- SET search_path : bloque l'injection via search_path (CVE classique sur SECURITY DEFINER).
-- Supabase n'autorise pas la création de fonctions dans le schema auth.
-- Les helpers sont placés dans public avec SECURITY DEFINER pour contourner RLS.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- COALESCE → retourne [] au lieu de NULL si aucune entreprise liée,
-- évite les ANY(NULL) qui retournent toujours false en SQL.
CREATE OR REPLACE FUNCTION public.get_user_company_ids()
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(ARRAY_AGG(company_id), ARRAY[]::uuid[])
  FROM public.client_users
  WHERE user_id = auth.uid()
$$;

-- ─────────────────────────────────────────────────────────────
-- Activation RLS sur toutes les tables
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.varieties       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formats         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_rounds    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pallet_sheets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_counters ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- PROFILES
-- Chacun voit son propre profil + admins voient tout
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "profiles: lecture par le propriétaire ou admin"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.get_user_role() IN ('admin', 'secretaire', 'super_admin')
  );

CREATE POLICY "profiles: mise à jour par le propriétaire"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: mise à jour par admin (y compris changement rôle)"
  ON public.profiles FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "profiles: création par admin uniquement"
  ON public.profiles FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'super_admin'));

-- ─────────────────────────────────────────────────────────────
-- COMPANIES
-- client_pro voit seulement ses entreprises
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "companies: admin et secrétaire voient tout"
  ON public.companies FOR SELECT
  USING (public.get_user_role() IN ('admin', 'secretaire', 'super_admin'));

CREATE POLICY "companies: client_pro voit ses entreprises"
  ON public.companies FOR SELECT
  USING (
    public.get_user_role() = 'client_pro'
    AND id = ANY(public.get_user_company_ids())
  );

CREATE POLICY "companies: conditionnement voit tout (sans prix)"
  ON public.companies FOR SELECT
  USING (public.get_user_role() = 'conditionnement');

CREATE POLICY "companies: création par admin uniquement"
  ON public.companies FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "companies: modification par admin"
  ON public.companies FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "companies: suppression interdite (désactivation uniquement)"
  ON public.companies FOR DELETE
  USING (false);

-- ─────────────────────────────────────────────────────────────
-- CLIENT_USERS
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "client_users: admin voit tout"
  ON public.client_users FOR SELECT
  USING (public.get_user_role() IN ('admin', 'secretaire', 'super_admin'));

CREATE POLICY "client_users: client_pro voit ses liaisons"
  ON public.client_users FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "client_users: création par admin"
  ON public.client_users FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "client_users: suppression par admin"
  ON public.client_users FOR DELETE
  USING (public.get_user_role() IN ('admin', 'super_admin'));

-- ─────────────────────────────────────────────────────────────
-- CATALOGUE (products, varieties, formats)
-- Lecture pour tous les rôles authentifiés
-- Modification réservée admin
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "products: lecture pour tous"
  ON public.products FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "products: création par admin"
  ON public.products FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "products: modification par admin"
  ON public.products FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "products: suppression par admin"
  ON public.products FOR DELETE
  USING (public.get_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "varieties: lecture pour tous"
  ON public.varieties FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "varieties: création par admin"
  ON public.varieties FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "varieties: modification par admin"
  ON public.varieties FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "varieties: suppression par admin"
  ON public.varieties FOR DELETE
  USING (public.get_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "formats: lecture pour tous"
  ON public.formats FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "formats: création par admin"
  ON public.formats FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "formats: modification par admin"
  ON public.formats FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "formats: suppression par admin"
  ON public.formats FOR DELETE
  USING (public.get_user_role() IN ('admin', 'super_admin'));

-- ─────────────────────────────────────────────────────────────
-- OFFERS
-- client_pro voit ses offres (via company)
-- admin/secrétaire voient tout
-- conditionnement : n'a pas accès aux offres
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "offers: admin et secrétaire voient tout"
  ON public.offers FOR SELECT
  USING (public.get_user_role() IN ('admin', 'secretaire', 'super_admin'));

CREATE POLICY "offers: client_pro voit ses offres"
  ON public.offers FOR SELECT
  USING (
    public.get_user_role() = 'client_pro'
    AND company_id = ANY(public.get_user_company_ids())
  );

CREATE POLICY "offers: client_pro peut créer une offre"
  ON public.offers FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'client_pro'
    AND company_id = ANY(public.get_user_company_ids())
    AND created_by = auth.uid()
  );

CREATE POLICY "offers: admin peut modifier (répondre, changer statut)"
  ON public.offers FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'secretaire', 'super_admin'));

-- Les offres ne sont jamais supprimées (annulées via status)
CREATE POLICY "offers: suppression interdite"
  ON public.offers FOR DELETE
  USING (false);

-- ─────────────────────────────────────────────────────────────
-- OFFER_ROUNDS
-- Mêmes règles que offers (accès via l'offre parente)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "offer_rounds: admin et secrétaire voient tout"
  ON public.offer_rounds FOR SELECT
  USING (public.get_user_role() IN ('admin', 'secretaire', 'super_admin'));

CREATE POLICY "offer_rounds: client_pro voit les rounds de ses offres"
  ON public.offer_rounds FOR SELECT
  USING (
    public.get_user_role() = 'client_pro'
    AND EXISTS (
      SELECT 1 FROM public.offers o
      WHERE o.id = offer_id
        AND o.company_id = ANY(public.get_user_company_ids())
    )
  );

CREATE POLICY "offer_rounds: client_pro peut créer un round sur ses offres"
  ON public.offer_rounds FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'client_pro'
    AND author_role = 'client'
    AND author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.offers o
      WHERE o.id = offer_id
        AND o.company_id = ANY(public.get_user_company_ids())
    )
  );

CREATE POLICY "offer_rounds: admin peut créer un round (contre-proposition)"
  ON public.offer_rounds FOR INSERT
  WITH CHECK (
    public.get_user_role() IN ('admin', 'secretaire', 'super_admin')
    AND author_role = 'admin'
    AND author_id = auth.uid()
  );

-- ─────────────────────────────────────────────────────────────
-- ORDERS
--
-- ACCÈS "conditionnement" — RÈGLE FONDAMENTALE :
-- ┌─────────────────────────────────────────────────────────┐
-- │ Le rôle "conditionnement" N'A AUCUNE POLICY SELECT      │
-- │ sur la table public.orders. Zéro. Ni directe, ni via    │
-- │ une policy générique.                                    │
-- │                                                          │
-- │ Son accès en lecture passe UNIQUEMENT par la vue :       │
-- │   public.orders_for_conditionnement                      │
-- │ qui exclut les colonnes unit_price et total_price.       │
-- │                                                          │
-- │ En UPDATE, un trigger BEFORE UPDATE (défini dans         │
-- │ 00003_functions_triggers.sql) bloque toute modification  │
-- │ de colonne autre que : status, notes, updated_at.        │
-- └─────────────────────────────────────────────────────────┘
--
-- Vérification rapide des policies SELECT ci-dessous :
--   • 'admin', 'secretaire', 'super_admin' → policy 1
--   • 'client_pro' → policy 2 (ses entreprises seulement)
--   • 'conditionnement' → aucune policy SELECT ← VOULU
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "orders: admin et secrétaire voient tout"
  ON public.orders FOR SELECT
  USING (public.get_user_role() IN ('admin', 'secretaire', 'super_admin'));

CREATE POLICY "orders: client_pro voit ses commandes"
  ON public.orders FOR SELECT
  USING (
    public.get_user_role() = 'client_pro'
    AND company_id = ANY(public.get_user_company_ids())
  );

-- Pas de policy SELECT pour 'conditionnement' — intentionnel, voir commentaire ci-dessus.

CREATE POLICY "orders: admin peut modifier"
  ON public.orders FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'secretaire', 'super_admin'));

-- Le rôle conditionnement ne peut modifier que des commandes
-- en cours de préparation (in_preparation) ou prêtes (ready).
-- Les colonnes autorisées sont restreintes par le trigger
-- trg_orders_conditionnement_columns (00003_functions_triggers.sql).
CREATE POLICY "orders: conditionnement peut mettre à jour le statut"
  ON public.orders FOR UPDATE
  USING (
    public.get_user_role() = 'conditionnement'
    AND status IN ('in_preparation', 'ready')
  )
  WITH CHECK (
    public.get_user_role() = 'conditionnement'
    AND status IN ('in_preparation', 'ready')
  );

-- Les commandes ne sont jamais supprimées (annulées via status)
CREATE POLICY "orders: suppression interdite"
  ON public.orders FOR DELETE
  USING (false);

-- ─────────────────────────────────────────────────────────────
-- PALLET_SHEETS
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "pallet_sheets: admin et secrétaire voient tout"
  ON public.pallet_sheets FOR SELECT
  USING (public.get_user_role() IN ('admin', 'secretaire', 'super_admin'));

CREATE POLICY "pallet_sheets: conditionnement voit tout"
  ON public.pallet_sheets FOR SELECT
  USING (public.get_user_role() = 'conditionnement');

CREATE POLICY "pallet_sheets: conditionnement peut créer"
  ON public.pallet_sheets FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'secretaire', 'conditionnement', 'super_admin'));

CREATE POLICY "pallet_sheets: admin peut modifier"
  ON public.pallet_sheets FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'super_admin'));

-- ─────────────────────────────────────────────────────────────
-- INVOICES
-- client_pro peut voir ses factures
-- conditionnement n'a aucun accès
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "invoices: admin et secrétaire voient tout"
  ON public.invoices FOR SELECT
  USING (public.get_user_role() IN ('admin', 'secretaire', 'super_admin'));

CREATE POLICY "invoices: client_pro voit ses factures"
  ON public.invoices FOR SELECT
  USING (
    public.get_user_role() = 'client_pro'
    AND company_id = ANY(public.get_user_company_ids())
  );

CREATE POLICY "invoices: création par admin ou secrétaire"
  ON public.invoices FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'secretaire', 'super_admin'));

CREATE POLICY "invoices: modification par admin (statut, pdf_url)"
  ON public.invoices FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'secretaire', 'super_admin'));

-- Jamais supprimées (archivage légal 10 ans)
CREATE POLICY "invoices: suppression interdite"
  ON public.invoices FOR DELETE
  USING (false);

-- ─────────────────────────────────────────────────────────────
-- PAYMENTS
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "payments: admin et secrétaire voient tout"
  ON public.payments FOR SELECT
  USING (public.get_user_role() IN ('admin', 'secretaire', 'super_admin'));

CREATE POLICY "payments: client_pro voit ses paiements"
  ON public.payments FOR SELECT
  USING (
    public.get_user_role() = 'client_pro'
    AND EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.company_id = ANY(public.get_user_company_ids())
    )
  );

CREATE POLICY "payments: création par admin"
  ON public.payments FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'secretaire', 'super_admin'));

-- Les paiements ne sont pas modifiables (annuler → nouveau paiement négatif)
CREATE POLICY "payments: suppression par admin uniquement (correction)"
  ON public.payments FOR DELETE
  USING (public.get_user_role() IN ('admin', 'super_admin'));

-- ─────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- Chacun voit et gère seulement ses propres notifications
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "notifications: lecture de ses propres notifs"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications: marquer comme lue (UPDATE is_read)"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Les triggers créent les notifs (SECURITY DEFINER) → pas de INSERT policy user
-- Les notifs ne sont pas supprimées par les utilisateurs
CREATE POLICY "notifications: suppression par admin (nettoyage)"
  ON public.notifications FOR DELETE
  USING (public.get_user_role() IN ('admin', 'super_admin'));

-- ─────────────────────────────────────────────────────────────
-- ACTIVITY_LOG
-- Accès réservé au super_admin uniquement
-- (masqué côté UI pour les autres rôles)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "activity_log: lecture super_admin uniquement"
  ON public.activity_log FOR SELECT
  USING (public.get_user_role() = 'super_admin');

-- Les logs sont insérés par des fonctions SECURITY DEFINER
-- Pas d'INSERT policy user

-- ─────────────────────────────────────────────────────────────
-- SEQUENCE_COUNTERS
-- Protégée : modification uniquement par fonctions internes
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "sequence_counters: accès interdit en direct"
  ON public.sequence_counters FOR ALL
  USING (false);

-- ─────────────────────────────────────────────────────────────
-- VUE : orders_for_conditionnement
-- Expose les commandes sans les colonnes de prix.
-- Le rôle "conditionnement" utilise cette vue pour
-- gérer la préparation et la saisie de lots.
-- La table orders reste inaccessible via RLS.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.orders_for_conditionnement
  WITH (security_invoker = true)
AS
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
  -- unit_price et total_price sont EXCLUS intentionnellement
  o.status,
  o.delivery_date,
  o.notes,
  o.created_at,
  o.updated_at,
  c.name AS company_name
FROM public.orders o
JOIN public.companies c ON c.id = o.company_id;
