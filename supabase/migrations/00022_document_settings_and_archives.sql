-- ═════════════════════════════════════════════════════════════════════════════
-- 00022 — Paramètres des documents + archivage des offres
--
-- 1. document_settings : les mentions qui figurent sur les devis, factures,
--    bons de livraison et de transport (raison sociale, SIRET, TVA, IBAN,
--    conditions). Une seule ligne, modifiable par un admin dans Paramètres :
--    ce qui engage juridiquement ne doit pas vivre dans le code.
-- 2. offers.archived_at : une offre archivée disparaît de la liste courante
--    et se retrouve dans Archives, classée par client puis par date.
-- ═════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PARAMÈTRES DES DOCUMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.document_settings (
  id                  integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  legal_name          text NOT NULL DEFAULT 'SCEA Chopin',
  legal_form          text,                    -- « SCEA », « EARL »…
  siret               text,
  vat_number          text,                    -- FR + 11 chiffres
  address_line1       text NOT NULL DEFAULT '11 rue de la Maladrerie',
  postal_code         text NOT NULL DEFAULT '62124',
  city                text NOT NULL DEFAULT 'Beaumetz-lès-Cambrai',
  phone               text,
  email               text,
  iban                text,
  bic                 text,
  bank_name           text,
  quote_validity_days integer NOT NULL DEFAULT 30 CHECK (quote_validity_days > 0),
  payment_terms_text  text NOT NULL DEFAULT 'Paiement à 30 jours date de facture, par virement bancaire.',
  late_penalty_text   text NOT NULL DEFAULT
    'En cas de retard de paiement, pénalités au taux de 3 fois le taux d''intérêt légal et indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 du Code de commerce).',
  invoice_footer      text,
  quote_footer        text,
  delivery_footer     text,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  updated_by          uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

INSERT INTO public.document_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS trg_document_settings_updated_at ON public.document_settings;
CREATE TRIGGER trg_document_settings_updated_at
  BEFORE UPDATE ON public.document_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.document_settings ENABLE ROW LEVEL SECURITY;

-- Lecture : tout le personnel de l'exploitation (la page Paramètres les affiche).
-- Les PDF sont produits côté serveur avec le client service : pas de policy
-- nécessaire pour les clients pro, qui n'y accèdent jamais directement.
DROP POLICY IF EXISTS "document_settings: lecture interne" ON public.document_settings;
CREATE POLICY "document_settings: lecture interne"
  ON public.document_settings FOR SELECT
  USING (public.get_user_role()::text IN (
    'admin', 'secretaire', 'super_admin', 'responsable_conditionnement', 'conditionnement'
  ));

DROP POLICY IF EXISTS "document_settings: modification admin" ON public.document_settings;
CREATE POLICY "document_settings: modification admin"
  ON public.document_settings FOR UPDATE
  USING (public.get_user_role()::text IN ('admin', 'super_admin'))
  WITH CHECK (public.get_user_role()::text IN ('admin', 'super_admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ARCHIVAGE DES OFFRES
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_offers_archived
  ON public.offers (archived_at DESC NULLS LAST, company_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. NUMÉROTATION DES DEVIS — DEV-AAAA-NNNN
-- Attribué à la première édition du PDF, séquentiel par an, même mécanique
-- que les factures (00017) et les bons de livraison (00020).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS quote_number text UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_quote_number()
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
  VALUES ('quote_' || v_year, 1)
  ON CONFLICT (name) DO UPDATE
    SET value = public.sequence_counters.value + 1
  RETURNING value INTO v_seq;
  RETURN 'DEV-' || v_year || '-' || lpad(v_seq::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_quote_number() FROM public;
GRANT EXECUTE ON FUNCTION public.generate_quote_number() TO service_role;
