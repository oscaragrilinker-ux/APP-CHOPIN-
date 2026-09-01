-- ─────────────────────────────────────────────────────────────
-- TABLES CHOPIN CONDITIONNEMENT
-- Ordre de création respecte les dépendances FK
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- Séquences — table dédiée pour les numéros de facture
-- Isolée ici pour être créée avant invoices
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.sequence_counters (
  name  text PRIMARY KEY,
  value integer NOT NULL DEFAULT 0
);

INSERT INTO public.sequence_counters (name, value) VALUES ('invoice', 0);

-- ─────────────────────────────────────────────────────────────
-- Profils utilisateurs
-- Extension de auth.users : 1 ligne par utilisateur Supabase
-- Synchronisé via trigger depuis auth.users (étape 1)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role         public.user_role NOT NULL DEFAULT 'client_pro',
  first_name   text,
  last_name    text,
  phone        text,
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);

-- ─────────────────────────────────────────────────────────────
-- Entreprises clientes
-- Une entreprise peut avoir plusieurs contacts (client_users)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  siren           text UNIQUE,
  address_line1   text,
  address_line2   text,
  postal_code     text,
  city            text,
  country         text NOT NULL DEFAULT 'France',
  email           text,
  phone           text,
  payment_terms   integer NOT NULL DEFAULT 30,  -- jours
  notes           text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_companies_name_trgm ON public.companies USING gin(name gin_trgm_ops);
CREATE INDEX idx_companies_is_active ON public.companies(is_active);

-- ─────────────────────────────────────────────────────────────
-- Liaison utilisateurs ↔ entreprises
-- Un client_pro peut être rattaché à plusieurs entreprises
-- (ex : directeur multi-sites) mais cas rare
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.client_users (
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, company_id)
);

CREATE INDEX idx_client_users_company ON public.client_users(company_id);

-- ─────────────────────────────────────────────────────────────
-- Catalogue : produits
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.products (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_name_trgm ON public.products USING gin(name gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────
-- Variétés (liées à un produit)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.varieties (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  name       text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_varieties_product ON public.varieties(product_id);

-- ─────────────────────────────────────────────────────────────
-- Formats de conditionnement (indépendants des produits)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.formats (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  weight_kg    numeric(8,3),
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Offres commerciales
-- Cycle : pending → négociation → accepted/refused/cancelled
-- Initiée par un client_pro, traitée par admin/secrétaire
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.offers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_by      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variety_id      uuid REFERENCES public.varieties(id) ON DELETE RESTRICT,
  format_id       uuid REFERENCES public.formats(id) ON DELETE RESTRICT,
  quantity        integer NOT NULL CHECK (quantity > 0),
  status          public.offer_status NOT NULL DEFAULT 'pending',
  requested_date  date,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_offers_company    ON public.offers(company_id);
CREATE INDEX idx_offers_status     ON public.offers(status);
CREATE INDEX idx_offers_created_by ON public.offers(created_by);
CREATE INDEX idx_offers_created_at ON public.offers(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- Rounds de négociation d'une offre
-- Chaque proposition (client ou admin) crée un nouveau round
-- Les prix sont figés dans le round → snapshot immuable
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.offer_rounds (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id       uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  round_number   integer NOT NULL,
  author_role    public.offer_round_role NOT NULL,
  author_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  unit_price     numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  message        text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offer_id, round_number)
);

CREATE INDEX idx_offer_rounds_offer ON public.offer_rounds(offer_id);

-- ─────────────────────────────────────────────────────────────
-- Commandes
-- Créées automatiquement à l'acceptation d'une offre
-- Les prix sont copiés depuis l'offer_round final (snapshot)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id        uuid REFERENCES public.offers(id) ON DELETE RESTRICT,
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variety_id      uuid REFERENCES public.varieties(id) ON DELETE RESTRICT,
  format_id       uuid REFERENCES public.formats(id) ON DELETE RESTRICT,
  -- Prix figés au moment de l'acceptation (snapshot)
  product_name    text NOT NULL,
  variety_name    text,
  format_name     text,
  quantity        integer NOT NULL CHECK (quantity > 0),
  unit_price      numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price     numeric(12,2) NOT NULL CHECK (total_price >= 0),
  status          public.order_status NOT NULL DEFAULT 'accepted',
  delivery_date   date,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_company    ON public.orders(company_id);
CREATE INDEX idx_orders_status     ON public.orders(status);
CREATE INDEX idx_orders_offer      ON public.orders(offer_id);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- Fiches palette (liées à une commande)
-- Générées lors de la préparation, permettent le suivi lot
-- Imprimées en PDF côté serveur (route /api/pdf/pallet-sheet)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.pallet_sheets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  lot_number     text NOT NULL,
  -- lot_date stocké explicitement pour la contrainte d'unicité journalière
  -- (timestamptz::date n'est pas IMMUTABLE → ne peut pas être utilisé dans un index)
  lot_date       date NOT NULL DEFAULT CURRENT_DATE,
  pallet_count   integer NOT NULL DEFAULT 1 CHECK (pallet_count > 0),
  prepared_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  prepared_at    timestamptz NOT NULL DEFAULT now(),
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  -- Un n° de lot unique par jour
  UNIQUE (lot_number, lot_date)
);

CREATE INDEX idx_pallet_sheets_order ON public.pallet_sheets(order_id);

-- ─────────────────────────────────────────────────────────────
-- Factures
-- Archivage légal 10 ans — jamais supprimées, seulement
-- annulées (status = 'cancelled'). PDF stocké dans Storage.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.invoices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  company_id       uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  invoice_number   text NOT NULL UNIQUE,  -- format CHOP-AAAA-NNNN
  status           public.invoice_status NOT NULL DEFAULT 'draft',
  issued_at        date,
  due_date         date,
  subtotal         numeric(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_rate         numeric(5,2) NOT NULL DEFAULT 20.00,
  tax_amount       numeric(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total            numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  amount_paid      numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  pdf_url          text,  -- URL signée Supabase Storage bucket "invoices"
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_company    ON public.invoices(company_id);
CREATE INDEX idx_invoices_status     ON public.invoices(status);
CREATE INDEX idx_invoices_order      ON public.invoices(order_id);
CREATE INDEX idx_invoices_due_date   ON public.invoices(due_date);

-- ─────────────────────────────────────────────────────────────
-- Paiements (plusieurs paiements possibles par facture)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id     uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  amount         numeric(12,2) NOT NULL CHECK (amount > 0),
  method         public.payment_method NOT NULL,
  paid_at        date NOT NULL DEFAULT CURRENT_DATE,
  reference      text,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);

-- ─────────────────────────────────────────────────────────────
-- Notifications in-app
-- Clochette en haut à droite (étape 1)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type         public.notification_type NOT NULL,
  title        text NOT NULL,
  body         text,
  link         text,
  is_read      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user    ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread  ON public.notifications(user_id) WHERE is_read = false;

-- ─────────────────────────────────────────────────────────────
-- Journal d'audit
-- Accès réservé au super_admin uniquement
-- Enregistre les actions critiques : création, modification,
-- suppression, connexion, export PDF, etc.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.activity_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action       text NOT NULL,
  table_name   text,
  record_id    uuid,
  old_values   jsonb,
  new_values   jsonb,
  ip_address   inet,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_user       ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_table      ON public.activity_log(table_name, record_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);
