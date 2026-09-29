import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import type { DocumentSettings } from '@/lib/documents/settings'
import type { PriceBasis } from '@/types'
import {
  PdfDoc, Letterhead, Parties, SectionTitle, KV, LineTable, Totals, NoteBox, SignatureRow,
  Stamp, LegalFooter, S, fmt, type Party,
} from '@/lib/pdf/kit'

export type DevisPdfProps = {
  settings: DocumentSettings
  number: string
  issuedAt: string
  validUntil: string
  status: 'pending' | 'counter_proposed' | 'accepted' | 'refused' | 'cancelled'
  /** Qui a fixé le dernier prix : le devis reflète la dernière position. */
  lastAuthor: 'client' | 'admin'
  company: Party
  product: string
  variety: string | null
  format: string | null
  quantity: number
  tonnageLabel: string
  unitPrice: number
  basis: PriceBasis
  basisUnit: string
  totalHt: number
  tvaRate: number
  tvaAmount: number
  totalTtc: number
  requestedDate: string | null
  message: string | null
}

const STATUS_STAMP: Record<DevisPdfProps['status'], { text: string; ok: boolean } | null> = {
  pending:         { text: 'Proposition en attente', ok: false },
  counter_proposed:{ text: 'Contre-proposition', ok: false },
  accepted:        { text: 'Accepté — commande créée', ok: true },
  refused:         { text: 'Refusé', ok: false },
  cancelled:       { text: 'Annulé', ok: false },
}

export function DevisPdf(p: DevisPdfProps) {
  const stamp = STATUS_STAMP[p.status]
  return (
    <PdfDoc title={`Devis ${p.number}`}>
      <Letterhead
        settings={p.settings}
        title="Devis"
        number={p.number}
        meta={[`Émis le ${fmt.date(p.issuedAt)}`, `Valable jusqu'au ${fmt.date(p.validUntil)}`]}
      />
      {stamp && <Stamp text={stamp.text} ok={stamp.ok} />}

      <Parties settings={p.settings} recipient={p.company} recipientLabel="CLIENT" />

      <View style={S.section}>
        <SectionTitle>Objet</SectionTitle>
        <LineTable
          columns={[
            { key: 'designation', label: 'Désignation', width: 40 },
            { key: 'qty', label: 'Quantité', width: 16, align: 'right' },
            { key: 'pu', label: 'Prix unitaire', width: 22, align: 'right' },
            { key: 'total', label: 'Total HT', width: 22, align: 'right' },
          ]}
          rows={[{
            designation: {
              main: [p.product, p.variety].filter(Boolean).join(' · '),
              sub: p.format ? `Conditionnement : ${p.format}` : undefined,
            },
            qty: { main: `${fmt.num(p.quantity)} contenant${p.quantity > 1 ? 's' : ''}`, sub: p.tonnageLabel },
            pu: { main: fmt.euro(p.unitPrice), sub: p.basisUnit },
            total: fmt.euro(p.totalHt),
          }]}
        />
        <Totals
          rows={[
            { label: 'Total HT', value: fmt.euro(p.totalHt) },
            { label: `TVA ${fmt.pct(p.tvaRate)}`, value: fmt.euro(p.tvaAmount) },
          ]}
          main={{ label: 'Total TTC', value: fmt.euro(p.totalTtc) }}
        />
      </View>

      <View style={S.section}>
        <SectionTitle>Conditions</SectionTitle>
        <KV cols={3} items={[
          { label: 'Livraison souhaitée', value: fmt.date(p.requestedDate) },
          { label: 'Validité de l\'offre', value: `${p.settings.quote_validity_days} jours` },
          { label: 'Dernier prix fixé par', value: p.lastAuthor === 'client' ? 'le client' : p.settings.legal_name },
        ]} />
        <NoteBox title="Règlement" text={p.settings.payment_terms_text} />
      </View>

      {p.message && (
        <View style={S.section}>
          <NoteBox title="Message" text={p.message} />
        </View>
      )}

      {p.settings.quote_footer && (
        <View style={S.section}>
          <Text style={S.noteText}>{p.settings.quote_footer}</Text>
        </View>
      )}

      {p.status !== 'accepted' && p.status !== 'refused' && p.status !== 'cancelled' && (
        <SignatureRow labels={['Bon pour accord — le client (date, cachet, signature)', `Pour ${p.settings.legal_name}`]} />
      )}

      <LegalFooter settings={p.settings} />
    </PdfDoc>
  )
}
