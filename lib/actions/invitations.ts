'use server'

import { randomBytes } from 'crypto'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { diffFromRole, type Permission, type PermissionOverrides, type Role } from '@/lib/permissions'
import { BRAND } from '@/lib/brand'

type ActionResult<T = object> = { error: string } | ({ success: true } & T)

const INVITE_ROLES = [
  'admin',
  'secretaire',
  'responsable_conditionnement',
  'conditionnement',
  'client_pro',
] as const

/** Rôles autorisés à émettre une invitation. */
const INVITERS: Role[] = ['admin', 'super_admin']

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

export async function invitationLink(token: string): Promise<string> {
  return `${appUrl()}/invitation/${token}`
}

type InviterGuard =
  | { error: string }
  | { userId: string; supabase: Awaited<ReturnType<typeof createClient>> }

async function requireInviter(): Promise<InviterGuard> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée. Reconnectez-vous.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !INVITERS.includes(profile.role as Role)) {
    return { error: 'Seul un administrateur peut inviter un utilisateur.' }
  }
  return { userId: user.id, supabase }
}

// ── Créer une invitation ────────────────────────────────────────────────────

const CreateInvitationSchema = z.object({
  email:      z.string().email('Adresse e-mail invalide.').transform(v => v.trim().toLowerCase()),
  role:       z.enum(INVITE_ROLES),
  company_id: z.string().uuid().nullable().optional(),
  first_name: z.string().max(80).nullable().optional(),
  last_name:  z.string().max(80).nullable().optional(),
  message:    z.string().max(1000).nullable().optional(),
  /** Droits cochés dans l'écran d'invitation ; seuls les écarts au rôle sont conservés. */
  granted:    z.array(z.string()).optional(),
})

export type CreateInvitationInput = z.input<typeof CreateInvitationSchema>

export async function createInvitation(
  input: CreateInvitationInput,
): Promise<ActionResult<{ link: string; emailSent: boolean }>> {
  const parsed = CreateInvitationSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Données invalides.' }
  }
  const data = parsed.data

  const guard = await requireInviter()
  if ('error' in guard) return { error: guard.error }

  if (data.role === 'client_pro' && !data.company_id) {
    return { error: 'Un client pro doit être rattaché à une entreprise.' }
  }
  if (data.role !== 'client_pro' && data.company_id) {
    return { error: 'Un utilisateur interne n\'est pas rattaché à une entreprise cliente.' }
  }

  const service = createServiceClient()

  // Une invitation reste valable même si la personne possède déjà un compte :
  // le lien sert alors à la rattacher (autre entreprise, nouveaux droits) sans
  // lui redemander de mot de passe.

  // Une seule invitation vivante par adresse : on remplace la précédente.
  await service
    .from('invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('email', data.email)
    .is('accepted_at', null)
    .is('revoked_at', null)

  const overrides: PermissionOverrides = data.granted
    ? diffFromRole(data.role as Role, data.granted as Permission[])
    : {}

  const token = randomBytes(32).toString('base64url')

  const { error: insertError } = await service.from('invitations').insert({
    token,
    email: data.email,
    role: data.role,
    company_id: data.company_id ?? null,
    permission_overrides: overrides,
    first_name: data.first_name || null,
    last_name: data.last_name || null,
    message: data.message || null,
    invited_by: guard.userId,
  })

  if (insertError) {
    return { error: `Impossible de créer l'invitation : ${insertError.message}` }
  }

  const link = `${appUrl()}/invitation/${token}`
  const emailSent = await sendInvitationEmail({
    to: data.email,
    link,
    role: data.role as Role,
    firstName: data.first_name ?? null,
    message: data.message ?? null,
  })

  revalidatePath('/utilisateurs')
  if (data.company_id) revalidatePath(`/clients/${data.company_id}`)

  return { success: true, link, emailSent }
}

/** Retourne l'id du compte Supabase portant cette adresse, s'il existe. */
async function userIdForEmail(email: string): Promise<string | null> {
  const service = createServiceClient()
  // listUsers ne filtre pas par email : on parcourt les pages (volumétrie faible ici).
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data?.users?.length) return null
    const found = data.users.find(u => (u.email ?? '').toLowerCase() === email)
    if (found) return found.id
    if (data.users.length < 200) return null
  }
  return null
}

// ── Envoi de l'e-mail (silencieux si Brevo n'est pas configuré) ──────────────

async function sendInvitationEmail(params: {
  to: string
  link: string
  role: Role
  firstName: string | null
  message: string | null
}): Promise<boolean> {
  if (!process.env.BREVO_API_KEY) return false

  try {
    const { sendInvitationEmail: send } = await import('@/lib/email/invitations')
    await send(params)
    return true
  } catch {
    // L'invitation reste valable : l'admin dispose toujours du lien à transmettre.
    return false
  }
}

// ── Révoquer ────────────────────────────────────────────────────────────────

export async function revokeInvitation({ id }: { id: string }): Promise<ActionResult> {
  const guard = await requireInviter()
  if ('error' in guard) return { error: guard.error }

  const service = createServiceClient()
  const { error } = await service
    .from('invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .is('accepted_at', null)

  if (error) return { error: 'Impossible de révoquer cette invitation.' }

  revalidatePath('/utilisateurs')
  revalidatePath('/clients')
  return { success: true }
}

// ── Lecture publique d'un lien ──────────────────────────────────────────────

export type InvitationPreview = {
  email: string
  role: Role
  firstName: string | null
  lastName: string | null
  message: string | null
  companyName: string | null
  needsCompanyDetails: boolean
  hasAccount: boolean
}

export async function getInvitation(
  token: string,
): Promise<{ error: string } | { success: true; invitation: InvitationPreview }> {
  const service = createServiceClient()

  const { data: invitation } = await service
    .from('invitations')
    .select('email, role, first_name, last_name, message, company_id, expires_at, accepted_at, revoked_at')
    .eq('token', token)
    .maybeSingle()

  if (!invitation) return { error: 'Ce lien d\'invitation est introuvable.' }
  if (invitation.revoked_at) return { error: `Cette invitation a été annulée par ${BRAND.name}.` }
  if (invitation.accepted_at) return { error: 'Cette invitation a déjà été utilisée. Connectez-vous avec votre compte.' }
  if (new Date(invitation.expires_at) < new Date()) {
    return { error: `Ce lien d'invitation a expiré. Demandez-en un nouveau à ${BRAND.name}.` }
  }

  let companyName: string | null = null
  if (invitation.company_id) {
    const { data: company } = await service
      .from('companies').select('name').eq('id', invitation.company_id).maybeSingle()
    companyName = company?.name ?? null
  }

  const hasAccount = (await userIdForEmail(invitation.email)) !== null

  return {
    success: true,
    invitation: {
      email: invitation.email,
      role: invitation.role as Role,
      firstName: invitation.first_name,
      lastName: invitation.last_name,
      message: invitation.message,
      companyName,
      needsCompanyDetails: invitation.role === 'client_pro',
      hasAccount,
    },
  }
}

// ── Acceptation ─────────────────────────────────────────────────────────────

const AcceptSchema = z.object({
  token:      z.string().min(10),
  // Absent lorsque la personne possède déjà un compte : on ne réinitialise
  // jamais un mot de passe existant depuis un lien d'invitation.
  password:   z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.').optional(),
  first_name: z.string().min(1, 'Le prénom est requis.').max(80),
  last_name:  z.string().min(1, 'Le nom est requis.').max(80),
  phone:      z.string().max(30).nullable().optional(),
  // Coordonnées d'entreprise complétées par le client (optionnelles).
  company: z
    .object({
      address_line1: z.string().max(200).nullable().optional(),
      postal_code:   z.string().max(10).nullable().optional(),
      city:          z.string().max(120).nullable().optional(),
      phone:         z.string().max(30).nullable().optional(),
      email:         z.string().email('E-mail entreprise invalide.').nullable().optional().or(z.literal('')),
    })
    .nullable()
    .optional(),
})

export type AcceptInvitationInput = z.input<typeof AcceptSchema>

export async function acceptInvitation(
  input: AcceptInvitationInput,
): Promise<ActionResult<{ email: string }>> {
  const parsed = AcceptSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Données invalides.' }
  }
  const data = parsed.data
  const service = createServiceClient()

  const { data: invitation } = await service
    .from('invitations')
    .select('id, email, role, company_id, permission_overrides, expires_at, accepted_at, revoked_at')
    .eq('token', data.token)
    .maybeSingle()

  if (!invitation) return { error: 'Ce lien d\'invitation est introuvable.' }
  if (invitation.revoked_at) return { error: 'Cette invitation a été annulée.' }
  if (invitation.accepted_at) return { error: 'Cette invitation a déjà été utilisée.' }
  if (new Date(invitation.expires_at) < new Date()) return { error: 'Ce lien d\'invitation a expiré.' }

  // Compte existant : on ne touche pas à son mot de passe, on le rattache.
  const existingUserId = await userIdForEmail(invitation.email)
  let userId = existingUserId

  if (!userId) {
    if (!data.password) {
      return { error: 'Choisissez un mot de passe pour créer votre compte.' }
    }
    const { data: created, error: createError } = await service.auth.admin.createUser({
      email: invitation.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { first_name: data.first_name, last_name: data.last_name },
    })
    if (createError || !created?.user) {
      return { error: `Création du compte impossible : ${createError?.message ?? 'erreur inconnue'}` }
    }
    userId = created.user.id
  }

  // Profil : rôle et droits proviennent de l'invitation, jamais du formulaire.
  const { error: profileError } = await service.from('profiles').upsert(
    {
      id: userId,
      role: invitation.role,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone || null,
      permission_overrides: invitation.permission_overrides ?? {},
    },
    { onConflict: 'id' },
  )
  if (profileError) return { error: `Création du profil impossible : ${profileError.message}` }

  // Rattachement à l'entreprise pour un client pro.
  if (invitation.company_id) {
    const { count } = await service
      .from('client_users')
      .select('user_id', { count: 'exact', head: true })
      .eq('company_id', invitation.company_id)

    await service.from('client_users').upsert(
      {
        user_id: userId,
        company_id: invitation.company_id,
        is_primary: (count ?? 0) === 0,
      },
      { onConflict: 'user_id,company_id' },
    )

    if (data.company) {
      const patch = Object.fromEntries(
        Object.entries(data.company).filter(([, v]) => v !== null && v !== undefined && v !== ''),
      )
      if (Object.keys(patch).length) {
        await service.from('companies').update(patch).eq('id', invitation.company_id)
      }
    }
  }

  const { error: consumeError } = await service
    .from('invitations')
    .update({ accepted_at: new Date().toISOString(), accepted_by: userId })
    .eq('id', invitation.id)
    .is('accepted_at', null)

  if (consumeError) return { error: 'Cette invitation vient d\'être utilisée.' }

  return { success: true, email: invitation.email }
}
