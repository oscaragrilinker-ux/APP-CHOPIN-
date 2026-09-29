import React from 'react'
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getDocumentSettings } from '@/lib/documents/settings'
import { pdfResponse, refuse } from '@/lib/pdf/respond'
import { companyLines } from '@/lib/pdf/kit'
import { FacturePdf } from '@/lib/pdf/facture/FacturePdf'
import { bcReference } from '@/lib/pdf/bon-commande/BonDeCommandePdf'
import { priceBasisUnit } from '@/lib/utils/price'
import type { InvoiceStatus, PriceBasis } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * Facture en PDF, régénérée à la demande depuis la base.
 *
 * L'accès passe par la RLS : l'exploitation voit tout, un client pro ne peut
 * ouvrir que ses propres factures. Les détails annexes (commande, règlements,
 * paramètres) sont ensuite lus avec le client service — le droit d'accès a
 * déjà été tranché sur la facture elle-même.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return refuse('Paramètre « id » manquant', 400)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return refuse('Non autorisé', 401)

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, issued_at, due_date, subtotal, tax_rate, tax_amount, total, amount_paid, notes, order_id, company_id')
    .eq('id', id)
    .maybeSingle()
  if (!invoice) return refuse('Facture introuvable')

  const service = createServiceClient()
  const [settings, { data: order }, { data: company }, { data: payments }, { data: bc }] = await Promise.all([
    getDocumentSettings(),
    service.from('orders')
      .select('id, product_name, variety_name, format_name, quantity, unit_price, price_basis, delivery_date')
      .eq('id', invoice.order_id).maybeSingle(),
    service.from('companies')
      .select('name, address_line1, address_line2, postal_code, city, siren, email, phone')
      .eq('id', invoice.company_id).maybeSingle(),
    service.from('payments')
      .select('paid_at, amount, method, reference')
      .eq('invoice_id', invoice.id).order('paid_at'),
    service.from('bons_de_commande')
      .select('bc_number, bc_date')
      .eq('order_id', invoice.order_id).maybeSingle(),
  ])

  const o = order as {
    id: string; product_name: string; variety_name: string | null; format_name: string | null
    quantity: number; unit_price: number | null; price_basis: PriceBasis | null; delivery_date: string | null
  } | null

  return pdfResponse(
    <FacturePdf
      settings={settings}
      number={invoice.invoice_number}
      status={invoice.status as InvoiceStatus}
      issuedAt={invoice.issued_at}
      dueDate={invoice.due_date}
      company={{ name: company?.name ?? '—', lines: company ? companyLines(company) : [] }}
      orderRef={o ? o.id.slice(0, 8).toUpperCase() : '—'}
      bcNumber={bc ? bcReference(bc.bc_date as string, bc.bc_number as number) : null}
      deliveryDate={o?.delivery_date ?? null}
      product={o?.product_name ?? '—'}
      variety={o?.variety_name ?? null}
      format={o?.format_name ?? null}
      quantity={o?.quantity ?? 0}
      unitPrice={o?.unit_price != null ? Number(o.unit_price) : null}
      basisUnit={o?.price_basis ? priceBasisUnit(o.price_basis) : null}
      subtotal={Number(invoice.subtotal)}
      taxRate={Number(invoice.tax_rate)}
      taxAmount={Number(invoice.tax_amount)}
      total={Number(invoice.total)}
      amountPaid={Number(invoice.amount_paid)}
      payments={(payments ?? []).map(p => ({
        paidAt: p.paid_at as string, amount: Number(p.amount), method: p.method as string,
        reference: (p.reference as string | null) ?? null,
      }))}
      notes={invoice.notes}
    />,
    `${invoice.invoice_number}.pdf`,
  )
}
