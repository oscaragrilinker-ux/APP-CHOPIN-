// Matrice de permissions — source de vérité côté applicatif
// Pour les permissions RLS, voir supabase/migrations/

export type Role = 'admin' | 'secretaire' | 'conditionnement' | 'client_pro' | 'super_admin'

type Permission =
  | 'offers:submit'
  | 'offers:view_all'
  | 'offers:view_own'
  | 'offers:accept_refuse'
  | 'offers:counter_propose'
  | 'offers:cancel_own'
  | 'orders:view_all'
  | 'orders:view_own'
  | 'orders:choose_carrier'
  | 'orders:set_date_location'
  | 'orders:enter_lot'
  | 'orders:change_prep_status'
  | 'orders:mark_delivered'
  | 'orders:cancel'
  | 'pallet_sheet:generate'
  | 'clients:create'
  | 'clients:edit_any'
  | 'clients:edit_own'
  | 'clients:disable'
  | 'users:manage'
  | 'catalogue:crud'
  | 'catalogue:view'
  | 'invoices:issue'
  | 'invoices:update_payment'
  | 'invoices:record_payment'
  | 'invoices:view_dashboard'
  | 'invoices:download_own'
  | 'invoices:cancel'
  | 'reminders:trigger'

const PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [], // hérite de admin + accès activity_log (géré séparément)
  admin: [
    'offers:view_all', 'offers:accept_refuse', 'offers:counter_propose', 'offers:cancel_own',
    'orders:view_all', 'orders:choose_carrier', 'orders:set_date_location', 'orders:enter_lot',
    'orders:change_prep_status', 'orders:mark_delivered', 'orders:cancel',
    'pallet_sheet:generate',
    'clients:create', 'clients:edit_any', 'clients:disable',
    'users:manage',
    'catalogue:crud', 'catalogue:view',
    'invoices:issue', 'invoices:update_payment', 'invoices:record_payment',
    'invoices:view_dashboard', 'invoices:cancel',
    'reminders:trigger',
  ],
  secretaire: [
    'offers:view_all',
    'orders:view_all', 'orders:choose_carrier', 'orders:set_date_location', 'orders:enter_lot',
    'orders:mark_delivered',
    'pallet_sheet:generate',
    'clients:edit_any',
    'catalogue:view',
    'invoices:issue', 'invoices:update_payment', 'invoices:record_payment', 'invoices:view_dashboard',
    'reminders:trigger',
  ],
  conditionnement: [
    'orders:view_all', 'orders:enter_lot', 'orders:change_prep_status',
    'pallet_sheet:generate',
    'catalogue:view',
  ],
  client_pro: [
    'offers:submit', 'offers:view_own', 'offers:cancel_own',
    'orders:view_own',
    'pallet_sheet:generate',
    'clients:edit_own',
    'catalogue:view',
    'invoices:download_own',
  ],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  if (role === 'super_admin') {
    return hasPermission('admin', permission)
  }
  return PERMISSIONS[role]?.includes(permission) ?? false
}
