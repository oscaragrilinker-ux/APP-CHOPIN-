import React from 'react'
import { type NextRequest } from 'next/server'
import { renderToStream } from '@react-pdf/renderer'
import { Readable } from 'stream'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/server'
import { PalletSheetPdf } from '@/lib/pdf/pallet-sheet/PalletSheetPdf'
import {
  ATELIER_ROLES, PALLET_KIND_LABELS, STRAPPING_LABELS,
  type PalletKind, type Role, type StrappingKind,
} from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return new Response('Paramètre « id » manquant', { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Non autorisé', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return new Response('Non autorisé', { status: 401 })

  const role = profile.role as Role

  // La RLS filtre déjà : l'atelier et Chopin voient tout, le client
  // uniquement les fiches de ses propres commandes (migration 00020).
  const { data: sheet } = await supabase
    .from('pallet_sheets')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!sheet) return new Response('Fiche palette introuvable', { status: 404 })

  // La commande passe par la vue sans prix pour l'atelier : une fiche palette
  // ne doit jamais devenir un canal de fuite tarifaire.
  const isAtelier = ATELIER_ROLES.includes(role)
  const { data: order } = isAtelier
    ? await supabase
        .from('orders_for_conditionnement' as 'orders')
        .select('product_name, variety_name, delivery_date, delivery_location, company_name, carrier_name')
        .eq('id', sheet.order_id as string)
        .maybeSingle()
    : await supabase
        .from('orders')
        .select(`product_name, variety_name, delivery_date, delivery_location,
                 company:companies(name), carrier:carriers(name)`)
        .eq('id', sheet.order_id as string)
        .maybeSingle()

  if (!order) return new Response('Commande introuvable', { status: 404 })

  const row = order as Record<string, unknown>
  const companyName =
    (row.company_name as string) ??
    ((row.company as { name: string } | null)?.name ?? '—')
  const carrierName =
    (row.carrier_name as string | null) ??
    ((row.carrier as { name: string } | null)?.name ?? null)

  // Le QR encode le numéro de lot : scanné en entrepôt, il identifie la palette
  // sans dépendre d'une connexion réseau.
  const qrDataUri = await QRCode.toDataURL(sheet.lot_number as string, {
    margin: 0,
    width: 320,
    errorCorrectionLevel: 'M',
    color: { dark: '#1F3D2BFF', light: '#FFFFFFFF' },
  }).catch(() => null)

  const stream = await renderToStream(
    <PalletSheetPdf
      blNumber={(sheet.bl_number as string | null) ?? null}
      lotNumber={sheet.lot_number as string}
      lotDate={sheet.lot_date as string}
      companyName={companyName}
      productName={(row.product_name as string) ?? '—'}
      varietyName={(row.variety_name as string | null) ?? null}
      palletCount={sheet.pallet_count as number}
      palletKindLabel={PALLET_KIND_LABELS[sheet.pallet_kind as PalletKind] ?? '—'}
      packagingType={(sheet.packaging_type as string | null) ?? null}
      parcelCount={(sheet.parcel_count as number | null) ?? null}
      strappingLabel={STRAPPING_LABELS[sheet.strapping as StrappingKind] ?? '—'}
      netWeightKg={sheet.net_weight_kg != null ? Number(sheet.net_weight_kg) : null}
      operatorName={(sheet.operator_name as string | null) ?? null}
      preparedAt={sheet.prepared_at as string}
      deliveryDate={(row.delivery_date as string | null) ?? null}
      deliveryLocation={(row.delivery_location as string | null) ?? null}
      carrierName={carrierName}
      notes={(sheet.notes as string | null) ?? null}
      qrDataUri={qrDataUri}
    />,
  )

  const filename = sheet.bl_number
    ? `fiche-palette-${sheet.bl_number}.pdf`
    : `fiche-palette-${sheet.lot_number}.pdf`

  return new Response(Readable.toWeb(stream as unknown as Readable) as ReadableStream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
