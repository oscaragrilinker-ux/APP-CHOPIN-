'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { hasPermission, type Permission, type PermissionOverrides, type Role } from '@/lib/permissions'

type ActionResult<T = object> = { error: string } | ({ success: true } & T)

type Guard =
  | { error: string }
  | { supabase: Awaited<ReturnType<typeof createClient>>; userId: string; role: Role }

async function requirePermission(permission: Permission): Promise<Guard> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée. Reconnectez-vous.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permission_overrides')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Profil introuvable.' }

  const role = profile.role as Role
  const allowed = hasPermission(
    role,
    permission,
    (profile.permission_overrides ?? {}) as PermissionOverrides,
  )
  if (!allowed) return { error: 'Action non autorisée pour votre rôle.' }

  return { supabase, userId: user.id, role }
}

// ── Organisation du transport ───────────────────────────────────────────────

const TransportSchema = z.object({
  order_id:          z.string().uuid(),
  carrier_id:        z.string().uuid().nullable().optional().or(z.literal('')),
  pickup_location:   z.string().max(300).nullable().optional(),
  delivery_location: z.string().max(300).nullable().optional(),
  delivery_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide.').nullable().optional().or(z.literal('')),
  delivery_time:     z.string().regex(/^\d{2}:\d{2}$/, 'Heure invalide.').nullable().optional().or(z.literal('')),
  transport_notes:   z.string().max(2000).nullable().optional(),
})

export type TransportInput = z.input<typeof TransportSchema>

export async function updateTransport(input: TransportInput): Promise<ActionResult> {
  const parsed = TransportSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Données invalides.' }

  const guard = await requirePermission('orders:organize_transport')
  if ('error' in guard) return { error: guard.error }

  const { order_id, ...rest } = parsed.data
  const patch = Object.fromEntries(
    Object.entries(rest).map(([k, v]) => [k, v === '' ? null : v]),
  )

  const { error } = await guard.supabase.from('orders').update(patch).eq('id', order_id)
  if (error) return { error: `Enregistrement impossible : ${error.message}` }

  revalidatePath(`/commandes/${order_id}`)
  revalidatePath('/atelier')
  return { success: true }
}

// ── Épinglage en tête de file d'atelier ─────────────────────────────────────

export async function setOrderPriority(
  { orderId, pinned }: { orderId: string; pinned: boolean },
): Promise<ActionResult> {
  const guard = await requirePermission('orders:set_priority')
  if ('error' in guard) return { error: guard.error }

  const { error } = await guard.supabase
    .from('orders')
    .update({ priority_pinned_at: pinned ? new Date().toISOString() : null })
    .eq('id', orderId)

  if (error) return { error: `Opération impossible : ${error.message}` }

  revalidatePath('/atelier')
  revalidatePath(`/commandes/${orderId}`)
  return { success: true }
}

// ── Fiches palette ──────────────────────────────────────────────────────────

const PalletSchema = z.object({
  order_id:       z.string().uuid(),
  lot_number:     z.string().min(1, 'Le numéro de lot est requis.').max(60),
  pallet_count:   z.coerce.number().int().min(1, 'Au moins une palette.'),
  pallet_kind:    z.enum(['europe', 'perdue', 'plastique', 'demi_palette', 'autre']),
  packaging_type: z.string().max(120).nullable().optional(),
  parcel_count:   z.coerce.number().int().min(1, 'Au moins un colis.').nullable().optional(),
  strapping:      z.enum(['film', 'cerclage_plastique', 'cerclage_metal', 'coiffe_cerclage', 'aucun']),
  net_weight_kg:  z.coerce.number().min(0).nullable().optional(),
  operator_name:  z.string().max(120).nullable().optional(),
  notes:          z.string().max(2000).nullable().optional(),
})

export type PalletInput = z.input<typeof PalletSchema>

export async function savePalletSheet(
  input: PalletInput & { id?: string },
): Promise<ActionResult<{ id: string }>> {
  const parsed = PalletSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Données invalides.' }

  const guard = await requirePermission('pallet_sheet:create')
  if ('error' in guard) return { error: guard.error }

  const data = parsed.data
  const payload = {
    order_id:       data.order_id,
    lot_number:     data.lot_number.trim(),
    pallet_count:   data.pallet_count,
    pallet_kind:    data.pallet_kind,
    packaging_type: data.packaging_type || null,
    parcel_count:   data.parcel_count ?? null,
    strapping:      data.strapping,
    net_weight_kg:  data.net_weight_kg ?? null,
    operator_name:  data.operator_name || null,
    notes:          data.notes || null,
    prepared_by:    guard.userId,
  }

  const query = input.id
    ? guard.supabase.from('pallet_sheets').update(payload).eq('id', input.id).select('id').single()
    : guard.supabase.from('pallet_sheets').insert(payload).select('id').single()

  const { data: row, error } = await query

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ce numéro de lot existe déjà pour aujourd\'hui.' }
    }
    return { error: `Enregistrement impossible : ${error.message}` }
  }

  revalidatePath('/atelier')
  revalidatePath(`/commandes/${data.order_id}`)
  return { success: true, id: row.id as string }
}

/**
 * Attribue le numéro de bon de livraison. Séquentiel et définitif : une fois
 * émis, la fiche n'est plus modifiable par l'atelier (policy RLS 00020).
 */
export async function issueDeliveryNote(
  { palletSheetId }: { palletSheetId: string },
): Promise<ActionResult<{ blNumber: string }>> {
  const guard = await requirePermission('pallet_sheet:create')
  if ('error' in guard) return { error: guard.error }

  const service = createServiceClient()

  const { data: sheet } = await service
    .from('pallet_sheets')
    .select('id, order_id, bl_number')
    .eq('id', palletSheetId)
    .maybeSingle()

  if (!sheet) return { error: 'Fiche palette introuvable.' }
  if (sheet.bl_number) return { success: true, blNumber: sheet.bl_number as string }

  const { data: generated, error: rpcError } = await service.rpc('generate_bl_number' as never)
  if (rpcError || typeof generated !== 'string') {
    return { error: 'Numéro de bon de livraison indisponible. Rien n\'a été émis.' }
  }

  const { error } = await service
    .from('pallet_sheets')
    .update({ bl_number: generated })
    .eq('id', palletSheetId)
    .is('bl_number', null)

  if (error) return { error: `Émission impossible : ${error.message}` }

  revalidatePath('/atelier')
  revalidatePath(`/commandes/${sheet.order_id as string}`)
  return { success: true, blNumber: generated }
}

/**
 * Émet le bon de livraison de toute une commande : chaque fiche palette sans
 * numéro en reçoit un, séquentiel. Idempotent — les fiches déjà numérotées
 * sont laissées telles quelles.
 */
export async function issueDeliveryNotesForOrder(
  { orderId }: { orderId: string },
): Promise<ActionResult<{ issued: number; numbers: string[] }>> {
  const guard = await requirePermission('pallet_sheet:create')
  if ('error' in guard) return { error: guard.error }

  const service = createServiceClient()
  const { data: sheets } = await service
    .from('pallet_sheets')
    .select('id, bl_number')
    .eq('order_id', orderId)
    .order('prepared_at')
  if (!sheets?.length) return { error: 'Aucune fiche palette : rien à émettre.' }

  const numbers: string[] = []
  let issued = 0
  for (const sheet of sheets) {
    if (sheet.bl_number) { numbers.push(sheet.bl_number as string); continue }
    const { data: generated, error: rpcError } = await service.rpc('generate_bl_number' as never)
    if (rpcError || typeof generated !== 'string') {
      return { error: `Numéro indisponible après ${issued} émission(s). Les numéros déjà attribués sont conservés.` }
    }
    const { error } = await service
      .from('pallet_sheets').update({ bl_number: generated }).eq('id', sheet.id).is('bl_number', null)
    if (error) return { error: `Émission interrompue : ${error.message}` }
    numbers.push(generated); issued += 1
  }

  revalidatePath('/atelier')
  revalidatePath(`/commandes/${orderId}`)
  return { success: true, issued, numbers }
}
