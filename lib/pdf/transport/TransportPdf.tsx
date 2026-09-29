import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import type { DocumentSettings } from '@/lib/documents/settings'
import {
  PdfDoc, Letterhead, Parties, SectionTitle, KV, LineTable, NoteBox, SignatureRow,
  Stamp, LegalFooter, S, fmt, type Party,
} from '@/lib/pdf/kit'

export type TransportPdfProps = {
  settings: DocumentSettings
  number: string
  issuedAt: string
  carrier: Party | null
  company: Party
  pickupLocation: string | null
  deliveryLocation: string | null
  deliveryDate: string | null
  deliveryTime: string | null
  product: string
  variety: string | null
  format: string | null
  quantity: number
  palletCount: number | null
  parcelCount: number | null
  weightKg: number | null
  palletKinds: string[]
  lots: string[]
  blNumbers: string[]
  notes: string | null
}

export function TransportPdf(p: TransportPdfProps) {
  return (
    <PdfDoc title={`Bon de transport ${p.number}`}>
      <Letterhead
        settings={p.settings}
        title="Bon de transport"
        number={p.number}
        meta={[`Édité le ${fmt.date(p.issuedAt)}`]}
      />
      {!p.carrier && <Stamp text="Transporteur non désigné" />}

      <Parties
        settings={p.settings}
        recipient={p.carrier ?? { name: 'Transporteur à désigner', lines: [] }}
        recipientLabel="TRANSPORTEUR"
      />

      <View style={S.section}>
        <SectionTitle>Enlèvement</SectionTitle>
        <KV cols={3} items={[
          { label: 'Lieu de chargement', value: p.pickupLocation ?? `${p.settings.address_line1}, ${p.settings.postal_code} ${p.settings.city}` },
          { label: 'Date', value: fmt.date(p.deliveryDate) },
          { label: 'Heure', value: p.deliveryTime ? p.deliveryTime.slice(0, 5) : 'à convenir' },
        ]} />
      </View>

      <View style={S.section}>
        <SectionTitle>Livraison</SectionTitle>
        <KV cols={2} items={[
          { label: 'Destinataire', value: p.company.name },
          { label: 'Adresse de livraison', value: p.deliveryLocation ?? p.company.lines[0] ?? '—' },
        ]} />
      </View>

      <View style={S.section}>
        <SectionTitle>Chargement</SectionTitle>
        <KV cols={3} items={[
          { label: 'Palettes', value: p.palletCount != null ? fmt.num(p.palletCount) : '—', big: true },
          { label: 'Colis', value: p.parcelCount != null ? fmt.num(p.parcelCount) : '—', big: true },
          { label: 'Poids total', value: p.weightKg != null ? `${fmt.num(p.weightKg)} kg` : '—', big: true },
        ]} />
        <LineTable
          columns={[
            { key: 'k', label: 'Désignation', width: 45 },
            { key: 'v', label: 'Détail', width: 55 },
          ]}
          rows={[
            { k: 'Marchandise', v: [p.product, p.variety].filter(Boolean).join(' · ') },
            { k: 'Conditionnement', v: `${fmt.num(p.quantity)} × ${p.format ?? 'contenant'}` },
            { k: 'Types de palette', v: p.palletKinds.length ? p.palletKinds.join(', ') : '—' },
            { k: 'Lots', v: p.lots.length ? p.lots.join(', ') : '—' },
            { k: 'Bons de livraison', v: p.blNumbers.length ? p.blNumbers.join(', ') : 'à émettre' },
          ]}
        />
      </View>

      <View style={S.section}>
        <NoteBox
          title="Consignes"
          text={[
            'Produit frais : transport à température ambiante ventilée, à l\'abri du gel et de la pluie.',
            'Palettes filmées : ne pas gerber. Rendre les palettes Europe consignées.',
            p.notes ?? '',
          ].filter(Boolean).join('\n')}
        />
      </View>

      <Text style={[S.noteText, { marginBottom: 2 }]}>
        Prise en charge sans réserve, sauf mention contraire portée ci-dessous par le transporteur.
      </Text>
      <SignatureRow labels={['Chargé par (date, nom)', 'Transporteur (date, plaque, signature)']} />

      <LegalFooter settings={p.settings} />
    </PdfDoc>
  )
}
