-- ─────────────────────────────────────────────────────────────
-- FONCTIONS ET TRIGGERS UTILITAIRES
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- a) Trigger générique : mise à jour automatique de updated_at
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Application sur toutes les tables avec updated_at
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_varieties_updated_at
  BEFORE UPDATE ON public.varieties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_formats_updated_at
  BEFORE UPDATE ON public.formats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_pallet_sheets_updated_at
  BEFORE UPDATE ON public.pallet_sheets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- b) Génération de numéro de facture séquentiel
--    Format : CHOP-AAAA-NNNN (ex: CHOP-2026-0001)
--    FOR UPDATE sur sequence_counters pour éviter les doublons
--    en cas d'insertion concurrente
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_year    text;
  v_seq     integer;
BEGIN
  v_year := to_char(now(), 'YYYY');

  UPDATE public.sequence_counters
  SET value = value + 1
  WHERE name = 'invoice'
  RETURNING value INTO v_seq;

  RETURN 'CHOP-' || v_year || '-' || lpad(v_seq::text, 4, '0');
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- c) Passage automatique en 'overdue' des factures échues
--    Appelée par le cron /api/cron/delivery-reminder
--    (ou manuellement depuis le dashboard admin)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.calculate_invoice_overdue()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.invoices
  SET status = 'overdue'
  WHERE status = 'issued'
    AND due_date < CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- d) Trigger : notification aux admins à chaque nouvelle offre
--    Notifie tous les profils admin et secretaire
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_offer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_company_name text;
  v_product_name text;
  v_admin        record;
BEGIN
  SELECT name INTO v_company_name FROM public.companies WHERE id = NEW.company_id;
  SELECT name INTO v_product_name FROM public.products  WHERE id = NEW.product_id;

  FOR v_admin IN
    SELECT id FROM public.profiles
    WHERE role IN ('admin', 'secretaire', 'super_admin')
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      v_admin.id,
      'new_offer',
      'Nouvelle offre reçue',
      v_company_name || ' — ' || v_product_name || ' ×' || NEW.quantity,
      '/offres/' || NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_new_offer
  AFTER INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_new_offer();

-- ─────────────────────────────────────────────────────────────
-- e) Trigger : snapshot des infos offre → commande
--    Lors du passage d'une offre en 'accepted', crée
--    automatiquement la commande avec les données figées.
--    Les noms produit/variété/format sont copiés en texte
--    pour résister aux futurs renommages catalogue.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.snapshot_order_from_offer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_last_round  public.offer_rounds%ROWTYPE;
  v_product_name text;
  v_variety_name text;
  v_format_name  text;
  v_total        numeric(12,2);
BEGIN
  -- Seulement lors du passage à 'accepted'
  IF NEW.status <> 'accepted' OR OLD.status = 'accepted' THEN
    RETURN NEW;
  END IF;

  -- Récupère le dernier round (prix accepté)
  SELECT * INTO v_last_round
  FROM public.offer_rounds
  WHERE offer_id = NEW.id
  ORDER BY round_number DESC
  LIMIT 1;

  -- Si aucun round, le client n'a pas encore reçu de prix
  -- (cas : offre acceptée sans négociation → prix à 0)
  IF v_last_round IS NULL THEN
    v_last_round.unit_price := 0;
  END IF;

  SELECT name INTO v_product_name FROM public.products  WHERE id = NEW.product_id;
  SELECT name INTO v_variety_name FROM public.varieties WHERE id = NEW.variety_id;
  SELECT name INTO v_format_name  FROM public.formats   WHERE id = NEW.format_id;

  v_total := v_last_round.unit_price * NEW.quantity;

  INSERT INTO public.orders (
    offer_id, company_id,
    product_id, variety_id, format_id,
    product_name, variety_name, format_name,
    quantity, unit_price, total_price,
    status, delivery_date
  ) VALUES (
    NEW.id, NEW.company_id,
    NEW.product_id, NEW.variety_id, NEW.format_id,
    v_product_name, COALESCE(v_variety_name, ''), COALESCE(v_format_name, ''),
    NEW.quantity, v_last_round.unit_price, v_total,
    'accepted', NEW.requested_date
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_snapshot_order_from_offer
  AFTER UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_order_from_offer();

-- ─────────────────────────────────────────────────────────────
-- f) Trigger : recalcul du montant payé sur invoices
--    Après chaque INSERT/DELETE sur payments, met à jour
--    amount_paid sur la facture et bascule le statut
--    (partially_paid si partiel, paid si total atteint)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_invoice_amount_paid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_invoice_id uuid;
  v_paid       numeric(12,2);
  v_total      numeric(12,2);
  v_new_status public.invoice_status;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT COALESCE(SUM(amount), 0), total
  INTO v_paid, v_total
  FROM public.payments
  JOIN public.invoices ON invoices.id = v_invoice_id
  WHERE payments.invoice_id = v_invoice_id
  GROUP BY total;

  IF v_paid >= v_total THEN
    v_new_status := 'paid';
  ELSIF v_paid > 0 THEN
    v_new_status := 'partially_paid';
  ELSE
    v_new_status := 'issued';
  END IF;

  UPDATE public.invoices
  SET amount_paid = v_paid,
      status      = v_new_status
  WHERE id = v_invoice_id
    AND status NOT IN ('cancelled', 'draft');

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_invoice_on_payment
  AFTER INSERT OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_invoice_amount_paid();

-- ─────────────────────────────────────────────────────────────
-- g) Trigger : liste blanche de colonnes pour conditionnement
--    RLS ne gère pas la granularité colonne — ce trigger
--    compense en rejetant toute modification de colonne
--    sensible (prix, quantité, client, produit, dates)
--    quand l'appelant est le rôle conditionnement.
--
--    Colonnes AUTORISÉES pour conditionnement :
--      - status      (passage in_preparation → ready)
--      - notes       (annotations de préparation)
--      - updated_at  (mis à jour automatiquement par trigger)
--
--    SECURITY INVOKER : s'exécute avec les droits de
--    l'utilisateur appelant → auth.user_role() retourne
--    bien son rôle, pas celui du définisseur.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_conditionnement_allowed_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF public.get_user_role() = 'conditionnement' THEN
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
    THEN
      RAISE EXCEPTION
        'Le rôle conditionnement ne peut modifier que : status, notes. '
        'Colonne protégée détectée dans cet UPDATE.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_conditionnement_columns
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_conditionnement_allowed_columns();
