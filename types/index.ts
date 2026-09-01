export type Role =
  | 'admin'
  | 'secretaire'
  | 'conditionnement'
  | 'responsable_conditionnement'
  | 'client_pro'
  | 'super_admin'

/** Rôles de l'atelier : mêmes données, jamais les prix. */
export const ATELIER_ROLES: Role[] = ['conditionnement', 'responsable_conditionnement']

export type PriceBasis = 'per_tonne' | 'per_container' | 'total'

export type OfferStatus =
  | 'pending'
  | 'accepted'
  | 'refused'
  | 'counter_proposed'
  | 'cancelled'

export type OrderStatus =
  | 'accepted'
  | 'in_preparation'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'cancelled'

export type NotificationType =
  | 'new_offer'
  | 'offer_response'
  | 'order_status'
  | 'invoice_overdue'
  | 'system'

export type Profile = {
  id: string
  role: Role
  first_name: string | null
  last_name: string | null
  phone: string | null
  avatar_url: string | null
}

export type AppNotification = {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

// ── Catalogue ──────────────────────────────────────────────

export type FormatFull = {
  id: string
  name: string
  description: string | null
  weight_kg: number | null
  packaging_type: string | null
  material: string | null
  dimensions: string | null
  sku: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// Liaison variété ↔ format du parc (via variety_formats)
export type VarietyFormatLink = {
  format_id: string
  format: {
    id: string
    name: string
    weight_kg: number | null
    packaging_type: string | null
    is_active: boolean
  } | null
}

export type VarietyWithFormats = {
  id: string
  product_id: string
  name: string
  description: string | null
  caliber: string | null
  quality_grade: string | null
  tva_rate: number | null   // NULL = hérite de products.tva_rate
  is_active: boolean
  created_at: string
  updated_at: string
  variety_formats: VarietyFormatLink[]
}

export type ProductWithTree = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  season: string | null
  tva_rate: number   // NOT NULL — obligatoire à la création
  is_active: boolean
  created_at: string
  updated_at: string
  varieties: VarietyWithFormats[]
}

// ── Offres ─────────────────────────────────────────────────

export type Offer = {
  id: string
  company_id: string
  created_by: string
  product_id: string
  variety_id: string | null
  format_id: string | null
  quantity: number
  price_basis: PriceBasis
  status: OfferStatus
  requested_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type OfferRound = {
  id: string
  offer_id: string
  round_number: number
  author_role: 'client' | 'admin'
  author_id: string
  unit_price: number
  message: string | null
  created_at: string
}

export type OfferWithRounds = Offer & {
  company: { id: string; name: string } | null
  product: { id: string; name: string } | null
  variety: { id: string; name: string } | null
  format: { id: string; name: string; weight_kg: number | null } | null
  offer_rounds: OfferRound[]
}

// ── Commandes ──────────────────────────────────────────────

export type Order = {
  id: string
  offer_id: string | null
  company_id: string
  product_id: string
  variety_id: string | null
  format_id: string | null
  product_name: string
  variety_name: string
  format_name: string
  quantity: number
  unit_price: number
  total_price: number
  price_basis: PriceBasis | null
  tva_rate: number | null
  status: OrderStatus
  delivery_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type OrderWithDetails = Order & {
  company: { id: string; name: string } | null
  offer: { id: string; price_basis: PriceBasis } | null
}

export type OrderForConditionnement = Omit<Order, 'unit_price' | 'total_price'> & {
  company_name: string
  carrier_name: string | null
  format_weight_kg: number | null
  delivery_time: string | null
  pickup_location: string | null
  delivery_location: string | null
  transport_notes: string | null
  priority_pinned_at: string | null
}

// ── Transport ───────────────────────────────────────────────

export type Carrier = {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address_line1: string | null
  postal_code: string | null
  city: string | null
  notes: string | null
  is_active: boolean
}

// ── Fiches palette ──────────────────────────────────────────

export type PalletKind = 'europe' | 'perdue' | 'plastique' | 'demi_palette' | 'autre'

export type StrappingKind =
  | 'film'
  | 'cerclage_plastique'
  | 'cerclage_metal'
  | 'coiffe_cerclage'
  | 'aucun'

export const PALLET_KIND_LABELS: Record<PalletKind, string> = {
  europe:       'Palette Europe 80×120',
  perdue:       'Palette perdue',
  plastique:    'Palette plastique',
  demi_palette: 'Demi-palette 60×80',
  autre:        'Autre',
}

export const STRAPPING_LABELS: Record<StrappingKind, string> = {
  film:              'Film étirable',
  cerclage_plastique: 'Cerclage plastique',
  cerclage_metal:    'Cerclage métal',
  coiffe_cerclage:   'Coiffe + cerclage',
  aucun:             'Aucun',
}

export type PalletSheet = {
  id: string
  order_id: string
  bl_number: string | null
  lot_number: string
  lot_date: string          // YYYY-MM-DD
  pallet_count: number
  pallet_kind: PalletKind
  packaging_type: string | null
  parcel_count: number | null
  strapping: StrappingKind
  net_weight_kg: number | null
  operator_name: string | null
  prepared_by: string | null
  prepared_at: string
  notes: string | null
}

// ── Bons de commande ────────────────────────────────────────

export type BonDeCommande = {
  id: string
  bc_number: number
  order_id: string
  bc_date: string          // YYYY-MM-DD
  generated_at: string
  generated_by: string | null
}

