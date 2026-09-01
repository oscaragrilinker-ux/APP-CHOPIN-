'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Role } from '@/types'

// ── Types ──────────────────────────────────────────────────────────────────

type ActionResult<T = void> = { error: string } | { success: true; data?: T }

// ── Génération du numéro de facture ───────────────────────────────────────

// Le numéro est attribué par la base (generate_invoice_number, migration 00017) :
// compteur annuel, incrément atomique, format CHOP-AAAA-NNNN. Pas de repli
// applicatif — un numéro de facture non séquentiel est un problème comptable,
// il vaut mieux échouer que d'émettre une pièce mal numérotée.
async function nextInvoiceNumber(): Promise<string | null> {
  const service = createServiceClient()
  const { data, error } = await service.rpc('generate_invoice_number' as never)

  if (error || typeof data !== 'string') return null
  return data
}

// ── Créer une facture depuis une commande ──────────────────────────────────

const CreateInvoiceSchema = z.object({
  order_id: z.string().uuid(),
  notes: z.string().max(2000).optional(),
})

export async function createInvoice(
  input: z.infer<typeof CreateInvoiceSchema>,
): Promise<ActionResult<{ invoiceId: string }>> {
  const parsed = CreateInvoiceSchema.safeParse(input)
  if (!parsed.success) return { error: 'Données invalides.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role as Role | undefined
  if (!role || !['admin', 'secretaire', 'super_admin'].includes(role))
    return { error: 'Permission refusée.' }

  // Vérifier que la commande existe et est livrée
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, company_id, total_price, tva_rate, status')
    .eq('id', parsed.data.order_id)
    .single()

  if (orderErr || !order) return { error: 'Commande introuvable.' }
  if (order.status !== 'delivered') return { error: 'La commande doit être livrée pour émettre une facture.' }

  // Vérifier qu'il n'y a pas déjà une facture
  const { data: existing } = await supabase
    .from('invoices').select('id').eq('order_id', parsed.data.order_id).maybeSingle()
  if (existing) return { error: 'Une facture existe déjà pour cette commande.' }

  // Calcul des montants
  const subtotal = Number(order.total_price)
  const taxRate = Number(order.tva_rate ?? 20)
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  // Délai de paiement du client
  const { data: company } = await supabase
    .from('companies').select('payment_terms').eq('id', order.company_id).single()
  const paymentDays = company?.payment_terms ?? 30
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + paymentDays)

  // Numéro de facture
  const invoiceNumber = await nextInvoiceNumber()
  if (!invoiceNumber) {
    return { error: 'Numéro de facture indisponible. La facture n\'a pas été émise.' }
  }

  const service = createServiceClient()
  const { data: invoice, error: invoiceErr } = await service
    .from('invoices')
    .insert({
      order_id: order.id,
      company_id: order.company_id,
      invoice_number: invoiceNumber,
      status: 'issued',
      issued_at: new Date().toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      amount_paid: 0,
      notes: parsed.data.notes ?? null,
    })
    .select('id')
    .single()

  if (invoiceErr || !invoice) return { error: `Erreur création facture : ${invoiceErr?.message}` }

  revalidatePath('/facturation')
  revalidatePath(`/commandes/${order.id}`)
  return { success: true, data: { invoiceId: invoice.id } }
}

// ── Enregistrer un paiement ────────────────────────────────────────────────

const RecordPaymentSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.number().positive('Le montant doit être positif.'),
  method: z.enum(['virement', 'cheque', 'especes', 'autre']),
  paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reference: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
})

export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>

export async function recordPayment(
  input: RecordPaymentInput,
): Promise<ActionResult> {
  const parsed = RecordPaymentSchema.safeParse(input)
  if (!parsed.success) return { error: 'Données invalides.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role as Role | undefined
  if (!role || !['admin', 'secretaire', 'super_admin'].includes(role))
    return { error: 'Permission refusée.' }

  // Lire la facture
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, total, amount_paid, status')
    .eq('id', parsed.data.invoice_id)
    .single()

  if (!invoice) return { error: 'Facture introuvable.' }
  if (['paid', 'cancelled'].includes(invoice.status))
    return { error: 'Cette facture est déjà soldée ou annulée.' }

  const newAmountPaid = Number(invoice.amount_paid) + parsed.data.amount
  const newStatus =
    newAmountPaid >= Number(invoice.total)
      ? 'paid'
      : 'partially_paid'

  const service = createServiceClient()

  // Insérer le paiement
  const { error: payErr } = await service.from('payments').insert({
    invoice_id: parsed.data.invoice_id,
    amount: parsed.data.amount,
    method: parsed.data.method,
    paid_at: parsed.data.paid_at,
    reference: parsed.data.reference ?? null,
    notes: parsed.data.notes ?? null,
  })
  if (payErr) return { error: `Erreur enregistrement paiement : ${payErr.message}` }

  // Mettre à jour la facture
  const { error: updErr } = await service
    .from('invoices')
    .update({ amount_paid: newAmountPaid, status: newStatus })
    .eq('id', parsed.data.invoice_id)

  if (updErr) return { error: `Erreur mise à jour facture : ${updErr.message}` }

  revalidatePath('/facturation')
  revalidatePath(`/facturation/${parsed.data.invoice_id}`)
  revalidatePath('/relances')
  return { success: true }
}

// ── Marquer une facture en retard ──────────────────────────────────────────

export async function markInvoicesOverdue(): Promise<ActionResult<{ count: number }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role as Role | undefined
  if (!role || !['admin', 'secretaire', 'super_admin'].includes(role))
    return { error: 'Permission refusée.' }

  const today = new Date().toISOString().split('T')[0]
  const service = createServiceClient()

  const { data, error } = await service
    .from('invoices')
    .update({ status: 'overdue' })
    .in('status', ['issued', 'partially_paid'])
    .lt('due_date', today)
    .select('id')

  if (error) return { error: `Erreur : ${error.message}` }

  revalidatePath('/facturation')
  revalidatePath('/relances')
  return { success: true, data: { count: data?.length ?? 0 } }
}

// ── Annuler une facture ────────────────────────────────────────────────────

export async function cancelInvoice(invoiceId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role as Role | undefined
  if (!role || !['admin', 'super_admin'].includes(role))
    return { error: 'Permission refusée (admin uniquement).' }

  const { data: invoice } = await supabase
    .from('invoices').select('status').eq('id', invoiceId).single()
  if (!invoice) return { error: 'Facture introuvable.' }
  if (invoice.status === 'paid') return { error: 'Impossible d\'annuler une facture payée.' }

  const service = createServiceClient()
  const { error } = await service
    .from('invoices').update({ status: 'cancelled' }).eq('id', invoiceId)

  if (error) return { error: error.message }

  revalidatePath('/facturation')
  revalidatePath(`/facturation/${invoiceId}`)
  return { success: true }
}
