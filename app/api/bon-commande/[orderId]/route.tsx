import React from 'react'
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BonDeCommandePdf, bcReference } from '@/lib/pdf/bon-commande/BonDeCommandePdf'
import { getDocumentSettings } from '@/lib/documents/settings'
import { pdfResponse } from '@/lib/pdf/respond'
import { companyLines } from '@/lib/pdf/kit'
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
  const showPrices = !['conditionnement', 'responsable_conditionnement'].includes(role)
  const settings = await getDocumentSettings()

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
      settings,
      bcNumber: bc.bc_number,
      bcDate: bc.bc_date,
      company: { name: row.company_name, lines: [] },
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
         company:companies ( name, address_line1, address_line2, postal_code, city, siren, email, phone )`,
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
      company: { name: string; address_line1: string | null; address_line2: string | null; postal_code: string | null; city: string | null; siren: string | null; email: string | null; phone: string | null } | null
    }

    pdfProps = {
      settings,
      bcNumber: bc.bc_number,
      bcDate: bc.bc_date,
      company: { name: row.company?.name ?? '—', lines: row.company ? companyLines(row.company) : [] },
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

  return pdfResponse(<BonDeCommandePdf {...pdfProps} />, `${bcReference(bc.bc_date, bc.bc_number)}.pdf`)
}
