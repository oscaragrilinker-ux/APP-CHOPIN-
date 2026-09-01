import React from 'react'
import { type NextRequest } from 'next/server'
import { renderToStream } from '@react-pdf/renderer'
import { Readable } from 'stream'
import { createClient } from '@/lib/supabase/server'
import { BonDeCommandePdf } from '@/lib/pdf/bon-commande/BonDeCommandePdf'
import type { BcPdfProps } from '@/lib/pdf/bon-commande/BonDeCommandePdf'
import type { Role, PriceBasis } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { orderId: string } },
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Non autorisé', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile) return new Response('Non autorisé', { status: 401 })

  const role = profile.role as Role
  const showPrices = role !== 'conditionnement'

  // ── Récupérer le BC (RLS filtre selon le rôle) ───────────────────────────
  const { data: bc } = await supabase
    .from('bons_de_commande')
    .select('bc_number, bc_date')
    .eq('order_id', params.orderId)
    .single()

  if (!bc) return new Response('Bon de commande introuvable', { status: 404 })

  // ── Données commande selon le rôle ────────────────────────────────────────
  let pdfProps: BcPdfProps

  if (!showPrices) {
    // conditionnement : vue sans prix (orders_for_conditionnement)
    const { data: o } = await supabase
      .from('orders_for_conditionnement' as unknown as 'orders')
      .select(
        'product_name, variety_name, format_name, quantity, delivery_date, notes, company_name',
      )
      .eq('id', params.orderId)
      .single()

    if (!o) return new Response('Commande introuvable', { status: 404 })

    const row = o as unknown as {
      product_name: string
      variety_name: string
      format_name: string
      quantity: number
      delivery_date: string | null
      notes: string | null
      company_name: string
    }

    pdfProps = {
      bcNumber: bc.bc_number,
      bcDate: bc.bc_date,
      companyName: row.company_name,
      productName: row.product_name,
      varietyName: row.variety_name,
      formatName: row.format_name,
      quantity: row.quantity,
      deliveryDate: row.delivery_date,
      notes: row.notes,
      showPrices: false,
    }
  } else {
    // admin / secretaire / super_admin / client_pro : avec prix
    const { data: o } = await supabase
      .from('orders')
      .select(
        `product_name, variety_name, format_name, quantity,
         unit_price, total_price, price_basis, tva_rate,
         delivery_date, notes,
         company:companies ( name )`,
      )
      .eq('id', params.orderId)
      .single()

    if (!o) return new Response('Commande introuvable', { status: 404 })

    const row = o as unknown as {
      product_name: string
      variety_name: string
      format_name: string
      quantity: number
      unit_price: number
      total_price: number
      price_basis: PriceBasis
      tva_rate: number
      delivery_date: string | null
      notes: string | null
      company: { name: string } | null
    }

    pdfProps = {
      bcNumber: bc.bc_number,
      bcDate: bc.bc_date,
      companyName: row.company?.name ?? '—',
      productName: row.product_name,
      varietyName: row.variety_name,
      formatName: row.format_name,
      quantity: row.quantity,
      deliveryDate: row.delivery_date,
      notes: row.notes,
      showPrices: true,
      unitPrice: row.unit_price,
      totalHt: row.total_price,
      tvaRate: row.tva_rate,
      priceBasis: row.price_basis,
    }
  }

  // ── Génération et streaming du PDF ────────────────────────────────────────
  const pdfStream = await renderToStream(<BonDeCommandePdf {...pdfProps} />)
  const nodeStream = pdfStream as unknown as Readable
  const webStream = Readable.toWeb(nodeStream) as ReadableStream

  const year = bc.bc_date.slice(0, 4)
  const bcNumStr = `${year}-${String(bc.bc_number).padStart(4, '0')}`

  return new Response(webStream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="BC-${bcNumStr}.pdf"`,
    },
  })
}
