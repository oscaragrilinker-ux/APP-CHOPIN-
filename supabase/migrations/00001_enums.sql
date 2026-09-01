-- ENUMs métier — à créer avant les tables qui en dépendent

-- Rôles utilisateurs (miroir du type TypeScript dans types/index.ts)
CREATE TYPE public.user_role AS ENUM (
  'super_admin',
  'admin',
  'secretaire',
  'conditionnement',
  'client_pro'
);

-- Cycle de vie d'une offre commerciale
-- pending → counter_proposed ↔ (négociation) → accepted | refused | cancelled
CREATE TYPE public.offer_status AS ENUM (
  'pending',
  'counter_proposed',
  'accepted',
  'refused',
  'cancelled'
);

-- Auteur d'un round de négociation (client ou admin)
CREATE TYPE public.offer_round_role AS ENUM (
  'client',
  'admin'
);

-- Cycle de vie d'une commande
-- accepted → in_preparation → ready → shipped → delivered | cancelled
CREATE TYPE public.order_status AS ENUM (
  'accepted',
  'in_preparation',
  'ready',
  'shipped',
  'delivered',
  'cancelled'
);

-- Cycle de vie d'une facture (archivage légal 10 ans)
CREATE TYPE public.invoice_status AS ENUM (
  'draft',
  'issued',
  'paid',
  'partially_paid',
  'overdue',
  'cancelled'
);

-- Modes de paiement acceptés
CREATE TYPE public.payment_method AS ENUM (
  'virement',
  'cheque',
  'especes',
  'autre'
);

-- Types de notifications dans l'interface
CREATE TYPE public.notification_type AS ENUM (
  'new_offer',
  'offer_response',
  'order_status',
  'invoice_overdue',
  'system'
);
