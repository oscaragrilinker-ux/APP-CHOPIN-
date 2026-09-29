import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import type { DocumentSettings } from '@/lib/documents/settings'
import {
  PdfDoc, Letterhead, Parties, SectionTitle, KV, LineTable, NoteBox, SignatureRow,
  Stamp, LegalFooter, S, fmt, type Party,
} from '@/lib/pdf/kit'

export type BlLine = {
  blNumber: string | null
  lotNumber: string
  lotDate: string
  palletCount: number
  palletKindLabel: string
  parcelCount: number | null
  packagingType: string | null
  strappingLabel: string
  netWeightKg: number | null
}

export type BonLivraisonPdfProps = {
  settings: DocumentSettings
  /** Numéro du bon : celui de la première fiche, ou « provisoire » s'il n'est pas émis. */
  number: string
  provisional: boolean
  issuedAt: string
  company: Party
  deliveryLocation: string | null
  deliveryDate: string | null
  deliveryTime: string | null
  carrierName: string | null
  bcNumber: string | null
  product: string
  variety: string | null
  format: string | null
  quantity: number
  lines: BlLine[]
  notes: string | null
}

export function BonLivraisonPdf(p: BonLivraisonPdfProps) {
  const pallets = p.lines.reduce((s, l) => s + l.palletCount, 0)
  const parcels = p.lines.reduce((s, l) => s + (l.parcelCount ?? 0), 0)
  const weight = p.lines.reduce((s, l) => s + (l.netWeightKg ?? 0), 0)

  return (
    <PdfDoc title={`Bon de livraison ${p.number}`}>
      <Letterhead
        settings={p.settings}
        title="Bon de livraison"
        number={p.number}
        meta={[`Édité le ${fmt.date(p.issuedAt)}`, p.bcNumber ? `Réf. bon de commande ${p.bcNumber}` : '']}
      />
      {p.provisional && <Stamp text="Provisoire — numéro non émis" />}

      <Parties settings={p.settings} recipient={p.company} recipientLabel="LIVRÉ À" />

      <View style={S.section}>
        <SectionTitle>Livraison</SectionTitle>
        <KV cols={3} items={[
          { label: 'Adresse de livraison', value: p.deliveryLocation ?? '—' },
          { label: 'Date', value: p.deliveryDate ? `${fmt.date(p.deliveryDate)}${p.deliveryTime ? ` à ${p.deliveryTime.slice(0, 5)}` : ''}` : '—' },
          { label: 'Transporteur', value: p.carrierName ?? '—' },
        ]} />
      </View>

      <View style={S.section}>
        <SectionTitle>Marchandise</SectionTitle>
        <KV cols={3} items={[
          { label: 'Produit', value: [p.product, p.variety].filter(Boolean).join(' · ') },
          { label: 'Conditionnement', value: p.format ?? '—' },
          { label: 'Quantité commandée', value: `${fmt.num(p.quantity)} contenants` },
        ]} />
      </View>

      <View style={S.section}>
        <SectionTitle>Palettes expédiées</SectionTitle>
        {p.lines.length === 0 ? (
          <NoteBox title="Aucune palette" text="Aucune fiche palette n'a encore été saisie pour cette commande." />
        ) : (
          <LineTable
            columns={[
              { key: 'lot', label: 'Lot', width: 26 },
              { key: 'bl', label: 'N° BL', width: 16 },
              { key: 'pal', label: 'Palettes', width: 18 },
              { key: 'colis', label: 'Colis', width: 12, align: 'right' },
              { key: 'poids', label: 'Poids net', width: 14, align: 'right' },
              { key: 'cercl', label: 'Cerclage', width: 14 },
            ]}
            rows={p.lines.map(l => ({
              lot: { main: l.lotNumber, sub: `Lot du ${fmt.dateShort(l.lotDate)}` },
              bl: l.blNumber ?? 'à émettre',
              pal: { main: `${l.palletCount} × ${l.palletKindLabel}`, sub: l.packagingType ?? undefined },
              colis: l.parcelCount != null ? fmt.num(l.parcelCount) : '—',
              poids: l.netWeightKg != null ? `${fmt.num(l.netWeightKg)} kg` : '—',
              cercl: l.strappingLabel,
            }))}
          />
        )}
        {p.lines.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <KV cols={3} items={[
              { label: 'Total palettes', value: fmt.num(pallets), big: true },
              { label: 'Total colis', value: parcels ? fmt.num(parcels) : '—', big: true },
              { label: 'Poids net total', value: weight ? `${fmt.num(weight)} kg` : '—', big: true },
            ]} />
          </View>
        )}
      </View>

      {p.notes && (
        <View style={S.section}>
          <NoteBox title="Remarques" text={p.notes} />
        </View>
      )}

      <Text style={[S.noteText, { marginTop: 4, marginBottom: 2 }]}>
        Marchandise reçue en bon état, sauf réserves écrites ci-dessous. Toute réserve doit être
        portée sur ce bon à la réception et confirmée dans les 48 heures.
      </Text>
      <SignatureRow labels={['Expédié par (date, nom)', 'Transporteur (date, signature)', 'Reçu par (date, cachet, réserves)']} />

      <LegalFooter settings={p.settings} extra={p.settings.delivery_footer} />
    </PdfDoc>
  )
}
