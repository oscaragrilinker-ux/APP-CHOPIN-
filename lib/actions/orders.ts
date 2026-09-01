'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Role, OrderStatus } from '@/types'

type ActionResult = { error: string } | { success: true }

const STATUS_LABELS: Record<OrderStatus, string> = {
  accepted:       'Acceptée',
  in_preparation: 'En préparation',
  ready:          'Prête',
  shipped:        'Expédiée',
  delivered:      'Livrée',
  cancelled:      'Annulée',
}

// Transitions autorisées par rôle — miroir de docs/permissions.md.
// Admin : toute la chaîne. Secrétaire : expédition et livraison seulement
// (la phase de préparation appartient à l'atelier). Conditionnement : la
// phase de préparation, sans jamais toucher à l'expédition.
const ADMIN_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  accepted:       ['in_preparation'],
  in_preparation: ['ready'],
  ready:          ['shipped'],
  shipped:        ['delivered'],
}

const SECRETAIRE_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  ready:   ['shipped'],
  shipped: ['delivered'],
}

const CONDITIONNEMENT_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  accepted:       ['in_preparation'],
  in_preparation: ['ready'],
}

function transitionsFor(role: Role): Partial<Record<OrderStatus, OrderStatus[]>> {
  if (role === 'conditionnement') return CONDITIONNEMENT_TRANSITIONS
  if (role === 'secretaire') return SECRETAIRE_TRANSITIONS
  return ADMIN_TRANSITIONS
}

export async function updateOrderStatus({
  orderId,
  newStatus,
}: {
  orderId: string
  newStatus: OrderStatus
}): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Session expirée. Reconnectez-vous.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Profil introuvable.' }

  const role = profile.role as Role
  const isAdmin = ['admin', 'secretaire', 'super_admin'].includes(role)
  const isConditionnement = role === 'conditionnement'

  if (!isAdmin && !isConditionnement) {
    return { error: 'Action non autorisée.' }
  }

  // Conditionnement lit via la vue dédiée (sans prix)
  const tableOrView = isConditionnement ? 'orders_for_conditionnement' : 'orders'
  const { data: order, error: orderError } = await supabase
    .from(tableOrView as 'orders')
    .select('id, status, company_id')
    .eq('id', orderId)
    .single()

  if (orderError || !order) return { error: 'Commande introuvable.' }

  const allowed = transitionsFor(role)[order.status as OrderStatus] ?? []
  if (!allowed.includes(newStatus)) {
    return {
      error: `Transition "${STATUS_LABELS[order.status as OrderStatus]} → ${STATUS_LABELS[newStatus]}" non autorisée pour votre rôle.`,
    }
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)

  if (updateError) return { error: 'Erreur lors de la mise à jour.' }

  // Notifier le client (service client pour INSERT cross-user)
  const service = createServiceClient()
  const { data: clients } = await service
    .from('client_users')
    .select('user_id')
    .eq('company_id', order.company_id)

  if (clients?.length) {
    await service.from('notifications').insert(
      clients.map(c => ({
        user_id: c.user_id,
        type: 'order_status' as const,
        title: `Commande ${STATUS_LABELS[newStatus]}`,
        body: `Votre commande est désormais : ${STATUS_LABELS[newStatus].toLowerCase()}.`,
        link: `/commandes/${orderId}`,
      }))
    )
  }

  revalidatePath('/commandes')
  revalidatePath(`/commandes/${orderId}`)

  return { success: true }
}
