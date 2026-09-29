import React from 'react'
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getDocumentSettings } from '@/lib/documents/settings'
import { pdfResponse, refuse } from '@/lib/pdf/respond'
import { companyLines } from '@/lib/pdf/kit'
import { DevisPdf } from '@/lib/pdf/devis/DevisPdf'
import { computeTotal, formatTonnage, priceBasisUnit } from '@/lib/utils/price'
import type { PriceBasis } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * Devis en PDF : la dernière position de la négociation, mise en forme.
 *
 * Le numéro DEV-AAAA-NNNN est attribué à la première édition et ne change
 * plus ; les éditions suivantes reflètent l'état courant (contre-proposition,
 * accord) sous le même numéro.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return refuse('Paramètre « id » manquant', 400)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return refuse('Non autorisé', 401)

  // La RLS tranche : l'exploitation voit toutes les offres, un client les siennes.
  const { data: offer } = await supabase
    .from('offers')
    .select(`
      id, status, quantity, price_basis, requested_date, notes, created_at, quote_number, company_id,
      product:products ( name, tva_rate ), variety:varieties ( name, tva_rate ), format:formats ( name, weight_kg ),
      offer_rounds ( round_number, author_role, unit_price, message, created_at )
    `)
    .eq('id', id)
    .maybeSingle()
  if (!offer) return refuse('Offre introuvable')

  const service = createServiceClient()

  // Attribution du numéro à la première édition.
  let quoteNumber = offer.quote_number as string | null
  if (!quoteNumber) {
    const { data: generated } = await service.rpc('generate_quote_number' as never)
    if (typeof generated === 'string') {
      const { data: updated } = await service
        .from('offers').update({ quote_number: generated }).eq('id', offer.id).is('quote_number', null)
        .select('quote_number').maybeSingle()
      quoteNumber = (updated?.quote_number as string | null) ?? generated
    }
  }
  if (!quoteNumber) return refuse('Numéro de devis indisponible. Rien n\'a été émis.', 404)

  const [settings, { data: company }] = await Promise.all([
    getDocumentSettings(),
    service.from('companies')
      .select('name, address_line1, address_line2, postal_code, city, siren, email, phone')
      .eq('id', offer.company_id).maybeSingle(),
  ])

  const rounds = ((offer.offer_rounds ?? []) as {
    round_number: number; author_role: 'client' | 'admin'; unit_price: number; message: string | null; created_at: string
  }[]).sort((a, b) => b.round_number - a.round_number)
  const last = rounds[0]
  if (!last) return refuse('Aucun prix sur cette offre')

  const fmtRow = offer.format as unknown as { name: string; weight_kg: number | null } | null
  const productRow = offer.product as unknown as { name: string; tva_rate: number | null } | null
  const varietyRow = offer.variety as unknown as { name: string; tva_rate: number | null } | null
  const basis = offer.price_basis as PriceBasis
  const unitPrice = Number(last.unit_price)
  const totalHt = computeTotal({ priceBasis: basis, unitPrice, quantity: offer.quantity, weightKg: fmtRow?.weight_kg })
  // La TVA du produit, surchargée par la variété quand elle en porte une.
  const tvaRate = Number(varietyRow?.tva_rate ?? productRow?.tva_rate ?? 5.5)
  const tvaAmount = totalHt * tvaRate / 100

  const issued = new Date(last.created_at)
  const validUntil = new Date(issued); validUntil.setDate(validUntil.getDate() + settings.quote_validity_days)

  return pdfResponse(
    <DevisPdf
      settings={settings}
      number={quoteNumber}
      issuedAt={issued.toISOString()}
      validUntil={validUntil.toISOString()}
      status={offer.status as 'pending' | 'counter_proposed' | 'accepted' | 'refused' | 'cancelled'}
      lastAuthor={last.author_role}
      company={{ name: company?.name ?? '—', lines: company ? companyLines(company) : [] }}
      product={productRow?.name ?? '—'}
      variety={varietyRow?.name ?? null}
      format={fmtRow?.name ?? null}
      quantity={offer.quantity}
      tonnageLabel={formatTonnage(offer.quantity, fmtRow?.weight_kg).replace(/[  ]/g, ' ')}
      unitPrice={unitPrice}
      basis={basis}
      basisUnit={priceBasisUnit(basis)}
      totalHt={totalHt}
      tvaRate={tvaRate}
      tvaAmount={tvaAmount}
      totalTtc={totalHt + tvaAmount}
      requestedDate={offer.requested_date}
      message={last.message ?? offer.notes ?? null}
    />,
    `${quoteNumber}.pdf`,
  )
}
