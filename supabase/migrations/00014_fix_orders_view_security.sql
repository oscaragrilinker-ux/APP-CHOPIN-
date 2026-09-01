-- Migration 00014 — Correction de orders_for_conditionnement
--
-- Problème : WITH (security_invoker = true) évaluait la RLS de orders avec les
-- droits du rôle conditionnement. Ce rôle n'a aucune SELECT policy sur orders
-- (intentionnel : il ne doit pas voir les prix). Résultat : zéro ligne retournée.
--
-- Fix : suppression de security_invoker = true (retour au défaut false = droits
-- du propriétaire de la vue, postgres, qui bypass RLS).
-- WHERE public.get_user_role() = 'conditionnement' garantit que seuls les
-- utilisateurs conditionnement reçoivent des données — les autres rôles voient
-- zéro ligne même si la vue est accessible en SELECT.
-- unit_price et total_price restent délibérément exclus du SELECT.
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
  o.notes,
  o.created_at,
  o.updated_at,
  c.name AS company_name
FROM public.orders o
JOIN public.companies c ON c.id = o.company_id
WHERE public.get_user_role() = 'conditionnement';
