import React from 'react'
import { View } from '@react-pdf/renderer'
import type { PriceBasis } from '@/types'
import type { DocumentSettings } from '@/lib/documents/settings'
import { priceBasisLabel, priceBasisUnit } from '@/lib/utils/price'
import {
  PdfDoc, Letterhead, Parties, SectionTitle, KV, LineTable, Totals, NoteBox, Stamp,
  LegalFooter, S, fmt, type Party,
} from '@/lib/pdf/kit'

export type BcPdfProps = {
  settings: DocumentSettings
  bcNumber: number
  bcDate: string       // YYYY-MM-DD
  company: Party
  productName: string
  varietyName: string
  formatName: string
  quantity: number
  deliveryDate: string | null
  notes: string | null
  showPrices: boolean
  // Champs financiers — seulement quand showPrices = true
  unitPrice?: number | null
  totalHt?: number | null    // = orders.total_price (montant HT figé)
  tvaRate?: number | null    // en % ex: 5.5
  priceBasis?: PriceBasis | null
}

export function bcReference(bcDate: string, bcNumber: number): string {
  return `BC-${bcDate.slice(0, 4)}-${String(bcNumber).padStart(4, '0')}`
}

/**
 * Bon de commande.
 *
 * Deux versions du même document : avec prix pour l'exploitation et le
 * client, sans aucune mention tarifaire pour l'atelier — le choix est fait par
 * la route selon le rôle, jamais par le composant.
 */
export function BonDeCommandePdf(p: BcPdfProps) {
  const withPrices =
    p.showPrices && p.unitPrice != null && p.totalHt != null && p.tvaRate != null && !!p.priceBasis
  const tvaAmount = withPrices ? p.totalHt! * p.tvaRate! / 100 : 0
  const ref = bcReference(p.bcDate, p.bcNumber)

  return (
    <PdfDoc title={`Bon de commande ${ref}`}>
      <Letterhead
        settings={p.settings}
        title="Bon de commande"
        number={ref}
        meta={[`Émis le ${fmt.date(p.bcDate)}`]}
      />
      {!p.showPrices && <Stamp text="Exemplaire atelier — sans prix" ok />}

      <Parties settings={p.settings} recipient={p.company} recipientLabel="CLIENT" />

      <View style={S.section}>
        <SectionTitle>Commande</SectionTitle>
        <KV cols={3} items={[
          { label: 'Produit', value: p.productName },
          { label: 'Variété', value: p.varietyName || '—' },
          { label: 'Conditionnement', value: p.formatName || '—' },
          { label: 'Quantité', value: `${fmt.num(p.quantity)} contenant${p.quantity > 1 ? 's' : ''}`, big: true },
          { label: 'Livraison prévue', value: fmt.date(p.deliveryDate) },
        ]} />
      </View>

      {withPrices && (
        <View style={S.section}>
          <SectionTitle>Détail financier</SectionTitle>
          <LineTable
            columns={[
              { key: 'designation', label: 'Désignation', width: 40 },
              { key: 'qty', label: 'Quantité', width: 16, align: 'right' },
              { key: 'pu', label: 'Prix unitaire', width: 22, align: 'right' },
              { key: 'total', label: 'Total HT', width: 22, align: 'right' },
            ]}
            rows={[{
              designation: {
                main: [p.productName, p.varietyName].filter(Boolean).join(' · '),
                sub: p.formatName ? `Conditionnement : ${p.formatName}` : undefined,
              },
              qty: fmt.num(p.quantity),
              pu: { main: fmt.euro(p.unitPrice!), sub: `${priceBasisLabel(p.priceBasis!)} (${priceBasisUnit(p.priceBasis!)})` },
              total: fmt.euro(p.totalHt!),
            }]}
          />
          <Totals
            rows={[
              { label: 'Total HT', value: fmt.euro(p.totalHt!) },
              { label: `TVA ${fmt.pct(p.tvaRate!)}`, value: fmt.euro(tvaAmount) },
            ]}
            main={{ label: 'Total TTC', value: fmt.euro(p.totalHt! + tvaAmount) }}
          />
        </View>
      )}

      {p.notes && (
        <View style={S.section}>
          <NoteBox title="Notes" text={p.notes} />
        </View>
      )}

      <LegalFooter settings={p.settings} />
    </PdfDoc>
  )
}
