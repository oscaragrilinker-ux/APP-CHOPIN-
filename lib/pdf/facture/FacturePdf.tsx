import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import type { DocumentSettings } from '@/lib/documents/settings'
import type { InvoiceStatus } from '@/types'
import {
  PdfDoc, Letterhead, Parties, SectionTitle, KV, LineTable, Totals, NoteBox,
  Stamp, LegalFooter, S, fmt, type Party,
} from '@/lib/pdf/kit'

export type FacturePdfProps = {
  settings: DocumentSettings
  number: string
  status: InvoiceStatus
  issuedAt: string | null
  dueDate: string | null
  company: Party
  /** Référence de la commande facturée, pour le rapprochement. */
  orderRef: string
  bcNumber: string | null
  deliveryDate: string | null
  product: string
  variety: string | null
  format: string | null
  quantity: number
  unitPrice: number | null
  basisUnit: string | null
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  amountPaid: number
  payments: { paidAt: string; amount: number; method: string; reference: string | null }[]
  notes: string | null
}

const METHOD: Record<string, string> = {
  virement: 'Virement', cheque: 'Chèque', especes: 'Espèces', autre: 'Autre',
}

export function FacturePdf(p: FacturePdfProps) {
  const remaining = Math.max(0, p.total - p.amountPaid)
  const stamp =
    p.status === 'cancelled' ? { text: 'Annulée', ok: false }
    : p.status === 'paid' ? { text: 'Acquittée', ok: true }
    : p.status === 'overdue' ? { text: 'Échéance dépassée', ok: false }
    : p.status === 'draft' ? { text: 'Brouillon — sans valeur comptable', ok: false }
    : null

  return (
    <PdfDoc title={`Facture ${p.number}`}>
      <Letterhead
        settings={p.settings}
        title="Facture"
        number={p.number}
        meta={[
          `Émise le ${fmt.date(p.issuedAt)}`,
          `Échéance le ${fmt.date(p.dueDate)}`,
        ]}
      />
      {stamp && <Stamp text={stamp.text} ok={stamp.ok} />}

      <Parties settings={p.settings} recipient={p.company} recipientLabel="FACTURÉ À" />

      <View style={S.section}>
        <SectionTitle>Références</SectionTitle>
        <KV cols={3} items={[
          { label: 'Commande', value: p.orderRef },
          { label: 'Bon de commande', value: p.bcNumber ?? '—' },
          { label: 'Livrée le', value: fmt.date(p.deliveryDate) },
        ]} />
      </View>

      <View style={S.section}>
        <SectionTitle>Détail</SectionTitle>
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
            qty: `${fmt.num(p.quantity)}`,
            pu: p.unitPrice != null
              ? { main: fmt.euro(p.unitPrice), sub: p.basisUnit ?? undefined }
              : '—',
            total: fmt.euro(p.subtotal),
          }]}
        />
        <Totals
          rows={[
            { label: 'Total HT', value: fmt.euro(p.subtotal) },
            { label: `TVA ${fmt.pct(p.taxRate)}`, value: fmt.euro(p.taxAmount) },
            ...(p.amountPaid > 0 ? [{ label: 'Déjà réglé', value: `− ${fmt.euro(p.amountPaid)}` }] : []),
          ]}
          main={
            p.amountPaid > 0
              ? { label: 'Reste à payer', value: fmt.euro(remaining) }
              : { label: 'Total TTC', value: fmt.euro(p.total) }
          }
        />
      </View>

      {p.payments.length > 0 && (
        <View style={S.section}>
          <SectionTitle>Règlements reçus</SectionTitle>
          <LineTable
            columns={[
              { key: 'date', label: 'Date', width: 25 },
              { key: 'method', label: 'Mode', width: 25 },
              { key: 'ref', label: 'Référence', width: 30 },
              { key: 'amount', label: 'Montant', width: 20, align: 'right' },
            ]}
            rows={p.payments.map(pay => ({
              date: fmt.dateShort(pay.paidAt),
              method: METHOD[pay.method] ?? pay.method,
              ref: pay.reference ?? '—',
              amount: fmt.euro(pay.amount),
            }))}
          />
        </View>
      )}

      <View style={S.section}>
        <SectionTitle>Règlement</SectionTitle>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <NoteBox title="Conditions" text={p.settings.payment_terms_text} />
          </View>
          {(p.settings.iban || p.settings.bic) && (
            <View style={{ flex: 1 }}>
              <NoteBox
                title="Coordonnées bancaires"
                text={[
                  p.settings.bank_name ?? '',
                  p.settings.iban ? `IBAN ${p.settings.iban}` : '',
                  p.settings.bic ? `BIC ${p.settings.bic}` : '',
                ].filter(Boolean).join('\n')}
              />
            </View>
          )}
        </View>
      </View>

      {p.notes && (
        <View style={S.section}>
          <NoteBox title="Notes" text={p.notes} />
        </View>
      )}

      <LegalFooter
        settings={p.settings}
        extra={[p.settings.late_penalty_text, p.settings.invoice_footer].filter(Boolean).join(' ')}
      />
    </PdfDoc>
  )
}
