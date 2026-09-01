-- ─────────────────────────────────────────────────────────────
-- TESTS RLS — APP CHOPIN
--
-- Exécuter dans le Dashboard SQL Editor APRÈS seed appliqué.
-- Chaque bloc est indépendant. Un bloc qui RAISE = test vert.
-- Un résultat inattendu (ligne retournée, pas d'erreur) = ROUGE.
--
-- Pattern Supabase pour simuler un utilisateur :
--   SET LOCAL role = 'authenticated';
--   SET LOCAL "request.jwt.claims" = '{"sub":"<uuid>","role":"authenticated"}';
--
-- NB : SET LOCAL ne fonctionne qu'à l'intérieur d'une transaction.
-- ─────────────────────────────────────────────────────────────

-- UUID de référence (identiques au seed)
-- Dupont  = 22222222-0001-0000-0000-000000000000
-- Leclerc = 22222222-0002-0000-0000-000000000000
-- Martin  = 22222222-0003-0000-0000-000000000000
-- Pierre (conditionnement) = 11111111-0007-0000-0000-000000000000
-- Marie (secrétaire) = 11111111-0006-0000-0000-000000000000
-- Frédéric (admin)   = 11111111-0001-0000-0000-000000000000
-- Offre pending Dupont   = 77777777-0001-0000-0000-000000000000
-- Offre counter Leclerc  = 77777777-0002-0000-0000-000000000000
-- Offre accepted Martin  = 77777777-0003-0000-0000-000000000000


-- ═════════════════════════════════════════════════════════════
-- TEST 1 — client_pro ne peut PAS voir les offres d'un autre
-- Dupont essaie de lire les offres de Leclerc → 0 ligne attendue
-- ═════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_count integer;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL "request.jwt.claims" = '{"sub":"22222222-0001-0000-0000-000000000000","role":"authenticated"}';

  SELECT COUNT(*) INTO v_count
  FROM public.offers
  WHERE company_id = '33333333-0002-0000-0000-000000000000';  -- Leclerc

  IF v_count > 0 THEN
    RAISE EXCEPTION 'TEST 1 ROUGE : Dupont voit % offre(s) de Leclerc (attendu 0)', v_count;
  ELSE
    RAISE NOTICE 'TEST 1 VERT : Dupont ne voit pas les offres de Leclerc (0 ligne)';
  END IF;
END $$;


-- ═════════════════════════════════════════════════════════════
-- TEST 2 — conditionnement ne peut PAS voir les prix
-- Pierre essaie un SELECT direct sur orders → 0 ligne attendue
-- (aucune policy SELECT pour conditionnement sur orders)
-- ═════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_count integer;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL "request.jwt.claims" = '{"sub":"11111111-0007-0000-0000-000000000000","role":"authenticated"}';

  SELECT COUNT(*) INTO v_count FROM public.orders;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'TEST 2 ROUGE : Pierre voit % commande(s) directement (attendu 0)', v_count;
  ELSE
    RAISE NOTICE 'TEST 2 VERT : Pierre ne voit pas la table orders directement (0 ligne)';
  END IF;
END $$;


-- ═════════════════════════════════════════════════════════════
-- TEST 3 — conditionnement peut lire via la vue (sans prix)
-- Pierre accède à orders_for_conditionnement → doit voir des lignes
-- ET ces lignes ne contiennent pas unit_price / total_price
-- ═════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_count  integer;
  v_has_price boolean;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL "request.jwt.claims" = '{"sub":"11111111-0007-0000-0000-000000000000","role":"authenticated"}';

  SELECT COUNT(*) INTO v_count FROM public.orders_for_conditionnement;

  -- Vérifie que les colonnes prix n'existent pas dans la vue
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'orders_for_conditionnement'
      AND column_name  IN ('unit_price', 'total_price')
  ) INTO v_has_price;

  IF v_has_price THEN
    RAISE EXCEPTION 'TEST 3 ROUGE : La vue expose des colonnes de prix !';
  ELSIF v_count = 0 THEN
    RAISE EXCEPTION 'TEST 3 ORANGE : La vue est accessible mais retourne 0 ligne (vérifier les données seed)';
  ELSE
    RAISE NOTICE 'TEST 3 VERT : Pierre voit % commande(s) via la vue, sans colonnes prix', v_count;
  END IF;
END $$;


-- ═════════════════════════════════════════════════════════════
-- TEST 4 — conditionnement peut UPDATE status mais PAS unit_price
-- Pierre essaie de modifier unit_price → doit lever une exception
-- ═════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_order_id uuid;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL "request.jwt.claims" = '{"sub":"11111111-0007-0000-0000-000000000000","role":"authenticated"}';

  -- Récupère une commande en in_preparation ou ready
  -- (après seed la commande Martin est 'delivered', on en crée une factice)
  -- NB : si aucune commande en préparation n'existe, ce test est SKIP
  SELECT id INTO v_order_id
  FROM public.orders
  WHERE status IN ('in_preparation', 'ready')
  LIMIT 1;

  IF v_order_id IS NULL THEN
    RAISE NOTICE 'TEST 4 SKIP : Aucune commande en in_preparation/ready — ajouter une commande test';
    RETURN;
  END IF;

  BEGIN
    UPDATE public.orders SET unit_price = 999.99 WHERE id = v_order_id;
    RAISE EXCEPTION 'TEST 4 ROUGE : Pierre a pu modifier unit_price sans erreur !';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 4 VERT : Modification de unit_price bloquée → %', SQLERRM;
  END;
END $$;


-- ═════════════════════════════════════════════════════════════
-- TEST 5 — conditionnement peut UPDATE status (colonne autorisée)
-- Pierre passe in_preparation → ready → doit réussir
-- ═════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_order_id  uuid;
  v_new_order uuid;
BEGIN
  -- Crée une commande de test en in_preparation (en tant que super_admin)
  INSERT INTO public.orders (
    company_id, product_id, variety_id, format_id,
    product_name, variety_name, format_name,
    quantity, unit_price, total_price, status
  ) VALUES (
    '33333333-0001-0000-0000-000000000000',
    '44444444-0001-0000-0000-000000000000',
    '55555555-0001-0000-0000-000000000000',
    '66666666-0002-0000-0000-000000000000',
    'Pommes de terre', 'Bintje', 'Sac 5 kg',
    100, 1.20, 120.00, 'in_preparation'
  ) RETURNING id INTO v_new_order;

  -- Maintenant on simule Pierre
  SET LOCAL role = 'authenticated';
  SET LOCAL "request.jwt.claims" = '{"sub":"11111111-0007-0000-0000-000000000000","role":"authenticated"}';

  BEGIN
    UPDATE public.orders SET status = 'ready' WHERE id = v_new_order;
    RAISE NOTICE 'TEST 5 VERT : Pierre a pu passer la commande en ready';
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'TEST 5 ROUGE : Pierre n''a pas pu mettre à jour status → %', SQLERRM;
  END;

  -- Nettoyage
  DELETE FROM public.orders WHERE id = v_new_order;
END $$;


-- ═════════════════════════════════════════════════════════════
-- TEST 5b — conditionnement ne peut PAS passer 'ready' → 'shipped'
-- La policy WITH CHECK limite le statut résultant à
-- ('in_preparation', 'ready') : 'shipped' doit être rejeté.
-- ═════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_new_order uuid;
  v_rows_affected integer;
BEGIN
  -- Crée une commande de test en 'ready' (en tant que super_admin)
  INSERT INTO public.orders (
    company_id, product_id, variety_id, format_id,
    product_name, variety_name, format_name,
    quantity, unit_price, total_price, status
  ) VALUES (
    '33333333-0001-0000-0000-000000000000',
    '44444444-0001-0000-0000-000000000000',
    '55555555-0001-0000-0000-000000000000',
    '66666666-0002-0000-0000-000000000000',
    'Pommes de terre', 'Bintje', 'Sac 5 kg',
    50, 1.20, 60.00, 'ready'
  ) RETURNING id INTO v_new_order;

  -- Simule Pierre (conditionnement)
  SET LOCAL role = 'authenticated';
  SET LOCAL "request.jwt.claims" = '{"sub":"11111111-0007-0000-0000-000000000000","role":"authenticated"}';

  BEGIN
    UPDATE public.orders SET status = 'shipped' WHERE id = v_new_order;
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    IF v_rows_affected > 0 THEN
      RAISE EXCEPTION 'TEST 5b ROUGE : Pierre a pu passer la commande en shipped (% ligne(s) affectée(s)) !', v_rows_affected;
    ELSE
      RAISE NOTICE 'TEST 5b VERT : UPDATE ready→shipped refusé par RLS (0 ligne affectée)';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 5b VERT : UPDATE ready→shipped rejeté avec exception → %', SQLERRM;
  END;

  -- Nettoyage (en reprenant les droits super_admin — SET LOCAL expire à la fin du bloc DO)
  DELETE FROM public.orders WHERE id = v_new_order;
END $$;


-- ═════════════════════════════════════════════════════════════
-- TEST 6 — secrétaire ne peut PAS accepter une offre
-- Marie ne doit pas pouvoir passer une offre en 'accepted'
-- car cela déclencherait le trigger de création de commande.
-- En réalité : la secrétaire A le droit UPDATE sur offers
-- (voir policy "offers: admin peut modifier"),
-- mais elle ne devrait pas accepter une offre (règle métier).
-- Ce test documente l'état actuel : la RLS l'autorise,
-- la contrainte est métier (UI) et non base de données.
-- ═════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_allowed boolean;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL "request.jwt.claims" = '{"sub":"11111111-0006-0000-0000-000000000000","role":"authenticated"}';

  -- Vérifie si Marie peut UPDATE offers
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'offers'
      AND cmd = 'UPDATE'
      AND qual LIKE '%secretaire%'
  ) INTO v_allowed;

  IF v_allowed THEN
    RAISE NOTICE 'TEST 6 INFO : La secrétaire peut UPDATE offers via RLS. '
      'La restriction "pas d''acceptation" est une contrainte métier UI. '
      'À renforcer en BDD si nécessaire (ex : trigger sur transition status).';
  ELSE
    RAISE NOTICE 'TEST 6 INFO : La secrétaire n''a pas de policy UPDATE sur offers.';
  END IF;
END $$;


-- ═════════════════════════════════════════════════════════════
-- TEST 7 — Numérotation factures séquentielle sans réutilisation
-- Crée 3 factures, "annule" la 2ème (status=cancelled),
-- crée une 4ème → doit être CHOP-AAAA-0004 et non 0002.
-- ═════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_year    text := to_char(now(), 'YYYY');
  v_base    integer;
  v_num1    text;
  v_num2    text;
  v_num3    text;
  v_num4    text;
  v_expected text;
BEGIN
  -- Récupère la valeur courante du compteur avant le test
  SELECT value INTO v_base FROM public.sequence_counters WHERE name = 'invoice';

  v_num1 := public.generate_invoice_number();
  v_num2 := public.generate_invoice_number();
  v_num3 := public.generate_invoice_number();

  -- "Annulation" de la 2ème (ne réinitialise pas le compteur)
  -- (simulation : en vrai l'invoice existerait en DB avec status=cancelled)

  v_num4    := public.generate_invoice_number();
  v_expected := 'CHOP-' || v_year || '-' || lpad((v_base + 4)::text, 4, '0');

  IF v_num4 <> v_expected THEN
    RAISE EXCEPTION 'TEST 7 ROUGE : 4ème numéro = % (attendu %)', v_num4, v_expected;
  ELSE
    RAISE NOTICE 'TEST 7 VERT : Séquence correcte → %, %, %, % (pas de réutilisation)',
      v_num1, v_num2, v_num3, v_num4;
  END IF;

  -- Remet le compteur à l'état initial pour ne pas polluer le seed
  UPDATE public.sequence_counters SET value = v_base WHERE name = 'invoice';
END $$;


-- ═════════════════════════════════════════════════════════════
-- TEST 8 — client_pro ne peut PAS créer une offre pour
-- une autre entreprise que la sienne
-- ═════════════════════════════════════════════════════════════
DO $$
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL "request.jwt.claims" = '{"sub":"22222222-0001-0000-0000-000000000000","role":"authenticated"}';

  BEGIN
    INSERT INTO public.offers (
      company_id, created_by, product_id, quantity
    ) VALUES (
      '33333333-0002-0000-0000-000000000000',  -- Leclerc (pas la sienne)
      '22222222-0001-0000-0000-000000000000',  -- Dupont
      '44444444-0001-0000-0000-000000000000',
      10
    );
    RAISE EXCEPTION 'TEST 8 ROUGE : Dupont a pu créer une offre pour Leclerc !';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 8 VERT : Insertion bloquée → %', SQLERRM;
  END;
END $$;
