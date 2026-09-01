-- =============================================================================
-- 00012_create_offer_with_round.sql
-- Fonction transactionnelle : émission atomique d'une offre + round initial
--
-- Garantit qu'une offre ne peut pas exister sans son premier round :
-- si l'INSERT offer_rounds échoue, l'INSERT offers est annulé.
--
-- SECURITY INVOKER : s'exécute avec les droits de l'appelant.
-- RLS reste actif — les INSERT policies sur offers et offer_rounds
-- constituent le garde-fou final (defense in depth).
-- auth.uid() résolu depuis le JWT transmis par le client Supabase SSR.
--
-- Vérifications métier embarquées (indépendantes du layer applicatif) :
--   1. La variété existe et est is_active = true
--   2. Le format est associé à la variété via variety_formats
--   product_id est déduit de la variété — non fourni par l'appelant.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_offer_with_round(
  p_company_id      uuid,
  p_variety_id      uuid,
  p_format_id       uuid,
  p_quantity        integer,
  p_price_basis     public.price_basis,
  p_unit_price      numeric,
  p_requested_date  date  DEFAULT NULL,
  p_message         text  DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_product_id uuid;
  v_offer_id   uuid;
BEGIN
  -- 0. Sécurité : la société doit appartenir à l'appelant
  IF NOT EXISTS (
    SELECT 1 FROM public.client_users
    WHERE user_id = v_user_id AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'company_not_allowed'
      USING HINT = 'Vous ne pouvez pas créer d''offre pour cette entreprise.';
  END IF;

  -- 1. Variété active + récupération product_id
  SELECT product_id INTO v_product_id
  FROM public.varieties
  WHERE id = p_variety_id AND is_active = true;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'variety_not_active'
      USING HINT = 'Cette variété n''existe pas ou n''est plus en service.';
  END IF;

  -- 2. Format associé à la variété
  IF NOT EXISTS (
    SELECT 1 FROM public.variety_formats
    WHERE variety_id = p_variety_id AND format_id = p_format_id
  ) THEN
    RAISE EXCEPTION 'format_not_in_variety'
      USING HINT = 'Ce contenant n''est pas disponible pour cette variété.';
  END IF;

  -- 3. Création de l'offre
  INSERT INTO public.offers (
    company_id, created_by,
    product_id, variety_id, format_id,
    quantity, price_basis, status, requested_date
  ) VALUES (
    p_company_id, v_user_id,
    v_product_id, p_variety_id, p_format_id,
    p_quantity, p_price_basis, 'pending', p_requested_date
  )
  RETURNING id INTO v_offer_id;

  -- 4. Round 1 — prix initial proposé par le client
  INSERT INTO public.offer_rounds (
    offer_id, round_number, author_role, author_id,
    unit_price, message
  ) VALUES (
    v_offer_id, 1, 'client', v_user_id,
    p_unit_price, p_message
  );

  RETURN v_offer_id;
END;
$$;
