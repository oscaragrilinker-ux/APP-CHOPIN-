-- ═════════════════════════════════════════════════════════════════════════════
-- 00018 — Invitations et droits ajustés par utilisateur
--
-- Parcours cible : l'admin invite (client pro ou salarié) par lien signé.
-- Le destinataire crée son compte depuis ce lien ; s'il en a déjà un, il est
-- simplement rattaché. Pour un salarié, l'admin part d'un rôle de la matrice
-- et ajuste quelques droits pour cette personne précise.
-- ═════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Droits ajustés, stockés sur le profil
--
-- Forme : {"orders:enter_lot": false, "catalogue:view": true}
-- Une clé absente = on retient la valeur du rôle (docs/permissions.md).
-- Le rôle reste la référence : la RLS continue de raisonner par rôle et
-- constitue le plafond de sécurité. Les ajustements affinent à l'intérieur.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS permission_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Un utilisateur ne s'auto-attribue pas de droits : même protection que `role`.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role
      OR NEW.permission_overrides IS DISTINCT FROM OLD.permission_overrides)
     AND auth.uid() IS NOT NULL
     AND COALESCE(public.get_user_role()::text, '') NOT IN ('admin', 'super_admin')
  THEN
    RAISE EXCEPTION
      'Seul un administrateur peut modifier le rôle ou les droits d''un compte.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Invitations
--
-- company_id n'est renseigné que pour un client_pro : il rattache le nouveau
-- compte à l'entreprise créée en amont par l'admin.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invitations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token                text NOT NULL UNIQUE,
  -- Toujours stocké en minuscules (contrainte ci-dessous) : la comparaison avec
  -- l'adresse du compte Supabase doit être insensible à la casse.
  email                text NOT NULL,
  role                 public.user_role NOT NULL,
  company_id           uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  permission_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_name           text,
  last_name            text,
  message              text,
  invited_by           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at           timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at          timestamptz,
  accepted_by          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revoked_at           timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),

  -- Un client pro est toujours rattaché à une entreprise ; un interne jamais.
  CONSTRAINT invitations_company_coherence CHECK (
    (role = 'client_pro' AND company_id IS NOT NULL)
    OR (role <> 'client_pro' AND company_id IS NULL)
  ),
  -- super_admin ne s'attribue pas par invitation (rôle de développement).
  CONSTRAINT invitations_no_super_admin CHECK (role <> 'super_admin'),
  CONSTRAINT invitations_email_lowercase CHECK (email = lower(email))
);

CREATE INDEX IF NOT EXISTS idx_invitations_email   ON public.invitations (email);
CREATE INDEX IF NOT EXISTS idx_invitations_company ON public.invitations (company_id);

-- Une seule invitation vivante par adresse : évite les liens concurrents.
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_email_pending
  ON public.invitations (email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Lecture et gestion : Chopin uniquement. La consultation d'un lien par son
-- destinataire (non connecté) passe par une server action en service_role,
-- jamais par une policy anonyme — le token ne doit pas être énumérable.
DROP POLICY IF EXISTS "invitations: gestion Chopin" ON public.invitations;
CREATE POLICY "invitations: gestion Chopin"
  ON public.invitations FOR SELECT
  USING (public.get_user_role() IN ('admin', 'secretaire', 'super_admin'));

DROP POLICY IF EXISTS "invitations: creation admin" ON public.invitations;
CREATE POLICY "invitations: creation admin"
  ON public.invitations FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "invitations: revocation admin" ON public.invitations;
CREATE POLICY "invitations: revocation admin"
  ON public.invitations FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'super_admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Entreprises clientes — écriture
--
-- Le module clients était en lecture seule alors que la matrice prévoit
-- création (admin), modification (admin + secrétaire, et le client pour la
-- sienne) et désactivation (admin).
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "companies: creation admin" ON public.companies;
CREATE POLICY "companies: creation admin"
  ON public.companies FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "companies: modification Chopin" ON public.companies;
CREATE POLICY "companies: modification Chopin"
  ON public.companies FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'secretaire', 'super_admin'));

DROP POLICY IF EXISTS "companies: client modifie la sienne" ON public.companies;
CREATE POLICY "companies: client modifie la sienne"
  ON public.companies FOR UPDATE
  USING (
    public.get_user_role() = 'client_pro'
    AND id = ANY(public.get_user_company_ids())
  );

-- Un client ne se réactive pas lui-même et ne change pas ses conditions de
-- paiement : ces deux colonnes restent la main de Chopin.
CREATE OR REPLACE FUNCTION public.protect_company_commercial_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
BEGIN
  IF public.get_user_role() = 'client_pro'
     AND (NEW.payment_terms IS DISTINCT FROM OLD.payment_terms
          OR NEW.is_active IS DISTINCT FROM OLD.is_active)
  THEN
    RAISE EXCEPTION
      'Les conditions de paiement et l''activation relèvent de Chopin Conditionnement.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_companies_protect_commercial ON public.companies;
CREATE TRIGGER trg_companies_protect_commercial
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_company_commercial_fields();
