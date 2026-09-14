'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createCompany } from '@/lib/actions/clients'
import { createInvitation } from '@/lib/actions/invitations'
import type { Role } from '@/lib/permissions'

/**
 * Traitement des demandes d'accès déposées depuis le site public.
 *
 * Accepter, c'est enchaîner deux gestes déjà existants — créer l'entreprise
 * cliente, puis l'invitation (00018) — et marquer la demande. On ne réinvente
 * ni l'un ni l'autre : leurs gardes et leurs règles s'appliquent telles quelles.
 */

type ActionResult<T = object> = { error: string } | ({ success: true } & T)

export type AccessRequestRow = {
  id: string
  email: string
  company_name: string
  contact_name: string | null
  phone: string | null
  wishes: string | null
  status: 'pending' | 'invited' | 'declined'
  created_at: string
  /** Lien d'invitation, tant qu'elle n'est ni acceptée ni révoquée. Calculé par la page. */
  invitation_link?: string | null
}

const DECIDERS: Role[] = ['admin', 'super_admin']

type Guard = { error: string } | { userId: string }

async function requireDecider(): Promise<Guard> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée. Reconnectez-vous.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !DECIDERS.includes(profile.role as Role)) {
    return { error: 'Seul un administrateur peut traiter une demande d’accès.' }
  }
  return { userId: user.id }
}

/** Sépare « Prénom Nom » en deux, sans prétendre deviner les noms composés. */
function splitName(full: string | null): { first: string | null; last: string | null } {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { first: null, last: null }
  if (parts.length === 1) return { first: parts[0], last: null }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

export async function acceptAccessRequest(
  { id }: { id: string },
): Promise<ActionResult<{ link: string; emailSent: boolean; companyId: string }>> {
  const guard = await requireDecider()
  if ('error' in guard) return { error: guard.error }

  const service = createServiceClient()
  const { data: req, error: loadError } = await service
    .from('access_requests')
    .select('id, email, company_name, contact_name, phone, wishes, status')
    .eq('id', id)
    .single()
  if (loadError || !req) return { error: 'Demande introuvable.' }
  if (req.status !== 'pending') return { error: 'Cette demande a déjà été traitée.' }

  // Une entreprise du même nom existe peut-être déjà : on la rattache plutôt
  // que d'en créer un doublon.
  const { data: existing } = await service
    .from('companies')
    .select('id')
    .ilike('name', req.company_name as string)
    .limit(1)
    .maybeSingle()

  let companyId = existing?.id as string | undefined
  if (!companyId) {
    const created = await createCompany({
      name:  req.company_name as string,
      email: req.email as string,
      phone: (req.phone as string | null) ?? null,
    })
    if ('error' in created) return { error: created.error }
    companyId = created.id
  }

  const { first, last } = splitName(req.contact_name as string | null)
  const invited = await createInvitation({
    email:      req.email as string,
    role:       'client_pro',
    company_id: companyId,
    first_name: first,
    last_name:  last,
    message:    null,
  })
  if ('error' in invited) return { error: invited.error }

  // On retient l'invitation créée : c'est elle qui permet de réafficher le
  // lien après un rechargement, au lieu de le perdre avec l'état du bouton.
  const { data: inv } = await service
    .from('invitations')
    .select('id')
    .eq('email', req.email as string)
    .eq('company_id', companyId)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error: markError } = await service
    .from('access_requests')
    .update({
      status: 'invited',
      invitation_id: (inv?.id as string | undefined) ?? null,
      handled_by: guard.userId,
      handled_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (markError) return { error: `Invitation créée, mais la demande n’a pas pu être marquée : ${markError.message}` }

  revalidatePath('/utilisateurs')
  revalidatePath('/clients')
  return { success: true, link: invited.link, emailSent: invited.emailSent, companyId }
}

export async function declineAccessRequest({ id }: { id: string }): Promise<ActionResult> {
  const guard = await requireDecider()
  if ('error' in guard) return { error: guard.error }

  const service = createServiceClient()
  const { error } = await service
    .from('access_requests')
    .update({ status: 'declined', handled_by: guard.userId, handled_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
  if (error) return { error: 'Impossible de décliner cette demande.' }

  revalidatePath('/utilisateurs')
  return { success: true }
}
