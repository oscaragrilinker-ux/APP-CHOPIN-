-- Migration 00015 — TVA dans le catalogue + snapshot enrichi des commandes
--
-- 1. products.tva_rate NOT NULL (taux légal obligatoire à la saisie)
-- 2. varieties.tva_rate nullable (surcharge optionnelle par variété)
-- 3. orders.price_basis (public.price_basis enum, pas text) + orders.tva_rate
-- 4. compute_order_total() — miroir SQL de lib/utils/price.ts → computeTotal()
-- 5. Backfill des 2 commandes existantes (price_basis, tva_rate, total_price)
-- 6. snapshot_order_from_offer() mis à jour : total correct + price_basis + tva_rate

-- ── 1. products.tva_rate ─────────────────────────────────────────────────────
-- Nullable d'abord pour ne pas bloquer les lignes existantes.
ALTER TABLE public.products ADD COLUMN tva_rate numeric(4,2);

-- Seed : Pommes de terre + Oignons → 5,5 % (TVA alimentaire FR).
-- À vérifier dans l'UI après application.
UPDATE public.products SET tva_rate = 5.50 WHERE tva_rate IS NULL;

-- NOT NULL maintenant que toutes les lignes ont une valeur.
-- Pas de DEFAULT : les nouveaux produits doivent renseigner explicitement.
ALTER TABLE public.products ALTER COLUMN tva_rate SET NOT NULL;

-- ── 2. varieties.tva_rate ────────────────────────────────────────────────────
-- NULL = hérite du produit. Renseigner uniquement pour les variétés dérogatoires.
ALTER TABLE public.varieties ADD COLUMN tva_rate numeric(4,2);

-- ── 3. orders : price_basis + tva_rate ───────────────────────────────────────
-- price_basis : ENUM public.price_basis (non text). Nullable : le trigger remplit
-- toujours, mais on tolère des ordres sans offre source (offer_id nullable).
ALTER TABLE public.orders ADD COLUMN price_basis public.price_basis;
ALTER TABLE public.orders ADD COLUMN tva_rate     numeric(4,2);

-- ── 4. Fonction centralisée de calcul du total ───────────────────────────────
-- Miroir SQL de lib/utils/price.ts → computeTotal() :
--   per_tonne     : unit_price × quantity × (weight_kg / 1000)
--   per_container : unit_price × quantity
--   total         : unit_price  (forfait = le prix saisi EST le total)
--
-- LANGUAGE plpgsql (pas sql) pour pouvoir RAISE sur une branche inconnue.
-- STABLE (pas IMMUTABLE) pour cohérence avec un corps plpgsql à side-effect potentiel.
-- SET search_path : defense-in-depth pour toutes les fonctions SECURITY DEFINER-adjacent.
CREATE OR REPLACE FUNCTION public.compute_order_total(
  p_unit_price  numeric,
  p_quantity    integer,
  p_weight_kg   numeric,        -- NULL autorisé (ignoré pour per_container / total)
  p_price_basis public.price_basis
)
RETURNS numeric(12,2)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_result numeric(12,2);
BEGIN
  CASE p_price_basis
    WHEN 'per_tonne'     THEN
      v_result := (p_unit_price * p_quantity * COALESCE(p_weight_kg, 0) / 1000)::numeric(12,2);
    WHEN 'per_container' THEN
      v_result := (p_unit_price * p_quantity)::numeric(12,2);
    WHEN 'total'         THEN
      v_result := p_unit_price::numeric(12,2);
    ELSE
      RAISE EXCEPTION 'compute_order_total: price_basis inconnu : %', p_price_basis;
  END CASE;
  RETURN v_result;
END;
$$;

-- ── 5. Backfill des commandes existantes ─────────────────────────────────────
-- Recalcule total_price via compute_order_total pour corriger l'ancienne formule
-- incorrecte (v_total := unit_price * quantity, ignorait weight_kg et price_basis).
-- Commande `delivered` : total_price 600 000 → 3 000 (per_tonne, 5 kg, 1000 colis)
-- Commande `accepted`  : total_price 4 500 → 4 500 (inchangé par coïncidence)
-- La table cible (o) ne peut pas être référencée dans les ON d'un JOIN FROM.
-- Solution : tables séparées par virgule, conditions de jointure dans WHERE.
UPDATE public.orders o
SET
  price_basis = of.price_basis,
  tva_rate    = COALESCE(v.tva_rate, p.tva_rate),
  total_price = public.compute_order_total(
                  o.unit_price,
                  o.quantity,
                  f.weight_kg,
                  of.price_basis
                )
FROM public.offers    of,
     public.varieties v,
     public.products  p,
     public.formats   f
WHERE of.id      = o.offer_id
  AND v.id       = of.variety_id
  AND p.id       = v.product_id
  AND f.id       = o.format_id
  AND o.offer_id IS NOT NULL;

-- ── 6. Trigger snapshot corrigé ──────────────────────────────────────────────
-- Corrections vs version initiale (00003) :
--   - Récupère weight_kg depuis formats (requis pour per_tonne)
--   - Calcul total via compute_order_total (même logique que TS computeTotal)
--   - Copie price_basis (enum) depuis l'offre
--   - Copie tva_rate effective : varieties.tva_rate ?? products.tva_rate
--   - SET search_path : sécurité SECURITY DEFINER (cohérent avec toutes les fonctions)
CREATE OR REPLACE FUNCTION public.snapshot_order_from_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_last_round   public.offer_rounds%ROWTYPE;
  v_product_name text;
  v_variety_name text;
  v_format_name  text;
  v_weight_kg    numeric;
  v_price_basis  public.price_basis;
  v_tva_rate     numeric(4,2);
  v_total        numeric(12,2);
BEGIN
  IF NEW.status <> 'accepted' OR OLD.status = 'accepted' THEN
    RETURN NEW;
  END IF;

  -- Dernier round = prix accepté
  SELECT * INTO v_last_round
  FROM public.offer_rounds
  WHERE offer_id = NEW.id
  ORDER BY round_number DESC
  LIMIT 1;

  IF v_last_round IS NULL THEN
    v_last_round.unit_price := 0;
  END IF;

  -- Noms snapshot + weight_kg du format (nécessaire pour per_tonne)
  SELECT name INTO v_product_name FROM public.products  WHERE id = NEW.product_id;
  SELECT name INTO v_variety_name FROM public.varieties WHERE id = NEW.variety_id;
  SELECT name, weight_kg INTO v_format_name, v_weight_kg
  FROM public.formats WHERE id = NEW.format_id;

  -- TVA effective : surcharge variété si renseignée, sinon taux produit
  SELECT COALESCE(v.tva_rate, p.tva_rate)
  INTO v_tva_rate
  FROM public.varieties v
  JOIN public.products  p ON p.id = v.product_id
  WHERE v.id = NEW.variety_id;

  -- price_basis figé depuis l'offre (enum, pas de cast text)
  SELECT price_basis INTO v_price_basis
  FROM public.offers WHERE id = NEW.id;

  -- Total selon la base de prix (miroir de TS computeTotal)
  v_total := public.compute_order_total(
    v_last_round.unit_price,
    NEW.quantity,
    v_weight_kg,
    v_price_basis
  );

  INSERT INTO public.orders (
    offer_id, company_id,
    product_id, variety_id, format_id,
    product_name, variety_name, format_name,
    quantity, unit_price, total_price, price_basis, tva_rate,
    status, delivery_date
  ) VALUES (
    NEW.id, NEW.company_id,
    NEW.product_id, NEW.variety_id, NEW.format_id,
    v_product_name,
    COALESCE(v_variety_name, ''),
    COALESCE(v_format_name, ''),
    NEW.quantity,
    v_last_round.unit_price,
    v_total,
    v_price_basis,
    v_tva_rate,
    'accepted',
    NEW.requested_date
  );

  RETURN NEW;
END;
$$;
