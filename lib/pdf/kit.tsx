import React from 'react'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { BRAND } from '@/lib/brand'
import { legalLine, type DocumentSettings } from '@/lib/documents/settings'

/**
 * Socle commun des documents imprimés.
 *
 * Même registre que le site public — lin écru, encre brune, vert de culture,
 * terre — mais sur page blanche : un devis ou une facture se photocopie, se
 * classe, se transmet à un comptable. La matière du papier kraft n'a rien à y
 * faire, la hiérarchie typographique si.
 *
 * Les variables CSS n'existent pas côté PDF : les couleurs sont en dur ici,
 * et nulle part ailleurs.
 */
export const T = {
  ink: '#1F1A11',
  night: '#241E14',
  field: '#55702F',
  soil: '#8A6A44',
  rust: '#A8502F',
  bone: '#DDD1B8',
  paper: '#EDE6D5',
  soft: '#F5F1E7',
  muted: '#6B6350',
  white: '#FFFFFF',
} as const

// ── Formats ──────────────────────────────────────────────────────────────────
// `toLocaleString('fr-FR')` insère une espace fine insécable (U+202F) comme
// séparateur de milliers. Helvetica, seule police embarquée, n'a pas ce glyphe
// et l'affiche comme une barre : « 1/125,00 € ». On la remplace par une espace.
const espace = (s: string) => s.replace(/[  ]/g, ' ')

export const fmt = {
  euro: (n: number) =>
    espace(n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + ' €',
  num: (n: number, digits = 0) =>
    espace(n.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits })),
  pct: (n: number) => espace(n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })) + ' %',
  date: (d: string | Date | null | undefined) => {
    if (!d) return '—'
    try { return format(new Date(d), 'd MMMM yyyy', { locale: fr }) } catch { return String(d) }
  },
  dateShort: (d: string | Date | null | undefined) => {
    if (!d) return '—'
    try { return format(new Date(d), 'dd/MM/yyyy', { locale: fr }) } catch { return String(d) }
  },
}

// ── Styles ───────────────────────────────────────────────────────────────────
export const S = StyleSheet.create({
  page: {
    paddingTop: 40, paddingBottom: 64, paddingHorizontal: 44,
    fontFamily: 'Helvetica', fontSize: 9.5, color: T.ink, backgroundColor: T.white,
  },

  // En-tête : enseigne à gauche, nature du document à droite.
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brandTop: { fontFamily: 'Helvetica-Bold', fontSize: 15, color: T.ink, letterSpacing: -0.2 },
  brandBottom: { fontFamily: 'Helvetica-Bold', fontSize: 15, color: T.field, letterSpacing: -0.2, marginTop: -2 },
  brandMeta: { fontSize: 7.5, color: T.muted, marginTop: 6, lineHeight: 1.45 },
  docTitle: { fontFamily: 'Helvetica-Bold', fontSize: 20, color: T.ink, textAlign: 'right', textTransform: 'uppercase', letterSpacing: 0.5 },
  docNumber: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: T.field, textAlign: 'right', marginTop: 4 },
  docMeta: { fontSize: 8, color: T.muted, textAlign: 'right', marginTop: 2, lineHeight: 1.5 },
  headRule: { borderBottomWidth: 2, borderBottomColor: T.field, marginTop: 14, marginBottom: 18 },

  // Émetteur / destinataire.
  parties: { flexDirection: 'row', gap: 18, marginBottom: 20 },
  party: { flex: 1, backgroundColor: T.soft, padding: '10 12', borderLeftWidth: 2, borderLeftColor: T.soil },
  partyLabel: { fontSize: 6.5, color: T.soil, letterSpacing: 1.5, marginBottom: 5, fontFamily: 'Helvetica-Bold' },
  partyName: { fontFamily: 'Helvetica-Bold', fontSize: 10.5, color: T.ink, marginBottom: 2 },
  partyLine: { fontSize: 8.5, color: T.ink, lineHeight: 1.45 },

  // Sections.
  sectionTitle: {
    fontSize: 6.5, color: T.soil, letterSpacing: 1.6, fontFamily: 'Helvetica-Bold',
    marginBottom: 7, marginTop: 4, paddingBottom: 4,
    borderBottomWidth: 0.75, borderBottomColor: T.bone,
  },
  section: { marginBottom: 16 },

  // Grille clé/valeur.
  kv: { flexDirection: 'row', flexWrap: 'wrap' },
  kvCell: { width: '33.33%', paddingRight: 10, marginBottom: 9 },
  kvCellHalf: { width: '50%', paddingRight: 10, marginBottom: 9 },
  kvLabel: { fontSize: 6.5, color: T.muted, letterSpacing: 1, marginBottom: 2 },
  kvValue: { fontSize: 9.5, color: T.ink, fontFamily: 'Helvetica-Bold' },
  kvValueBig: { fontSize: 14, color: T.field, fontFamily: 'Helvetica-Bold' },

  // Tableau de lignes.
  table: { borderWidth: 0.75, borderColor: T.bone, borderRadius: 3 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.75, borderBottomColor: T.bone, minHeight: 22, alignItems: 'center' },
  trLast: { borderBottomWidth: 0 },
  th: { backgroundColor: T.night, minHeight: 20 },
  thText: { fontSize: 6.5, color: T.paper, letterSpacing: 1.2, fontFamily: 'Helvetica-Bold' },
  td: { paddingVertical: 6, paddingHorizontal: 8, fontSize: 9 },
  tdSub: { fontSize: 7.5, color: T.muted, marginTop: 1.5 },
  right: { textAlign: 'right' },
  bold: { fontFamily: 'Helvetica-Bold' },

  // Totaux.
  totals: { alignSelf: 'flex-end', width: 240, marginTop: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontSize: 9, color: T.muted },
  totalValue: { fontSize: 9, color: T.ink, fontFamily: 'Helvetica-Bold' },
  totalMain: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: T.field, padding: '9 12', marginTop: 6, borderRadius: 3,
  },
  totalMainLabel: { fontSize: 8.5, color: T.paper, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  totalMainValue: { fontSize: 14, color: T.white, fontFamily: 'Helvetica-Bold' },

  // Encadrés de texte.
  note: { backgroundColor: T.soft, borderWidth: 0.75, borderColor: T.bone, borderRadius: 3, padding: '9 12' },
  noteTitle: { fontSize: 6.5, color: T.soil, letterSpacing: 1.4, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  noteText: { fontSize: 8.5, color: T.ink, lineHeight: 1.5 },

  // Signatures.
  signatures: { flexDirection: 'row', gap: 16, marginTop: 22 },
  signature: { flex: 1 },
  signatureLabel: { fontSize: 6.5, color: T.muted, letterSpacing: 1.2, marginBottom: 34 },
  signatureLine: { borderBottomWidth: 0.75, borderBottomColor: T.soil },

  // Pied de page fixe.
  footer: {
    position: 'absolute', left: 44, right: 44, bottom: 26,
    borderTopWidth: 0.75, borderTopColor: T.bone, paddingTop: 7,
  },
  footerLegal: { fontSize: 6.8, color: T.muted, lineHeight: 1.45 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  footerSmall: { fontSize: 6.5, color: T.muted },

  // Bandeau d'état (brouillon, provisoire, acquittée…).
  stamp: {
    alignSelf: 'flex-start', borderWidth: 1.2, borderColor: T.rust, borderRadius: 3,
    paddingVertical: 3, paddingHorizontal: 8, marginBottom: 12,
  },
  stampText: { fontSize: 8, color: T.rust, letterSpacing: 2, fontFamily: 'Helvetica-Bold' },
  stampOk: { borderColor: T.field },
  stampOkText: { color: T.field },
})

// ── Composants ───────────────────────────────────────────────────────────────

export function PdfDoc({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Document title={title} author={BRAND.name} creator={BRAND.name}>
      <Page size="A4" style={S.page}>{children}</Page>
    </Document>
  )
}

type LetterheadProps = {
  settings: DocumentSettings
  title: string
  number: string
  meta: string[]       // « Émis le … », « Échéance … »
}

export function Letterhead({ settings, title, number, meta }: LetterheadProps) {
  return (
    <>
      <View style={S.head}>
        <View>
          <Text style={S.brandTop}>{BRAND.nameTop.toUpperCase()}</Text>
          <Text style={S.brandBottom}>{BRAND.nameBottom.toUpperCase()}</Text>
          <Text style={S.brandMeta}>
            {settings.address_line1}{'\n'}
            {settings.postal_code} {settings.city}
            {settings.phone ? `\n${settings.phone}` : ''}
            {settings.email ? `\n${settings.email}` : ''}
          </Text>
        </View>
        <View>
          <Text style={S.docTitle}>{title}</Text>
          <Text style={S.docNumber}>{number}</Text>
          {meta.map((m, i) => <Text key={i} style={S.docMeta}>{m}</Text>)}
        </View>
      </View>
      <View style={S.headRule} />
    </>
  )
}

export type Party = { name: string; lines: string[] }

export function Parties({
  settings, recipient, recipientLabel = 'DESTINATAIRE',
}: { settings: DocumentSettings; recipient: Party; recipientLabel?: string }) {
  const issuer: Party = {
    name: [settings.legal_form, settings.legal_name].filter(Boolean).join(' '),
    lines: [
      `${settings.address_line1}, ${settings.postal_code} ${settings.city}`,
      settings.siret ? `SIRET ${settings.siret}` : '',
      settings.vat_number ? `TVA intracommunautaire ${settings.vat_number}` : '',
    ].filter(Boolean),
  }
  return (
    <View style={S.parties}>
      <View style={S.party}>
        <Text style={S.partyLabel}>ÉMETTEUR</Text>
        <Text style={S.partyName}>{issuer.name}</Text>
        {issuer.lines.map((l, i) => <Text key={i} style={S.partyLine}>{l}</Text>)}
      </View>
      <View style={S.party}>
        <Text style={S.partyLabel}>{recipientLabel}</Text>
        <Text style={S.partyName}>{recipient.name}</Text>
        {recipient.lines.filter(Boolean).map((l, i) => <Text key={i} style={S.partyLine}>{l}</Text>)}
      </View>
    </View>
  )
}

export function SectionTitle({ children }: { children: string }) {
  return <Text style={S.sectionTitle}>{children.toUpperCase()}</Text>
}

export type KVItem = { label: string; value: string; big?: boolean }

export function KV({ items, cols = 3 }: { items: KVItem[]; cols?: 2 | 3 }) {
  return (
    <View style={S.kv}>
      {items.map((it, i) => (
        <View key={i} style={cols === 2 ? S.kvCellHalf : S.kvCell}>
          <Text style={S.kvLabel}>{it.label.toUpperCase()}</Text>
          <Text style={it.big ? S.kvValueBig : S.kvValue}>{it.value}</Text>
        </View>
      ))}
    </View>
  )
}

export type Column = { key: string; label: string; width: number; align?: 'left' | 'right' }
export type Row = Record<string, string | { main: string; sub?: string }>

export function LineTable({ columns, rows }: { columns: Column[]; rows: Row[] }) {
  return (
    <View style={S.table}>
      <View style={[S.tr, S.th]}>
        {columns.map(c => (
          <View key={c.key} style={[S.td, { width: `${c.width}%` }]}>
            <Text style={[S.thText, c.align === 'right' ? S.right : {}]}>{c.label.toUpperCase()}</Text>
          </View>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={[S.tr, i === rows.length - 1 ? S.trLast : {}]}>
          {columns.map(c => {
            const cell = r[c.key]
            const main = typeof cell === 'string' ? cell : cell?.main ?? ''
            const sub = typeof cell === 'string' ? undefined : cell?.sub
            return (
              <View key={c.key} style={[S.td, { width: `${c.width}%` }]}>
                <Text style={c.align === 'right' ? S.right : {}}>{main}</Text>
                {sub ? <Text style={[S.tdSub, c.align === 'right' ? S.right : {}]}>{sub}</Text> : null}
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}

export function Totals({
  rows, main,
}: { rows: { label: string; value: string }[]; main: { label: string; value: string } }) {
  return (
    <View style={S.totals}>
      {rows.map((r, i) => (
        <View key={i} style={S.totalRow}>
          <Text style={S.totalLabel}>{r.label}</Text>
          <Text style={S.totalValue}>{r.value}</Text>
        </View>
      ))}
      <View style={S.totalMain}>
        <Text style={S.totalMainLabel}>{main.label.toUpperCase()}</Text>
        <Text style={S.totalMainValue}>{main.value}</Text>
      </View>
    </View>
  )
}

export function NoteBox({ title, text }: { title: string; text: string }) {
  return (
    <View style={S.note}>
      <Text style={S.noteTitle}>{title.toUpperCase()}</Text>
      <Text style={S.noteText}>{text}</Text>
    </View>
  )
}

export function SignatureRow({ labels }: { labels: string[] }) {
  return (
    <View style={S.signatures}>
      {labels.map((l, i) => (
        <View key={i} style={S.signature}>
          <Text style={S.signatureLabel}>{l.toUpperCase()}</Text>
          <View style={S.signatureLine} />
        </View>
      ))}
    </View>
  )
}

export function Stamp({ text, ok = false }: { text: string; ok?: boolean }) {
  return (
    <View style={[S.stamp, ok ? S.stampOk : {}]}>
      <Text style={[S.stampText, ok ? S.stampOkText : {}]}>{text.toUpperCase()}</Text>
    </View>
  )
}

export function LegalFooter({ settings, extra }: { settings: DocumentSettings; extra?: string | null }) {
  return (
    <View style={S.footer} fixed>
      <Text style={S.footerLegal}>{legalLine(settings)}</Text>
      {extra ? <Text style={S.footerLegal}>{extra}</Text> : null}
      <View style={S.footerRow}>
        <Text style={S.footerSmall}>{BRAND.name} · {BRAND.domain}</Text>
        <Text
          style={S.footerSmall}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
        />
      </View>
    </View>
  )
}

/** Adresse d'une entreprise cliente, sur plusieurs lignes. */
export function companyLines(c: {
  address_line1?: string | null; address_line2?: string | null
  postal_code?: string | null; city?: string | null
  siren?: string | null; email?: string | null; phone?: string | null
}): string[] {
  return [
    c.address_line1 ?? '',
    c.address_line2 ?? '',
    [c.postal_code, c.city].filter(Boolean).join(' '),
    c.siren ? `SIREN ${c.siren}` : '',
    c.email ?? '',
    c.phone ?? '',
  ].filter(Boolean)
}
