import React from 'react'
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getDocumentSettings } from '@/lib/documents/settings'
import { pdfResponse, refuse } from '@/lib/pdf/respond'
import { companyLines } from '@/lib/pdf/kit'
import { BonLivraisonPdf, type BlLine } from '@/lib/pdf/bon-livraison/BonLivraisonPdf'
import { bcReference } from '@/lib/pdf/bon-commande/BonDeCommandePdf'
import { ATELIER_ROLES, PALLET_KIND_LABELS, STRAPPING_LABELS, type PalletKind, type Role, type StrappingKind } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * Bon de livraison d'une commande : toutes ses palettes sur un seul document.
 *
 * Le numéro est celui attribué aux fiches palette (generate_bl_number). Tant
 * qu'une fiche n'en a pas, le document sort tamponné « provisoire » : rien
 * n'est émis à la lecture, l'émission est une action explicite.
 */
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('order')
  if (!orderId) return refuse('Paramètre « order » manquant', 400)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return refuse('Non autorisé', 401)
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return refuse('Non autorisé', 401)
  const role = profile.role as Role

  // Accès : l'atelier via sa vue sans prix, les autres via la table (RLS).
  const { data: access } = ATELIER_ROLES.includes(role)
    ? await supabase.from('orders_for_conditionnement' as 'orders').select('id').eq('id', orderId).maybeSingle()
    : await supabase.from('orders').select('id').eq('id', orderId).maybeSingle()
  if (!access) return refuse('Commande introuvable')

  const service = createServiceClient()
  const [settings, { data: order }, { data: sheets }, { data: bc }] = await Promise.all([
    getDocumentSettings(),
    service.from('orders')
      .select(`id, product_name, variety_name, format_name, quantity, delivery_date, delivery_time, delivery_location, notes,
               company:companies ( name, address_line1, address_line2, postal_code, city, siren, email, phone ),
               carrier:carriers ( name )`)
      .eq('id', orderId).maybeSingle(),
    service.from('pallet_sheets').select('*').eq('order_id', orderId).order('prepared_at'),
    service.from('bons_de_commande').select('bc_number, bc_date').eq('order_id', orderId).maybeSingle(),
  ])
  if (!order) return refuse('Commande introuvable')

  const company = order.company as unknown as {
    name: string; address_line1: string | null; address_line2: string | null; postal_code: string | null
    city: string | null; siren: string | null; email: string | null; phone: string | null
  } | null

  const lines: BlLine[] = (sheets ?? []).map(s => ({
    blNumber: (s.bl_number as string | null) ?? null,
    lotNumber: s.lot_number as string,
    lotDate: s.lot_date as string,
    palletCount: s.pallet_count as number,
    palletKindLabel: PALLET_KIND_LABELS[s.pallet_kind as PalletKind] ?? '—',
    parcelCount: (s.parcel_count as number | null) ?? null,
    packagingType: (s.packaging_type as string | null) ?? null,
    strappingLabel: STRAPPING_LABELS[s.strapping as StrappingKind] ?? '—',
    netWeightKg: s.net_weight_kg != null ? Number(s.net_weight_kg) : null,
  }))

  const issuedNumbers = lines.map(l => l.blNumber).filter((n): n is string => !!n)
  const provisional = lines.length === 0 || issuedNumbers.length < lines.length
  const number = issuedNumbers[0] ?? `BL-PROVISOIRE-${orderId.slice(0, 6).toUpperCase()}`

  return pdfResponse(
    <BonLivraisonPdf
      settings={settings}
      number={number}
      provisional={provisional}
      issuedAt={new Date().toISOString()}
      company={{ name: company?.name ?? '—', lines: company ? companyLines(company) : [] }}
      deliveryLocation={(order.delivery_location as string | null) ?? null}
      deliveryDate={(order.delivery_date as string | null) ?? null}
      deliveryTime={(order.delivery_time as string | null) ?? null}
      carrierName={(order.carrier as unknown as { name: string } | null)?.name ?? null}
      bcNumber={bc ? bcReference(bc.bc_date as string, bc.bc_number as number) : null}
      product={order.product_name}
      variety={order.variety_name}
      format={order.format_name}
      quantity={order.quantity}
      lines={lines}
      notes={(order.notes as string | null) ?? null}
    />,
    `${number}.pdf`,
  )
}
