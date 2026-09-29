'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Role } from '@/types'

type ActionResult<T = object> = { error: string } | ({ success: true } & T)

const Ids = z.array(z.string().uuid()).min(1, 'Aucune offre sélectionnée.').max(200)

async function requireStaff(): Promise<{ error: string } | { userId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée.' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'secretaire', 'super_admin'].includes(profile.role as Role)) {
    return { error: 'Réservé à l\'exploitation.' }
  }
  return { userId: user.id }
}

/**
 * Archive une ou plusieurs offres. Rien n'est supprimé : l'offre quitte la
 * liste courante et rejoint Archives, classée par client puis par date.
 */
export async function archiveOffers({ ids }: { ids: string[] }): Promise<ActionResult<{ count: number }>> {
  const parsed = Ids.safeParse(ids)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Sélection invalide.' }
  const guard = await requireStaff()
  if ('error' in guard) return { error: guard.error }

  const service = createServiceClient()
  const { data, error } = await service
    .from('offers')
    .update({ archived_at: new Date().toISOString(), archived_by: guard.userId })
    .in('id', parsed.data)
    .is('archived_at', null)
    .select('id')
  if (error) return { error: `Archivage impossible : ${error.message}` }

  revalidatePath('/offres'); revalidatePath('/archives')
  return { success: true, count: data?.length ?? 0 }
}

export async function unarchiveOffers({ ids }: { ids: string[] }): Promise<ActionResult<{ count: number }>> {
  const parsed = Ids.safeParse(ids)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Sélection invalide.' }
  const guard = await requireStaff()
  if ('error' in guard) return { error: guard.error }

  const service = createServiceClient()
  const { data, error } = await service
    .from('offers')
    .update({ archived_at: null, archived_by: null })
    .in('id', parsed.data)
    .not('archived_at', 'is', null)
    .select('id')
  if (error) return { error: `Restauration impossible : ${error.message}` }

  revalidatePath('/offres'); revalidatePath('/archives')
  return { success: true, count: data?.length ?? 0 }
}
