'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Role } from '@/types'

type ActionResult = { error: string } | { success: true }

const optional = z.string().trim().max(200).transform(v => (v === '' ? null : v)).nullable()

const SettingsSchema = z.object({
  legal_name: z.string().trim().min(2, 'Raison sociale obligatoire.').max(200),
  legal_form: optional,
  siret: z.string().trim().regex(/^(\d{14})?$/, 'Le SIRET compte 14 chiffres.').transform(v => v || null).nullable(),
  vat_number: z.string().trim().regex(/^(FR[0-9A-Z]{2}\d{9})?$/i, 'Format attendu : FR + 11 caractères.').transform(v => (v ? v.toUpperCase() : null)).nullable(),
  address_line1: z.string().trim().min(3).max(200),
  postal_code: z.string().trim().regex(/^\d{5}$/, 'Code postal à 5 chiffres.'),
  city: z.string().trim().min(1).max(120),
  phone: optional,
  email: z.union([z.literal(''), z.string().trim().email('Adresse e-mail invalide.')]).transform(v => v || null).nullable(),
  iban: z.string().trim().transform(v => v.replace(/\s+/g, '').toUpperCase() || null).nullable(),
  bic: z.string().trim().transform(v => v.toUpperCase() || null).nullable(),
  bank_name: optional,
  quote_validity_days: z.coerce.number().int().min(1).max(365),
  payment_terms_text: z.string().trim().min(3).max(1000),
  late_penalty_text: z.string().trim().min(3).max(1500),
  invoice_footer: z.string().trim().max(1000).transform(v => v || null).nullable(),
  quote_footer: z.string().trim().max(1000).transform(v => v || null).nullable(),
  delivery_footer: z.string().trim().max(1000).transform(v => v || null).nullable(),
})

export type DocumentSettingsInput = z.input<typeof SettingsSchema>

/**
 * Mentions des documents : modifiables par un admin uniquement.
 *
 * Ce qui figure sur une facture engage l'exploitation — la vérification est
 * faite ici, en plus de la policy RLS, pour renvoyer un message précis plutôt
 * qu'un refus muet de la base.
 */
export async function updateDocumentSettings(input: DocumentSettingsInput): Promise<ActionResult> {
  const parsed = SettingsSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Données invalides.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée.' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role as Role)) {
    return { error: 'Seul un administrateur peut modifier les mentions des documents.' }
  }

  const service = createServiceClient()
  const { error } = await service
    .from('document_settings')
    .update({ ...parsed.data, updated_by: user.id })
    .eq('id', 1)
  if (error) return { error: `Enregistrement impossible : ${error.message}` }

  revalidatePath('/parametres')
  return { success: true }
}
