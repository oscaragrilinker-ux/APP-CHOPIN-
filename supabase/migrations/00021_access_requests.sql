-- ═════════════════════════════════════════════════════════════════════════════
-- 00021 — Demandes d'accès déposées depuis le site public
--
-- Le site vitrine est ouvert à tous ; l'application ne l'est qu'aux clients
-- que l'exploitation autorise. Entre les deux, un formulaire : un prospect
-- laisse son adresse, son entreprise et ses vœux de commande, un admin décide
-- et transforme la demande en invitation (00018).
--
-- Le dépôt est le SEUL geste permis au public : insertion, rien d'autre.
-- Personne d'extérieur ne relit, ne modifie ni ne supprime une demande.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TYPE public.access_request_status AS ENUM ('pending', 'invited', 'declined');

CREATE TABLE public.access_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text NOT NULL,
  company_name   text NOT NULL CHECK (length(company_name) BETWEEN 2 AND 160),
  contact_name   text CHECK (contact_name IS NULL OR length(contact_name) <= 120),
  phone          text CHECK (phone IS NULL OR length(phone) <= 30),
  -- Vœux de commande : produits, volumes, cadence, tels que le prospect les décrit.
  wishes         text CHECK (wishes IS NULL OR length(wishes) <= 2000),
  status         public.access_request_status NOT NULL DEFAULT 'pending',
  invitation_id  uuid REFERENCES public.invitations(id) ON DELETE SET NULL,
  handled_by     uuid REFERENCES public.profiles(id)    ON DELETE SET NULL,
  handled_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Une seule demande ouverte par adresse : le bouton peut être cliqué deux fois.
CREATE UNIQUE INDEX idx_access_requests_pending_email
  ON public.access_requests (email)
  WHERE status = 'pending';

CREATE INDEX idx_access_requests_status_created
  ON public.access_requests (status, created_at DESC);

-- L'adresse est normalisée en base, pas dans le navigateur : on ne fait pas
-- confiance à ce qui arrive du site public.
CREATE OR REPLACE FUNCTION public.normalize_access_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  IF NEW.email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'Adresse e-mail invalide.' USING ERRCODE = '22023';
  END IF;
  NEW.company_name := trim(NEW.company_name);
  NEW.contact_name := nullif(trim(coalesce(NEW.contact_name, '')), '');
  NEW.phone        := nullif(trim(coalesce(NEW.phone, '')), '');
  NEW.wishes       := nullif(trim(coalesce(NEW.wishes, '')), '');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_access_requests_normalize
  BEFORE INSERT OR UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.normalize_access_request();

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Le public dépose, et ne peut déposer qu'une demande vierge : statut en
-- attente, aucun champ de traitement renseigné.
CREATE POLICY "access_requests: dépôt public"
  ON public.access_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND invitation_id IS NULL
    AND handled_by IS NULL
    AND handled_at IS NULL
  );

CREATE POLICY "access_requests: lecture admin"
  ON public.access_requests FOR SELECT
  USING (public.get_user_role()::text IN ('admin', 'super_admin'));

CREATE POLICY "access_requests: traitement admin"
  ON public.access_requests FOR UPDATE
  USING (public.get_user_role()::text IN ('admin', 'super_admin'))
  WITH CHECK (public.get_user_role()::text IN ('admin', 'super_admin'));

-- Le trigger n'a pas vocation à être appelé comme une RPC.
REVOKE ALL ON FUNCTION public.normalize_access_request() FROM public, anon, authenticated;
