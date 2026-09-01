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

const CompanySchema = z.object({
  name:          z.string().min(2, 'Le nom de l\'entreprise est requis.').max(160),
  siren:         z.string().regex(/^\d{9}$/, 'Le SIREN doit comporter 9 chiffres.').nullable().optional().or(z.literal('')),
  email:         z.string().email('Adresse e-mail invalide.').nullable().optional().or(z.literal('')),
  phone:         z.string().max(30).nullable().optional(),
  address_line1: z.string().max(200).nullable().optional(),
  address_line2: z.string().max(200).nullable().optional(),
  postal_code:   z.string().max(10).nullable().optional(),
  city:          z.string().max(120).nullable().optional(),
  payment_terms: z.coerce.number().int().min(0).max(180).default(30),
  notes:         z.string().max(2000).nullable().optional(),
})

export type CompanyInput = z.input<typeof CompanySchema>

/** Vide → NULL, pour ne pas stocker de chaînes vides en base. */
function normalize<T extends Record<string, unknown>>(values: T) {
  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, v === '' ? null : v]),
  ) as T
}

export async function createCompany(input: CompanyInput): Promise<ActionResult<{ id: string }>> {
  const parsed = CompanySchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Données invalides.' }

  const guard = await requirePermission('clients:create')
  if ('error' in guard) return { error: guard.error }

  const { data, error } = await guard.supabase
    .from('companies')
    .insert(normalize(parsed.data))
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { error: 'Une entreprise avec ce SIREN existe déjà.' }
    return { error: `Création impossible : ${error.message}` }
  }

  revalidatePath('/clients')
  return { success: true, id: data.id as string }
}

export async function updateCompany(
  input: CompanyInput & { id: string },
): Promise<ActionResult> {
  const parsed = CompanySchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Données invalides.' }

  const guard = await requirePermission('clients:edit_any')
  if ('error' in guard) return { error: guard.error }

  const { error } = await guard.supabase
    .from('companies')
    .update(normalize(parsed.data))
    .eq('id', input.id)

  if (error) return { error: `Modification impossible : ${error.message}` }

  revalidatePath('/clients')
  revalidatePath(`/clients/${input.id}`)
  return { success: true }
}

export async function setCompanyActive(
  { id, isActive }: { id: string; isActive: boolean },
): Promise<ActionResult> {
  const guard = await requirePermission('clients:disable')
  if ('error' in guard) return { error: guard.error }

  const { error } = await guard.supabase
    .from('companies')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) return { error: `Opération impossible : ${error.message}` }

  revalidatePath('/clients')
  revalidatePath(`/clients/${id}`)
  return { success: true }
}
