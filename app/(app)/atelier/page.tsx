import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AtelierQueue } from '@/components/atelier/AtelierQueue'
import { hasPermission, type PermissionOverrides } from '@/lib/permissions'
import type { Role, OrderForConditionnement, PalletSheet } from '@/types'

export const metadata = { title: 'Atelier — Chopin' }
export const dynamic = 'force-dynamic'

const ATELIER_VIEW_ROLES: Role[] = [
  'admin', 'secretaire', 'super_admin', 'conditionnement', 'responsable_conditionnement',
]

export default async function AtelierPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permission_overrides, first_name, last_name')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  const role = profile.role as Role
  if (!ATELIER_VIEW_ROLES.includes(role)) redirect('/dashboard')

  const overrides = (profile.permission_overrides ?? {}) as PermissionOverrides
  const canPin = hasPermission(role, 'orders:set_priority', overrides)
  const canPrepare = hasPermission(role, 'pallet_sheet:create', overrides)
  const isAtelier = role === 'conditionnement' || role === 'responsable_conditionnement'

  // L'atelier passe par la vue sans prix ; Chopin lit la table directement.
  const PREP_STATUSES = ['accepted', 'in_preparation', 'ready']

  const { data: rawOrders } = isAtelier
    ? await supabase
        .from('orders_for_conditionnement' as 'orders')
        .select('*')
        .in('status', PREP_STATUSES)
    : await supabase
        .from('orders')
        .select(`id, company_id, product_name, variety_name, format_name, quantity, status,
                 delivery_date, delivery_time, pickup_location, delivery_location,
                 transport_notes, priority_pinned_at, notes,
                 company:companies(name), carrier:carriers(name), format:formats(weight_kg)`)
        .in('status', PREP_STATUSES)

  // Mise à plat : la vue expose déjà company_name/carrier_name en colonnes,
  // la table les renvoie en objets imbriqués.
  const orders = (rawOrders ?? []).map(o => {
    const row = o as Record<string, unknown>
    return {
      ...(row as unknown as OrderForConditionnement),
      company_name:
        (row.company_name as string) ??
        ((row.company as { name: string } | null)?.name ?? '—'),
      carrier_name:
        (row.carrier_name as string | null) ??
        ((row.carrier as { name: string } | null)?.name ?? null),
      format_weight_kg:
        (row.format_weight_kg as number | null) ??
        ((row.format as { weight_kg: number | null } | null)?.weight_kg ?? null),
    }
  })

  // Priorité : épinglées d'abord (plus récemment épinglée en tête),
  // puis par date de livraison la plus proche. Sans date → en fin de file.
  orders.sort((a, b) => {
    if (a.priority_pinned_at && b.priority_pinned_at) {
      return b.priority_pinned_at.localeCompare(a.priority_pinned_at)
    }
    if (a.priority_pinned_at) return -1
    if (b.priority_pinned_at) return 1
    if (!a.delivery_date && !b.delivery_date) return 0
    if (!a.delivery_date) return 1
    if (!b.delivery_date) return -1
    return a.delivery_date.localeCompare(b.delivery_date)
  })

  const orderIds = orders.map(o => o.id)
  const { data: sheets } = orderIds.length
    ? await supabase.from('pallet_sheets').select('*').in('order_id', orderIds)
    : { data: [] }

  // Liste des opérateurs proposée sur la tablette (compte partagé : c'est la
  // personne, pas le compte, qu'on veut retrouver sur la fiche).
  const { data: operators } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .in('role', ['conditionnement', 'responsable_conditionnement'])

  const operatorNames = (operators ?? [])
    .map(o => [o.first_name, o.last_name].filter(Boolean).join(' ').trim())
    .filter(Boolean)
    .sort()

  const viewerName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim()

  return (
    <AtelierQueue
      orders={orders}
      sheets={(sheets ?? []) as PalletSheet[]}
      canPin={canPin}
      canPrepare={canPrepare}
      operatorNames={operatorNames.length ? operatorNames : (viewerName ? [viewerName] : [])}
      defaultOperator={viewerName || null}
    />
  )
}
