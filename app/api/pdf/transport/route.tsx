import React from 'react'
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getDocumentSettings } from '@/lib/documents/settings'
import { pdfResponse, refuse } from '@/lib/pdf/respond'
import { TransportPdf } from '@/lib/pdf/transport/TransportPdf'
import { bcReference } from '@/lib/pdf/bon-commande/BonDeCommandePdf'
import { PALLET_KIND_LABELS, type PalletKind, type Role } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * Bon de transport : ce que le chauffeur emporte. Réservé à l'exploitation —
 * il porte le lieu de chargement, le transporteur et ses coordonnées.
 */
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('order')
  if (!orderId) return refuse('Paramètre « order » manquant', 400)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return refuse('Non autorisé', 401)
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return refuse('Non autorisé', 401)
  if (!['admin', 'secretaire', 'super_admin', 'responsable_conditionnement'].includes(profile.role as Role)) {
    return refuse('Document réservé à l\'exploitation', 403)
  }

  const service = createServiceClient()
  const [settings, { data: order }, { data: sheets }, { data: bc }] = await Promise.all([
    getDocumentSettings(),
    service.from('orders')
      .select(`id, product_name, variety_name, format_name, quantity, delivery_date, delivery_time,
               pickup_location, delivery_location, transport_notes,
               company:companies ( name, address_line1, address_line2, postal_code, city ),
               carrier:carriers ( name, contact_name, email, phone, address_line1, postal_code, city ),
               format:formats ( weight_kg )`)
      .eq('id', orderId).maybeSingle(),
    service.from('pallet_sheets').select('bl_number, lot_number, pallet_count, pallet_kind, parcel_count, net_weight_kg').eq('order_id', orderId),
    service.from('bons_de_commande').select('bc_number, bc_date').eq('order_id', orderId).maybeSingle(),
  ])
  if (!order) return refuse('Commande introuvable')

  const company = order.company as unknown as { name: string; address_line1: string | null; address_line2: string | null; postal_code: string | null; city: string | null } | null
  const carrier = order.carrier as unknown as { name: string; contact_name: string | null; email: string | null; phone: string | null; address_line1: string | null; postal_code: string | null; city: string | null } | null
  const fmtRow = order.format as unknown as { weight_kg: number | null } | null

  const rows = sheets ?? []
  const palletCount = rows.reduce((s, r) => s + (r.pallet_count as number), 0) || null
  const parcelCount = rows.reduce((s, r) => s + ((r.parcel_count as number | null) ?? 0), 0) || null
  const weighed = rows.reduce((s, r) => s + Number(r.net_weight_kg ?? 0), 0)
  const weightKg = weighed || (fmtRow?.weight_kg ? order.quantity * Number(fmtRow.weight_kg) : null)

  const number = bc ? `TR-${bcReference(bc.bc_date as string, bc.bc_number as number).slice(3)}` : `TR-${orderId.slice(0, 6).toUpperCase()}`

  return pdfResponse(
    <TransportPdf
      settings={settings}
      number={number}
      issuedAt={new Date().toISOString()}
      carrier={carrier ? {
        name: carrier.name,
        lines: [
          carrier.contact_name ?? '', carrier.address_line1 ?? '',
          [carrier.postal_code, carrier.city].filter(Boolean).join(' '),
          carrier.phone ?? '', carrier.email ?? '',
        ].filter(Boolean),
      } : null}
      company={{
        name: company?.name ?? '—',
        lines: company ? [
          company.address_line1 ?? '', company.address_line2 ?? '',
          [company.postal_code, company.city].filter(Boolean).join(' '),
        ].filter(Boolean) : [],
      }}
      pickupLocation={(order.pickup_location as string | null) ?? null}
      deliveryLocation={(order.delivery_location as string | null) ?? null}
      deliveryDate={(order.delivery_date as string | null) ?? null}
      deliveryTime={(order.delivery_time as string | null) ?? null}
      product={order.product_name}
      variety={order.variety_name}
      format={order.format_name}
      quantity={order.quantity}
      palletCount={palletCount}
      parcelCount={parcelCount}
      weightKg={weightKg}
      palletKinds={Array.from(new Set(rows.map(r => PALLET_KIND_LABELS[r.pallet_kind as PalletKind] ?? "—")))}
      lots={rows.map(r => r.lot_number as string)}
      blNumbers={rows.map(r => r.bl_number as string | null).filter((n): n is string => !!n)}
      notes={(order.transport_notes as string | null) ?? null}
    />,
    `${number}.pdf`,
  )
}
