export type Role = 'admin' | 'secretaire' | 'conditionnement' | 'client_pro' | 'super_admin'

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
