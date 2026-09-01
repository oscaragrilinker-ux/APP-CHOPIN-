'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { hasPermission, type Permission, type PermissionOverrides, type Role } from '@/lib/permissions'

type ActionResult<T = object> = { error: string } | ({ success: true } & T)

type Guard =
  | { error: string }
  | { supabase: Awaited<ReturnType<typeof createClient>>; userId: string }

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

  const allowed = hasPermission(
    profile.role as Role,
    permission,
    (profile.permission_overrides ?? {}) as PermissionOverrides,
  )
  if (!allowed) return { error: 'Action non autorisée pour votre rôle.' }

  return { supabase, userId: user.id }
}

const CarrierSchema = z.object({
  name:          z.string().min(2, 'Le nom du transporteur est requis.').max(160),
  contact_name:  z.string().max(120).nullable().optional(),
  email:         z.string().email('Adresse e-mail invalide.').nullable().optional().or(z.literal('')),
  phone:         z.string().max(30).nullable().optional(),
  address_line1: z.string().max(200).nullable().optional(),
  postal_code:   z.string().max(10).nullable().optional(),
  city:          z.string().max(120).nullable().optional(),
  notes:         z.string().max(2000).nullable().optional(),
})

export type CarrierInput = z.input<typeof CarrierSchema>

function normalize<T extends Record<string, unknown>>(values: T) {
  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, v === '' ? null : v]),
  ) as T
}

export async function createCarrier(input: CarrierInput): Promise<ActionResult<{ id: string }>> {
  const parsed = CarrierSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Données invalides.' }

  const guard = await requirePermission('carriers:manage')
  if ('error' in guard) return { error: guard.error }

  const { data, error } = await guard.supabase
    .from('carriers')
    .insert(normalize(parsed.data))
    .select('id')
    .single()

  if (error) return { error: `Création impossible : ${error.message}` }

  revalidatePath('/transporteurs')
  return { success: true, id: data.id as string }
}

export async function updateCarrier(
  input: CarrierInput & { id: string },
): Promise<ActionResult> {
  const parsed = CarrierSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Données invalides.' }

  const guard = await requirePermission('carriers:manage')
  if ('error' in guard) return { error: guard.error }

  const { error } = await guard.supabase
    .from('carriers')
    .update(normalize(parsed.data))
    .eq('id', input.id)

  if (error) return { error: `Modification impossible : ${error.message}` }

  revalidatePath('/transporteurs')
  return { success: true }
}

export async function setCarrierActive(
  { id, isActive }: { id: string; isActive: boolean },
): Promise<ActionResult> {
  const guard = await requirePermission('carriers:manage')
  if ('error' in guard) return { error: guard.error }

  const { error } = await guard.supabase
    .from('carriers')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) return { error: `Opération impossible : ${error.message}` }

  revalidatePath('/transporteurs')
  return { success: true }
}
