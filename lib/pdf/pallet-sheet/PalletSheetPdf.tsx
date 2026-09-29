import React from 'react'
import { StyleSheet, Text, View, Image } from '@react-pdf/renderer'
import type { DocumentSettings } from '@/lib/documents/settings'
import {
  PdfDoc, Letterhead, SectionTitle, KV, NoteBox, SignatureRow, LegalFooter, S, T, fmt,
} from '@/lib/pdf/kit'

export type PalletSheetPdfProps = {
  settings: DocumentSettings
  blNumber: string | null
  lotNumber: string
  lotDate: string          // YYYY-MM-DD
  companyName: string
  productName: string
  varietyName: string | null
  palletCount: number
  palletKindLabel: string
  packagingType: string | null
  parcelCount: number | null
  strappingLabel: string
  netWeightKg: number | null
  operatorName: string | null
  preparedAt: string
  deliveryDate: string | null
  deliveryLocation: string | null
  carrierName: string | null
  notes: string | null
  /** QR code encodant le numéro de lot, en data URI PNG. */
  qrDataUri: string | null
}

// Le lot est l'information qu'un cariste doit lire à distance : plus grand
// que tout le reste, avec son QR à côté.
const local = StyleSheet.create({
  lotBand: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: T.soft, borderWidth: 1, borderColor: T.bone,
    borderRadius: 4, padding: 14, marginBottom: 18,
  },
  lotLabel: { fontSize: 6.5, color: T.soil, letterSpacing: 1.6, marginBottom: 4, fontFamily: 'Helvetica-Bold' },
  lotValue: { fontSize: 27, color: T.ink, fontFamily: 'Helvetica-Bold' },
  lotDate: { fontSize: 8.5, color: T.muted, marginTop: 4 },
  qr: { width: 80, height: 80 },
})

export function PalletSheetPdf(p: PalletSheetPdfProps) {
  return (
    <PdfDoc title={`Fiche palette ${p.lotNumber}`}>
      <Letterhead
        settings={p.settings}
        title="Fiche palette"
        number={p.blNumber ?? 'BL à émettre'}
        meta={[`Éditée le ${fmt.date(new Date())}`]}
      />

      <View style={local.lotBand}>
        <View>
          <Text style={local.lotLabel}>NUMÉRO DE LOT</Text>
          <Text style={local.lotValue}>{p.lotNumber}</Text>
          <Text style={local.lotDate}>Lot du {fmt.dateShort(p.lotDate)}</Text>
        </View>
        {p.qrDataUri && <Image src={p.qrDataUri} style={local.qr} />}
      </View>

      <View style={S.section}>
        <SectionTitle>Marchandise</SectionTitle>
        <KV cols={2} items={[
          { label: 'Produit', value: p.productName },
          { label: 'Variété', value: p.varietyName ?? '—' },
          { label: 'Client', value: p.companyName },
          { label: 'Conditionnement', value: p.packagingType ?? '—' },
        ]} />
      </View>

      <View style={S.section}>
        <SectionTitle>Palettisation</SectionTitle>
        <KV cols={3} items={[
          { label: 'Nombre de palettes', value: fmt.num(p.palletCount), big: true },
          { label: 'Nombre de colis', value: p.parcelCount != null ? fmt.num(p.parcelCount) : '—', big: true },
          { label: 'Poids net', value: p.netWeightKg != null ? `${fmt.num(p.netWeightKg)} kg` : '—', big: true },
          { label: 'Type de palette', value: p.palletKindLabel },
          { label: 'Cerclage', value: p.strappingLabel },
        ]} />
      </View>

      <View style={S.section}>
        <SectionTitle>Expédition</SectionTitle>
        <KV cols={3} items={[
          { label: 'Date de livraison', value: fmt.dateShort(p.deliveryDate) },
          { label: 'Transporteur', value: p.carrierName ?? '—' },
          { label: 'Destination', value: p.deliveryLocation ?? '—' },
        ]} />
      </View>

      {p.notes && (
        <View style={S.section}>
          <NoteBox title="Observations" text={p.notes} />
        </View>
      )}

      <View style={S.section}>
        <KV cols={3} items={[
          { label: 'Préparé par', value: `${p.operatorName ?? '—'} · le ${fmt.dateShort(p.preparedAt.slice(0, 10))}` },
        ]} />
      </View>
      <SignatureRow labels={['Contrôlé par', 'Réceptionné par']} />

      <LegalFooter settings={p.settings} extra={`Lot ${p.lotNumber}${p.blNumber ? ` · ${p.blNumber}` : ''}`} />
    </PdfDoc>
  )
}
