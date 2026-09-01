-- ─────────────────────────────────────────────────────────────
-- SEED — APP CHOPIN CONDITIONNEMENT
-- Données de test réalistes pour le développement local.
-- NE PAS appliquer en production.
--
-- Mot de passe de tous les comptes : ChopinTest2026!
--
-- ORDRE D'APPLICATION :
--   1. Appliquer les migrations 00000 → 00004
--   2. Appliquer ce fichier via Dashboard SQL Editor
--      ou : supabase db seed
-- ─────────────────────────────────────────────────────────────

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- UUID fixes pour référencer entre sections sans sous-requêtes
-- ─────────────────────────────────────────────────────────────

-- Utilisateurs staff
\set uid_frederic    '11111111-0001-0000-0000-000000000000'
\set uid_laurence    '11111111-0002-0000-0000-000000000000'
\set uid_benoit      '11111111-0003-0000-0000-000000000000'
\set uid_francois    '11111111-0004-0000-0000-000000000000'
\set uid_antoine     '11111111-0005-0000-0000-000000000000'
\set uid_marie       '11111111-0006-0000-0000-000000000000'
\set uid_pierre      '11111111-0007-0000-0000-000000000000'
\set uid_julien      '11111111-0008-0000-0000-000000000000'

-- Utilisateurs clients
\set uid_dupont      '22222222-0001-0000-0000-000000000000'
\set uid_leclerc     '22222222-0002-0000-0000-000000000000'
\set uid_martin      '22222222-0003-0000-0000-000000000000'

-- Super admin dev
\set uid_dev         '00000000-0001-0000-0000-000000000000'

-- Entreprises
\set cid_dupont      '33333333-0001-0000-0000-000000000000'
\set cid_leclerc     '33333333-0002-0000-0000-000000000000'
\set cid_martin      '33333333-0003-0000-0000-000000000000'

-- Catalogue
\set pid_pdt         '44444444-0001-0000-0000-000000000000'
\set pid_oig         '44444444-0002-0000-0000-000000000000'
\set vid_bintje      '55555555-0001-0000-0000-000000000000'
\set vid_charlotte   '55555555-0002-0000-0000-000000000000'
\set vid_monalisa    '55555555-0003-0000-0000-000000000000'
\set vid_jaune       '55555555-0004-0000-0000-000000000000'
\set vid_rouge       '55555555-0005-0000-0000-000000000000'
\set fid_carton      '66666666-0001-0000-0000-000000000000'
\set fid_sac         '66666666-0002-0000-0000-000000000000'
\set fid_bigbag      '66666666-0003-0000-0000-000000000000'

-- Offres
\set oid_pending     '77777777-0001-0000-0000-000000000000'
\set oid_counter     '77777777-0002-0000-0000-000000000000'
\set oid_accepted    '77777777-0003-0000-0000-000000000000'

-- Commande issue de l'offre acceptée
\set order_martin    '88888888-0001-0000-0000-000000000000'

-- Facture
\set inv_martin      '99999999-0001-0000-0000-000000000000'

-- ─────────────────────────────────────────────────────────────
-- AUTH.USERS
-- Insertion directe dans la table interne Supabase.
-- Le mot de passe 'ChopinTest2026!' est hashé en bcrypt.
-- Supabase utilise auth.create_user() en interne mais on passe
-- par auth.users directement pour le seed (approche recommandée
-- dans la doc Supabase pour les seeds de test).
--
-- Le hash bcrypt ci-dessous correspond à 'ChopinTest2026!'
-- généré avec : SELECT crypt('ChopinTest2026!', gen_salt('bf'));
-- (résultat variable — remplacez si nécessaire avec votre propre hash)
-- ─────────────────────────────────────────────────────────────

INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password,
  email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, confirmation_token, recovery_token,
  email_change_token_new, email_change
) VALUES
  -- Staff Chopin — admins
  (:'uid_frederic', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'frederic.chopin@chopin-test.fr',
   crypt('ChopinTest2026!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"first_name":"Frédéric","last_name":"Chopin"}',
   false, '', '', '', ''),

  (:'uid_laurence', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'laurence.chopin@chopin-test.fr',
   crypt('ChopinTest2026!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"first_name":"Laurence","last_name":"Chopin"}',
   false, '', '', '', ''),

  (:'uid_benoit', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'benoit.chopin@chopin-test.fr',
   crypt('ChopinTest2026!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"first_name":"Benoît","last_name":"Chopin"}',
   false, '', '', '', ''),

  (:'uid_francois', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'francois.chopin@chopin-test.fr',
   crypt('ChopinTest2026!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"first_name":"François","last_name":"Chopin"}',
   false, '', '', '', ''),

  (:'uid_antoine', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'antoine.chopin@chopin-test.fr',
   crypt('ChopinTest2026!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"first_name":"Antoine","last_name":"Chopin"}',
   false, '', '', '', ''),

  -- Staff Chopin — secrétaire
  (:'uid_marie', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'marie.secretaire@chopin-test.fr',
   crypt('ChopinTest2026!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"first_name":"Marie","last_name":"Laurent"}',
   false, '', '', '', ''),

  -- Staff Chopin — conditionnement
  (:'uid_pierre', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pierre.conditionnement@chopin-test.fr',
   crypt('ChopinTest2026!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"first_name":"Pierre","last_name":"Moreau"}',
   false, '', '', '', ''),

  (:'uid_julien', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'julien.conditionnement@chopin-test.fr',
   crypt('ChopinTest2026!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"first_name":"Julien","last_name":"Bernard"}',
   false, '', '', '', ''),

  -- Clients pro
  (:'uid_dupont', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'contact@maraicher-dupont.fr',
   crypt('ChopinTest2026!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"first_name":"Thomas","last_name":"Dupont"}',
   false, '', '', '', ''),

  (:'uid_leclerc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'achats@primeurs-leclerc-test.fr',
   crypt('ChopinTest2026!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"first_name":"Sophie","last_name":"Leclerc"}',
   false, '', '', '', ''),

  (:'uid_martin', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'direction@legumes-martin.fr',
   crypt('ChopinTest2026!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"first_name":"Jean-Paul","last_name":"Martin"}',
   false, '', '', '', ''),

  -- Dev super_admin
  (:'uid_dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'dev@chopin-app.fr',
   crypt('ChopinTest2026!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"first_name":"Dev","last_name":"SuperAdmin"}',
   false, '', '', '', '');

-- ─────────────────────────────────────────────────────────────
-- PROFILES
-- Trigger de sync auth → profiles sera créé à l'étape 1.
-- Pour le seed, on insère manuellement.
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.profiles (id, role, first_name, last_name) VALUES
  (:'uid_frederic',  'admin',           'Frédéric',  'Chopin'),
  (:'uid_laurence',  'admin',           'Laurence',  'Chopin'),
  (:'uid_benoit',    'admin',           'Benoît',    'Chopin'),
  (:'uid_francois',  'admin',           'François',  'Chopin'),
  (:'uid_antoine',   'admin',           'Antoine',   'Chopin'),
  (:'uid_marie',     'secretaire',      'Marie',     'Laurent'),
  (:'uid_pierre',    'conditionnement', 'Pierre',    'Moreau'),
  (:'uid_julien',    'conditionnement', 'Julien',    'Bernard'),
  (:'uid_dupont',    'client_pro',      'Thomas',    'Dupont'),
  (:'uid_leclerc',   'client_pro',      'Sophie',    'Leclerc'),
  (:'uid_martin',    'client_pro',      'Jean-Paul', 'Martin'),
  (:'uid_dev',       'super_admin',     'Dev',       'SuperAdmin');

-- ─────────────────────────────────────────────────────────────
-- ENTREPRISES CLIENTES
-- SIREN fictifs (format valide mais non réels)
-- Adresses dans le Nord (région réaliste pour maraîchers)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.companies (id, name, siren, address_line1, postal_code, city, email, phone, payment_terms) VALUES
  (:'cid_dupont',
   'Maraîcher Dupont',
   '123456789',
   '12 Route des Champs',
   '59000', 'Lille',
   'contact@maraicher-dupont.fr',
   '03 20 00 11 22',
   30),

  (:'cid_leclerc',
   'Primeurs Leclerc Test',
   '987654321',
   '47 Avenue du Marché',
   '59300', 'Valenciennes',
   'achats@primeurs-leclerc-test.fr',
   '03 27 00 33 44',
   45),

  (:'cid_martin',
   'Légumes Martin SARL',
   '456789123',
   '3 Impasse de la Ferme',
   '59400', 'Cambrai',
   'direction@legumes-martin.fr',
   '03 27 00 55 66',
   30);

-- ─────────────────────────────────────────────────────────────
-- LIAISONS CLIENT ↔ ENTREPRISE
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.client_users (user_id, company_id) VALUES
  (:'uid_dupont',  :'cid_dupont'),
  (:'uid_leclerc', :'cid_leclerc'),
  (:'uid_martin',  :'cid_martin');

-- ─────────────────────────────────────────────────────────────
-- CATALOGUE
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.products (id, name) VALUES
  (:'pid_pdt', 'Pommes de terre'),
  (:'pid_oig', 'Oignons');

INSERT INTO public.varieties (id, product_id, name) VALUES
  (:'vid_bintje',    :'pid_pdt', 'Bintje'),
  (:'vid_charlotte', :'pid_pdt', 'Charlotte'),
  (:'vid_monalisa',  :'pid_pdt', 'Monalisa'),
  (:'vid_jaune',     :'pid_oig', 'Jaune doux'),
  (:'vid_rouge',     :'pid_oig', 'Rouge');

INSERT INTO public.formats (id, name, weight_kg) VALUES
  (:'fid_carton', 'Carton 2,5 kg',  2.5),
  (:'fid_sac',    'Sac 5 kg',       5.0),
  (:'fid_bigbag', 'Big bag 25 kg', 25.0);

-- ─────────────────────────────────────────────────────────────
-- OFFRES
-- 3 offres dans des états différents pour tester les workflows
-- ─────────────────────────────────────────────────────────────

-- Offre 1 : en attente de réponse Chopin (Dupont)
INSERT INTO public.offers (id, company_id, created_by, product_id, variety_id, format_id, quantity, status, requested_date, notes)
VALUES (
  :'oid_pending',
  :'cid_dupont',
  :'uid_dupont',
  :'pid_pdt',
  :'vid_bintje',
  :'fid_sac',
  500,
  'pending',
  CURRENT_DATE + 14,
  'Besoin urgent pour approvisionnement semaine 26. Qualité extra souhaitée.'
);

-- Offre 2 : en cours de négociation avec 2 rounds (Leclerc)
INSERT INTO public.offers (id, company_id, created_by, product_id, variety_id, format_id, quantity, status, requested_date)
VALUES (
  :'oid_counter',
  :'cid_leclerc',
  :'uid_leclerc',
  :'pid_oig',
  :'vid_jaune',
  :'fid_carton',
  1200,
  'counter_proposed',
  CURRENT_DATE + 21
);

-- Rounds de négociation de l'offre Leclerc
-- Round 1 : proposition client (sans prix explicite → admin répond)
INSERT INTO public.offer_rounds (offer_id, round_number, author_role, author_id, unit_price, message)
VALUES
  (:'oid_counter', 1, 'client', :'uid_leclerc', 0.85,
   'Je propose 0,85 € / kg pour 1 200 cartons. Budget serré ce mois-ci.'),

  (:'oid_counter', 2, 'admin', :'uid_frederic', 0.92,
   'Nous ne pouvons pas descendre sous 0,92 € pour cette quantité. Qualité premium garantie, calibre 45-55 mm.');

-- Offre 3 : acceptée → commande créée via trigger (Martin)
-- On insère l'offre + le round d'abord, PUIS on passe en 'accepted'
-- pour que le trigger snapshot_order_from_offer se déclenche.
INSERT INTO public.offers (id, company_id, created_by, product_id, variety_id, format_id, quantity, status, requested_date)
VALUES (
  :'oid_accepted',
  :'cid_martin',
  :'uid_martin',
  :'pid_pdt',
  :'vid_charlotte',
  :'fid_bigbag',
  80,
  'pending',  -- temporaire, on va passer à 'accepted' après le round
  CURRENT_DATE - 7
);

INSERT INTO public.offer_rounds (offer_id, round_number, author_role, author_id, unit_price, message)
VALUES
  (:'oid_accepted', 1, 'client', :'uid_martin', 1.10,
   'Commande régulière mensuelle, prix habituel.'),
  (:'oid_accepted', 2, 'admin', :'uid_antoine', 1.15,
   'Accord pour 1,15 € / kg. Livraison prévue fin de semaine.'),
  (:'oid_accepted', 3, 'client', :'uid_martin', 1.15,
   'Parfait, c''est validé de notre côté.');

-- Passage en 'accepted' → le trigger crée la commande automatiquement
UPDATE public.offers SET status = 'accepted' WHERE id = :'oid_accepted';

-- ─────────────────────────────────────────────────────────────
-- COMMANDE LIVRÉE (récupère l'id créé par le trigger)
-- Le trigger a créé la commande avec offer_id = oid_accepted.
-- On la passe directement en 'delivered' pour tester le workflow.
-- ─────────────────────────────────────────────────────────────
UPDATE public.orders
SET
  status        = 'delivered',
  delivery_date = CURRENT_DATE - 2,
  updated_at    = now()
WHERE offer_id = :'oid_accepted';

-- Récupère l'id de la commande pour la fiche palette et la facture
DO $$
DECLARE
  v_order_id uuid;
  v_inv_num  text;
  v_inv_id   uuid := '99999999-0001-0000-0000-000000000000';
BEGIN
  SELECT id INTO v_order_id FROM public.orders WHERE offer_id = '77777777-0003-0000-0000-000000000000';

  -- ─── Fiche palette ───────────────────────────────────────
  INSERT INTO public.pallet_sheets (order_id, lot_number, pallet_count, prepared_by, prepared_at)
  VALUES (
    v_order_id,
    'LOT-2026-' || to_char(CURRENT_DATE - 4, 'MMDD') || '-001',
    4,
    '11111111-0007-0000-0000-000000000000',  -- Pierre
    CURRENT_DATE - 4
  );

  -- ─── Numéro de facture séquentiel ───────────────────────
  v_inv_num := public.generate_invoice_number();

  -- ─── Facture émise ───────────────────────────────────────
  -- Charlotte big bag 25 kg × 80 à 1,15 € = 92,00 € HT
  -- TVA 5,5 % (produits alimentaires frais)
  INSERT INTO public.invoices (
    id, order_id, company_id, invoice_number, status,
    issued_at, due_date,
    subtotal, tax_rate, tax_amount, total,
    amount_paid
  ) VALUES (
    v_inv_id,
    v_order_id,
    '33333333-0003-0000-0000-000000000000',  -- Martin
    v_inv_num,
    'issued',
    CURRENT_DATE - 1,
    CURRENT_DATE + 29,  -- 30 jours
    92.00, 5.50, 5.06, 97.06,
    0
  );

  -- ─── Notifications variées ───────────────────────────────
  -- 1. Notif non lue pour Frédéric : offre Dupont en attente
  INSERT INTO public.notifications (user_id, type, title, body, link, is_read)
  VALUES (
    '11111111-0001-0000-0000-000000000000',
    'new_offer',
    'Nouvelle offre reçue',
    'Maraîcher Dupont — Pommes de terre ×500',
    '/offres/' || '77777777-0001-0000-0000-000000000000',
    false
  );

  -- 2. Notif lue pour Sophie Leclerc : contre-proposition reçue
  INSERT INTO public.notifications (user_id, type, title, body, link, is_read)
  VALUES (
    '22222222-0002-0000-0000-000000000000',
    'offer_response',
    'Réponse à votre offre',
    'Chopin Conditionnement a fait une contre-proposition à 0,92 €/kg',
    '/offres/' || '77777777-0002-0000-0000-000000000000',
    true
  );

  -- 3. Notif non lue pour Jean-Paul Martin : facture émise
  INSERT INTO public.notifications (user_id, type, title, body, link, is_read)
  VALUES (
    '22222222-0003-0000-0000-000000000000',
    'invoice_overdue',
    'Facture émise',
    v_inv_num || ' — 97,06 € — échéance dans 29 jours',
    '/facturation/' || v_inv_id,
    false
  );

END $$;

COMMIT;
