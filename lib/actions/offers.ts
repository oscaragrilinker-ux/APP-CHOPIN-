'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { PriceBasis, Role, OfferStatus } from '@/types'
import { BRAND } from '@/lib/brand'

// ── Schéma de validation ───────────────────────────────────────────────────

const CreateOfferSchema = z.object({
  variety_id:     z.string().uuid('Variété invalide.'),
  format_id:      z.string().uuid('Contenant invalide.'),
  quantity:       z
    .number()
    .int('La quantité doit être un nombre entier.')
    .positive('La quantité doit être supérieure à 0.'),
  price_basis:    z.enum(['per_tonne', 'per_container', 'total'] satisfies [PriceBasis, ...PriceBasis[]]),
  unit_price:     z.number().positive('Le prix proposé doit être supérieur à 0.'),
  requested_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (format YYYY-MM-DD attendu.)')
    .nullable()
    .optional(),
  message:        z.string().max(1000, 'Le message ne peut pas dépasser 1 000 caractères.').nullable().optional(),
})

export type CreateOfferInput = z.infer<typeof CreateOfferSchema>

type ActionResult = { error: string } | { success: true; offerId: string }

// Décideurs côté Chopin sur une négociation. La secrétaire est en lecture
// seule sur les offres (docs/permissions.md) : elle consulte, elle ne répond pas.
const OFFER_DECIDERS: Role[] = ['admin', 'super_admin']

// ── Action principale ──────────────────────────────────────────────────────

export async function createOffer(input: CreateOfferInput): Promise<ActionResult> {
  // 1. Validation des inputs
  const parsed = CreateOfferSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Données invalides.' }
  }

  const { variety_id, format_id, quantity, price_basis, unit_price, requested_date, message } = parsed.data

  const supabase = await createClient()

  // 2. Utilisateur authentifié
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Session expirée. Reconnectez-vous.' }

  // 3. company_id résolu côté serveur — ne jamais faire confiance au client
  const { data: clientUsers, error: cuError } = await supabase
    .from('client_users')
    .select('company_id')
    .eq('user_id', user.id)
    .limit(1)

  if (cuError || !clientUsers?.length) {
    return { error: `Aucune entreprise associée à votre compte. Contactez ${BRAND.name}.` }
  }
  const company_id = clientUsers[0].company_id

  // 4. Variété active et visible (RLS filtre déjà, mais on veut un message explicite)
  const { data: variety, error: vError } = await supabase
    .from('varieties')
    .select('id')
    .eq('id', variety_id)
    .eq('is_active', true)
    .maybeSingle()

  if (vError) return { error: 'Erreur lors de la vérification de la variété.' }
  if (!variety) return { error: 'Cette variété n\'est pas disponible.' }

  // 5. Format associé à la variété via variety_formats
  //    C'est le contrôle d'intégrité clé : un client ne peut pas forger un format_id
  //    qui n'est pas coché pour cette variété.
  const { data: vf, error: vfError } = await supabase
    .from('variety_formats')
    .select('id')
    .eq('variety_id', variety_id)
    .eq('format_id', format_id)
    .maybeSingle()

  if (vfError) return { error: 'Erreur lors de la vérification du contenant.' }
  if (!vf) return { error: 'Ce contenant n\'est pas disponible pour cette variété.' }

  // 6. Insertion atomique via la fonction transactionnelle (00012)
  const { data: offerId, error: rpcError } = await supabase.rpc('create_offer_with_round', {
    p_company_id:     company_id,
    p_variety_id:     variety_id,
    p_format_id:      format_id,
    p_quantity:       quantity,
    p_price_basis:    price_basis,
    p_unit_price:     unit_price,
    p_requested_date: requested_date ?? null,
    p_message:        message ?? null,
  })

  if (rpcError) {
    if (rpcError.message.includes('company_not_allowed'))
      return { error: 'Votre compte n\'est pas autorisé à créer une offre pour cette entreprise.' }
    if (rpcError.message.includes('variety_not_active'))
      return { error: 'Cette variété n\'est plus disponible.' }
    if (rpcError.message.includes('format_not_in_variety'))
      return { error: 'Ce contenant n\'est pas disponible pour cette variété.' }
    return { error: 'Une erreur est survenue lors de l\'envoi. Réessayez dans quelques instants.' }
  }

  revalidatePath('/offres')
  revalidatePath(`/offres/${offerId}`)

  return { success: true, offerId: offerId as string }
}

// ── Helpers notifications ──────────────────────────────────────────────────

async function notifyAdmins({
  type,
  title,
  body,
  link,
}: {
  type: 'offer_response' | 'new_offer'
  title: string
  body: string
  link: string
}) {
  const service = createServiceClient()
  const { data: admins } = await service
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'secretaire', 'super_admin'])
  if (!admins?.length) return
  await service.from('notifications').insert(
    admins.map(a => ({ user_id: a.id, type, title, body, link }))
  )
}

async function notifyCompany({
  companyId,
  title,
  body,
  link,
}: {
  companyId: string
  title: string
  body: string
  link: string
}) {
  const service = createServiceClient()
  const { data: clients } = await service
    .from('client_users')
    .select('user_id')
    .eq('company_id', companyId)
  if (!clients?.length) return
  await service.from('notifications').insert(
    clients.map(c => ({ user_id: c.user_id, type: 'offer_response' as const, title, body, link }))
  )
}

// ── respondToOffer ─────────────────────────────────────────────────────────

type RespondInput = {
  offerId: string
  action: 'accept' | 'refuse' | 'counter'
  unitPrice?: number
  message?: string
}

export async function respondToOffer(input: RespondInput): Promise<ActionResult> {
  const { offerId, action, unitPrice, message } = input

  if (action === 'counter' && (!unitPrice || unitPrice <= 0)) {
    return { error: 'Le prix proposé est requis pour une contre-proposition.' }
  }

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

  // Fetch offer (RLS garantit l'accès)
  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .select('id, status, company_id, price_basis, quantity')
    .eq('id', offerId)
    .single()
  if (offerError || !offer) return { error: 'Offre introuvable.' }

  const terminal: OfferStatus[] = ['accepted', 'refused', 'cancelled']
  if (terminal.includes(offer.status as OfferStatus)) {
    return { error: 'Cette offre est clôturée et ne peut plus être modifiée.' }
  }

  const isAdmin = OFFER_DECIDERS.includes(role)
  const isClient = role === 'client_pro'

  if (!isAdmin && !isClient) {
    return { error: 'Vous n\'êtes pas autorisé à répondre à cette offre.' }
  }

  // Le client ne répond que lorsque la balle est dans son camp
  // (counter_proposed = Chopin a répondu). Sur une offre pending, sa seule
  // sortie reste l'annulation via cancelOffer.
  if (offer.status === 'pending' && isClient) {
    return { error: `En attente de la réponse de ${BRAND.name}.` }
  }
  if (action === 'refuse' && isClient) {
    return { error: `Le refus est une action réservée à ${BRAND.name}.` }
  }

  // Chopin garde la main sur une offre qu'il a lui-même contre-proposée :
  // il peut réviser son prix, refuser, ou revenir au prix du client.
  // Accepter dans cet état signifie « je me range au dernier prix client » —
  // il faut donc rejouer ce prix, car la commande est snapshotée sur le
  // dernier round (snapshot_order_from_offer, migration 00015).
  let acceptAtClientPrice: number | null = null
  if (action === 'accept' && isAdmin && offer.status === 'counter_proposed') {
    const { data: clientRound } = await supabase
      .from('offer_rounds')
      .select('unit_price')
      .eq('offer_id', offerId)
      .eq('author_role', 'client')
      .order('round_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!clientRound) {
      return { error: 'Aucun prix client à accepter sur cette négociation.' }
    }
    acceptAtClientPrice = Number(clientRound.unit_price)
  }

  if (action === 'counter' || acceptAtClientPrice !== null) {
    const authorRole = isAdmin ? 'admin' : 'client'
    const roundPrice = acceptAtClientPrice ?? unitPrice!

    // Récupère le round_number max pour éviter collision (UNIQUE constraint = filet de sécurité)
    const { data: lastRound } = await supabase
      .from('offer_rounds')
      .select('round_number')
      .eq('offer_id', offerId)
      .order('round_number', { ascending: false })
      .limit(1)

    const nextRound = (lastRound?.[0]?.round_number ?? 0) + 1

    // INSERT round (client utilise sa policy RLS, admin idem)
    const { error: roundError } = await supabase
      .from('offer_rounds')
      .insert({
        offer_id: offerId,
        round_number: nextRound,
        author_role: authorRole,
        author_id: user.id,
        unit_price: roundPrice,
        message: acceptAtClientPrice !== null
          ? (message ?? `${BRAND.name} se range au prix proposé par le client.`)
          : (message ?? null),
      })

    if (roundError) {
      if (roundError.code === '23505') {
        return { error: 'Conflit de round concurrent. Rechargez la page et réessayez.' }
      }
      return { error: 'Erreur lors de l\'ajout de la contre-proposition.' }
    }

    // Sur un ralliement au prix client, le statut passe à 'accepted' juste
    // en dessous : on ne le repasse pas en counter_proposed entre-temps.
    if (acceptAtClientPrice === null) {
      const newStatus: OfferStatus = isAdmin ? 'counter_proposed' : 'pending'
      const { error: statusError } = await supabase
        .from('offers')
        .update({ status: newStatus })
        .eq('id', offerId)

      if (statusError) return { error: 'Erreur lors de la mise à jour du statut.' }

      // Notifications
      const link = `/offres/${offerId}`
      if (isAdmin) {
        await notifyCompany({
          companyId: offer.company_id,
          title: 'Contre-proposition reçue',
          body: `${BRAND.name} a répondu à votre offre.`,
          link,
        })
      } else {
        await notifyAdmins({
          type: 'offer_response',
          title: 'Contre-proposition client',
          body: 'Un client a répondu à votre contre-proposition.',
          link,
        })
      }
    }
  }

  if (action === 'accept') {
    const { error: statusError } = await supabase
      .from('offers')
      .update({ status: 'accepted' })
      .eq('id', offerId)

    if (statusError) return { error: 'Erreur lors de l\'acceptation.' }

    if (isAdmin) {
      await notifyCompany({
        companyId: offer.company_id,
        title: 'Offre acceptée !',
        body: acceptAtClientPrice !== null
          ? `${BRAND.name} s'est rangé à votre prix. Une commande a été créée.`
          : 'Votre offre a été acceptée. Une commande a été créée.',
        link: `/offres/${offerId}`,
      })
    } else {
      await notifyAdmins({
        type: 'offer_response',
        title: 'Offre acceptée par le client',
        body: 'Le client a accepté votre proposition. Commande créée.',
        link: `/offres/${offerId}`,
      })
    }
  }

  if (action === 'refuse') {
    const { error: statusError } = await supabase
      .from('offers')
      .update({ status: 'refused' })
      .eq('id', offerId)

    if (statusError) return { error: 'Erreur lors du refus.' }

    if (isAdmin) {
      await notifyCompany({
        companyId: offer.company_id,
        title: 'Offre refusée',
        body: message
          ? `${BRAND.name} a refusé votre offre : ${message}`
          : `${BRAND.name} a refusé votre offre.`,
        link: `/offres/${offerId}`,
      })
    } else {
      await notifyAdmins({
        type: 'offer_response',
        title: 'Offre refusée par le client',
        body: message
          ? `Le client a refusé : ${message}`
          : 'Le client a refusé votre proposition.',
        link: `/offres/${offerId}`,
      })
    }
  }

  revalidatePath('/offres')
  revalidatePath(`/offres/${offerId}`)

  return { success: true, offerId }
}

// ── cancelOffer ────────────────────────────────────────────────────────────

export async function cancelOffer({ offerId }: { offerId: string }): Promise<ActionResult> {
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
  const role = profile?.role as Role | undefined
  const isClient = role === 'client_pro'
  const isAdmin = !!role && OFFER_DECIDERS.includes(role)
  if (!isClient && !isAdmin) {
    return { error: 'Action non autorisée.' }
  }

  // Fetch offer (RLS garantit que c'est la sienne)
  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .select('id, status, company_id')
    .eq('id', offerId)
    .single()

  if (offerError || !offer) return { error: 'Offre introuvable.' }

  if (['accepted', 'refused', 'cancelled'].includes(offer.status)) {
    return { error: 'Cette offre est clôturée et ne peut pas être annulée.' }
  }

  const { error: updateError } = await supabase
    .from('offers')
    .update({ status: 'cancelled' })
    .eq('id', offerId)

  if (updateError) return { error: 'Erreur lors de l\'annulation.' }

  if (isClient) {
    await notifyAdmins({
      type: 'offer_response',
      title: 'Offre annulée par le client',
      body: 'Le client a annulé son offre.',
      link: `/offres/${offerId}`,
    })
  } else {
    await notifyCompany({
      companyId: offer.company_id,
      title: 'Négociation clôturée',
      body: `${BRAND.name} a clôturé cette négociation.`,
      link: `/offres/${offerId}`,
    })
  }

  revalidatePath('/offres')
  revalidatePath(`/offres/${offerId}`)

  return { success: true, offerId }
}
