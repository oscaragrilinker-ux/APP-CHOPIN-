// Matrice de permissions — source de vérité côté applicatif.
// Pour le plafond de sécurité, voir les policies RLS dans supabase/migrations/.
//
// Deux niveaux se combinent :
//   1. le rôle donne un jeu de droits par défaut (docs/permissions.md) ;
//   2. l'admin peut ajuster quelques droits pour une personne précise, stockés
//      dans profiles.permission_overrides ({"orders:enter_lot": false}).
//
// La RLS reste le garde-fou : un ajustement ne peut pas accorder un accès que
// la base refuse au rôle (un conditionnement ne verra jamais les prix).

export type Role =
  | 'admin'
  | 'secretaire'
  | 'conditionnement'
  | 'responsable_conditionnement'
  | 'client_pro'
  | 'super_admin'

export type Permission =
  | 'offers:submit'
  | 'offers:view_all'
  | 'offers:view_own'
  | 'offers:accept_refuse'
  | 'offers:counter_propose'
  | 'offers:cancel_own'
  | 'orders:view_all'
  | 'orders:view_own'
  | 'orders:view_prices'
  | 'orders:choose_carrier'
  | 'orders:set_date_location'
  | 'orders:enter_lot'
  | 'orders:change_prep_status'
  | 'orders:mark_delivered'
  | 'orders:cancel'
  | 'orders:organize_transport'
  | 'orders:set_priority'
  | 'carriers:manage'
  | 'pallet_sheet:generate'
  | 'pallet_sheet:create'
  | 'clients:create'
  | 'clients:edit_any'
  | 'clients:edit_own'
  | 'clients:disable'
  | 'clients:invite'
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

/** Ajustements individuels : une clé absente signifie « valeur du rôle ». */
export type PermissionOverrides = Partial<Record<Permission, boolean>>

const PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [], // hérite d'admin (voir hasPermission) + accès activity_log
  admin: [
    'offers:view_all', 'offers:accept_refuse', 'offers:counter_propose', 'offers:cancel_own',
    'orders:view_all', 'orders:view_prices', 'orders:choose_carrier', 'orders:set_date_location',
    'orders:enter_lot', 'orders:change_prep_status', 'orders:mark_delivered', 'orders:cancel',
    'orders:organize_transport', 'orders:set_priority', 'carriers:manage',
    'pallet_sheet:generate', 'pallet_sheet:create',
    'clients:create', 'clients:edit_any', 'clients:disable', 'clients:invite',
    'users:manage',
    'catalogue:crud', 'catalogue:view',
    'invoices:issue', 'invoices:update_payment', 'invoices:record_payment',
    'invoices:view_dashboard', 'invoices:cancel',
    'reminders:trigger',
  ],
  secretaire: [
    'offers:view_all',
    'orders:view_all', 'orders:view_prices', 'orders:choose_carrier',
    'orders:set_date_location', 'orders:enter_lot', 'orders:mark_delivered',
    'orders:organize_transport', 'carriers:manage',
    'pallet_sheet:generate', 'pallet_sheet:create',
    'clients:edit_any',
    'catalogue:view',
    'invoices:issue', 'invoices:update_payment', 'invoices:record_payment', 'invoices:view_dashboard',
    'reminders:trigger',
  ],
  // Chef d'atelier : tout ce que fait un opérateur, plus l'ordre de passage.
  responsable_conditionnement: [
    'orders:view_all', 'orders:enter_lot', 'orders:change_prep_status', 'orders:set_priority',
    'pallet_sheet:generate', 'pallet_sheet:create',
    'catalogue:view',
  ],
  conditionnement: [
    'orders:view_all', 'orders:enter_lot', 'orders:change_prep_status',
    'pallet_sheet:generate', 'pallet_sheet:create',
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

/** Droits du rôle seul, sans ajustement — base de l'écran d'invitation. */
export function rolePermissions(role: Role): Permission[] {
  return role === 'super_admin' ? PERMISSIONS.admin : (PERMISSIONS[role] ?? [])
}

export function hasPermission(
  role: Role,
  permission: Permission,
  overrides?: PermissionOverrides | null,
): boolean {
  const override = overrides?.[permission]
  if (typeof override === 'boolean') return override
  return rolePermissions(role).includes(permission)
}

// ── Présentation : ce que l'admin voit à l'écran d'invitation ────────────────

export const PERMISSION_LABELS: Record<Permission, string> = {
  'offers:submit':            'Soumettre une offre',
  'offers:view_all':          'Voir toutes les négociations',
  'offers:view_own':          'Voir ses propres offres',
  'offers:accept_refuse':     'Accepter ou refuser une offre',
  'offers:counter_propose':   'Contre-proposer un prix',
  'offers:cancel_own':        'Annuler une offre',
  'orders:view_all':          'Voir toutes les commandes',
  'orders:view_own':          'Voir ses commandes',
  'orders:view_prices':       'Voir les prix et montants',
  'orders:choose_carrier':    'Choisir le transporteur',
  'orders:set_date_location': 'Définir date, heure et lieu',
  'orders:enter_lot':         'Saisir le numéro de lot',
  'orders:change_prep_status': 'Faire avancer la préparation',
  'orders:mark_delivered':    'Expédier et marquer livrée',
  'orders:cancel':            'Annuler une commande',
  'orders:organize_transport': 'Organiser le transport',
  'orders:set_priority':      'Réordonner la file de l\'atelier',
  'carriers:manage':          'Gérer le carnet de transporteurs',
  'pallet_sheet:create':      'Saisir une fiche palette',
  'pallet_sheet:generate':    'Générer une fiche palette',
  'clients:create':           'Créer un client',
  'clients:edit_any':         'Modifier les coordonnées clients',
  'clients:edit_own':         'Modifier ses propres coordonnées',
  'clients:disable':          'Désactiver un client',
  'clients:invite':           'Inviter un contact client',
  'users:manage':             'Gérer les utilisateurs et leurs droits',
  'catalogue:crud':           'Gérer le catalogue',
  'catalogue:view':           'Consulter le catalogue',
  'invoices:issue':           'Émettre une facture',
  'invoices:update_payment':  'Modifier un statut de paiement',
  'invoices:record_payment':  'Enregistrer un règlement',
  'invoices:view_dashboard':  'Voir le suivi des encaissements',
  'invoices:download_own':    'Télécharger ses factures',
  'invoices:cancel':          'Annuler une facture',
  'reminders:trigger':        'Déclencher une relance',
}

export type PermissionGroup = { module: string; permissions: Permission[] }

/**
 * Droits proposés à l'invitation d'un client professionnel.
 * Un client agit sur ses propres données : ses offres, ses commandes, ses
 * factures. Lui présenter les droits internes n'aurait aucun sens.
 */
export const CLIENT_PERMISSION_GROUPS: PermissionGroup[] = [
  { module: 'Catalogue', permissions: ['catalogue:view'] },
  { module: 'Négociations', permissions: ['offers:submit', 'offers:view_own', 'offers:cancel_own'] },
  { module: 'Commandes', permissions: ['orders:view_own'] },
  { module: 'Fiches palette', permissions: ['pallet_sheet:generate'] },
  { module: 'Facturation', permissions: ['invoices:download_own'] },
  { module: 'Son entreprise', permissions: ['clients:edit_own'] },
]

/** Regroupement par module, dans l'ordre d'affichage de l'écran d'invitation. */
export const INTERNAL_PERMISSION_GROUPS: PermissionGroup[] = [
  {
    module: 'Négociations',
    permissions: ['offers:view_all', 'offers:accept_refuse', 'offers:counter_propose', 'offers:cancel_own'],
  },
  {
    module: 'Commandes',
    permissions: [
      'orders:view_all', 'orders:view_prices', 'orders:change_prep_status',
      'orders:set_priority', 'orders:mark_delivered', 'orders:cancel',
    ],
  },
  {
    module: 'Transport',
    permissions: [
      'orders:organize_transport', 'orders:choose_carrier',
      'orders:set_date_location', 'carriers:manage',
    ],
  },
  {
    module: 'Atelier',
    permissions: ['pallet_sheet:create', 'orders:enter_lot', 'pallet_sheet:generate'],
  },
  { module: 'Catalogue', permissions: ['catalogue:view', 'catalogue:crud'] },
  {
    module: 'Clients',
    permissions: ['clients:create', 'clients:edit_any', 'clients:disable', 'clients:invite'],
  },
  {
    module: 'Facturation',
    permissions: [
      'invoices:view_dashboard', 'invoices:issue', 'invoices:record_payment',
      'invoices:update_payment', 'invoices:cancel', 'reminders:trigger',
    ],
  },
  { module: 'Administration', permissions: ['users:manage'] },
]

/** Droits à présenter selon le métier de la personne invitée. */
export function permissionGroupsFor(role: Role): PermissionGroup[] {
  return role === 'client_pro' ? CLIENT_PERMISSION_GROUPS : INTERNAL_PERMISSION_GROUPS
}

/** Rôles proposables à l'invitation — super_admin est réservé au développement. */
export const INVITABLE_ROLES: { value: Exclude<Role, 'super_admin'>; label: string; hint: string }[] = [
  { value: 'admin',           label: 'Administrateur',  hint: 'Accès complet à l\'exploitation' },
  { value: 'secretaire',      label: 'Secrétaire',      hint: 'Commandes, transport, facturation, relances' },
  {
    value: 'responsable_conditionnement',
    label: 'Responsable conditionnement',
    hint: 'Pilote l\'atelier et l\'ordre de passage, sans les prix',
  },
  { value: 'conditionnement', label: 'Conditionnement', hint: 'Préparation et fiches palette, sans les prix' },
  { value: 'client_pro',      label: 'Client pro',      hint: 'Catalogue et offres, rattaché à une entreprise' },
]

/**
 * Ne conserve que les ajustements qui diffèrent réellement du rôle : évite de
 * figer en base des droits identiques au rôle, qui ne suivraient plus une
 * future évolution de la matrice.
 */
export function diffFromRole(role: Role, granted: Permission[]): PermissionOverrides {
  const base = new Set(rolePermissions(role))
  const chosen = new Set(granted)
  const overrides: PermissionOverrides = {}

  for (const permission of Object.keys(PERMISSION_LABELS) as Permission[]) {
    const inBase = base.has(permission)
    const inChosen = chosen.has(permission)
    if (inBase !== inChosen) overrides[permission] = inChosen
  }
  return overrides
}
