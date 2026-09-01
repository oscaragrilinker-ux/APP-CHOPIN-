import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { PriceBasis } from '@/types'

export type BcPdfProps = {
  bcNumber: number
  bcDate: string       // YYYY-MM-DD
  companyName: string
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

const C = {
  green:  '#1F3D2B',
  gold:   '#B8975A',
  cream:  '#F5F1E8',
  white:  '#FFFFFF',
  dark:   '#1C1C1C',
  muted:  '#6B7280',
  border: '#E2DDD6',
  bg:     '#FAF8F2',
} as const

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.dark,
    backgroundColor: C.white,
  },

  // ── En-tête ──
  header: {
    backgroundColor: C.green,
    padding: '22 40 18 40',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerCompany: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: C.white,
    letterSpacing: 0.5,
  },
  headerDoc: {
    fontSize: 7,
    color: C.cream,
    marginTop: 5,
    letterSpacing: 2.5,
  },
  headerBcNumber: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: C.white,
    textAlign: 'right',
  },
  headerDate: {
    fontSize: 8,
    color: C.cream,
    marginTop: 3,
    textAlign: 'right',
  },

  // ── Corps ──
  body: { padding: '22 40', flex: 1 },
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: C.gold,
    letterSpacing: 2,
    marginBottom: 8,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    borderBottomStyle: 'solid',
  },

  // ── Client ──
  companyName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
  },

  // ── Grille commande ──
  row: { flexDirection: 'row', marginBottom: 12 },
  col: { flex: 1, paddingRight: 10 },
  col2: { flex: 2, paddingRight: 10 },
  colLabel: { fontSize: 7, color: C.muted, marginBottom: 3 },
  colValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.dark },

  // ── Prix ──
  priceBox: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'solid',
    borderRadius: 4,
    padding: '12 16',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  priceLabel: { fontSize: 9, color: C.muted },
  priceValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.dark },
  priceDivider: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    borderTopStyle: 'solid',
    marginVertical: 8,
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.green,
    padding: '10 16',
    borderRadius: 4,
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
  },

  // ── Notes ──
  notesBox: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'solid',
    borderRadius: 4,
    padding: '10 14',
  },
  notesText: { fontSize: 9, color: C.dark, lineHeight: 1.5 },

  // ── Pied de page ──
  footer: {
    backgroundColor: C.cream,
    padding: '9 40',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.border,
    borderTopStyle: 'solid',
  },
  footerText: { fontSize: 7, color: C.muted },
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtEuro(n: number): string {
  return (
    n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
  )
}

function fmtDate(d: string): string {
  try {
    return format(new Date(d), 'd MMMM yyyy', { locale: fr })
  } catch {
    return d
  }
}

function basisLabel(pb: PriceBasis): string {
  switch (pb) {
    case 'per_tonne':     return 'Prix / tonne'
    case 'per_container': return 'Prix / contenant'
    case 'total':         return 'Prix forfaitaire'
  }
}

function basisUnit(pb: PriceBasis): string {
  switch (pb) {
    case 'per_tonne':     return '€/tonne'
    case 'per_container': return '€/contenant'
    case 'total':         return '€ (forfait)'
  }
}

// ── Composant ────────────────────────────────────────────────────────────────

export function BonDeCommandePdf({
  bcNumber, bcDate, companyName,
  productName, varietyName, formatName,
  quantity, deliveryDate, notes,
  showPrices, unitPrice, totalHt, tvaRate, priceBasis,
}: BcPdfProps) {

  const tvaAmount = showPrices && totalHt != null && tvaRate != null
    ? totalHt * tvaRate / 100
    : null
  const totalTtc = tvaAmount != null && totalHt != null
    ? totalHt + tvaAmount
    : null

  const year = bcDate.slice(0, 4)
  const bcNumStr = `${year}-${String(bcNumber).padStart(4, '0')}`

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── En-tête ── */}
        <View style={s.header}>
          <View>
            <Text style={s.headerCompany}>CHOPIN CONDITIONNEMENT</Text>
            <Text style={s.headerDoc}>BON DE COMMANDE</Text>
          </View>
          <View>
            <Text style={s.headerBcNumber}>BC-{bcNumStr}</Text>
            <Text style={s.headerDate}>{fmtDate(bcDate)}</Text>
          </View>
        </View>

        <View style={s.body}>

          {/* ── Client ── */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>CLIENT</Text>
            <Text style={s.companyName}>{companyName}</Text>
          </View>

          {/* ── Commande ── */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>COMMANDE</Text>
            <View style={s.row}>
              <View style={s.col}>
                <Text style={s.colLabel}>Produit</Text>
                <Text style={s.colValue}>{productName}</Text>
              </View>
              <View style={s.col}>
                <Text style={s.colLabel}>Variété</Text>
                <Text style={s.colValue}>{varietyName || '—'}</Text>
              </View>
              <View style={s.col}>
                <Text style={s.colLabel}>Conditionnement</Text>
                <Text style={s.colValue}>{formatName || '—'}</Text>
              </View>
            </View>
            <View style={s.row}>
              <View style={s.col}>
                <Text style={s.colLabel}>Quantité</Text>
                <Text style={s.colValue}>
                  {quantity} contenant{quantity > 1 ? 's' : ''}
                </Text>
              </View>
              <View style={s.col2}>
                <Text style={s.colLabel}>Livraison prévue</Text>
                <Text style={s.colValue}>
                  {deliveryDate ? fmtDate(deliveryDate) : '—'}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Détail financier (admin / client uniquement) ── */}
          {showPrices && unitPrice != null && totalHt != null && tvaRate != null && priceBasis && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>DETAIL FINANCIER</Text>
              <View style={s.priceBox}>
                <View style={s.priceRow}>
                  <Text style={s.priceLabel}>Prix unitaire</Text>
                  <Text style={s.priceValue}>
                    {fmtEuro(unitPrice)} {basisUnit(priceBasis)}
                  </Text>
                </View>
                <View style={s.priceRow}>
                  <Text style={s.priceLabel}>Base tarifaire</Text>
                  <Text style={s.priceValue}>{basisLabel(priceBasis)}</Text>
                </View>
                <View style={s.priceRow}>
                  <Text style={s.priceLabel}>Taux TVA</Text>
                  <Text style={s.priceValue}>
                    {tvaRate.toLocaleString('fr-FR')} %
                  </Text>
                </View>
                <View style={s.priceDivider} />
                <View style={s.priceRow}>
                  <Text style={s.priceLabel}>Total HT</Text>
                  <Text style={s.priceValue}>{fmtEuro(totalHt)}</Text>
                </View>
                <View style={s.priceRow}>
                  <Text style={s.priceLabel}>
                    TVA ({tvaRate.toLocaleString('fr-FR')} %)
                  </Text>
                  <Text style={s.priceValue}>{fmtEuro(tvaAmount!)}</Text>
                </View>
              </View>
              <View style={s.totalBox}>
                <Text style={s.totalLabel}>TOTAL TTC</Text>
                <Text style={s.totalValue}>{fmtEuro(totalTtc!)}</Text>
              </View>
            </View>
          )}

          {/* ── Notes ── */}
          {notes && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>NOTES</Text>
              <View style={s.notesBox}>
                <Text style={s.notesText}>{notes}</Text>
              </View>
            </View>
          )}

        </View>

        {/* ── Pied de page ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Chopin Conditionnement · Document confidentiel
          </Text>
          <Text style={s.footerText}>
            Généré le {format(new Date(), 'd MMMM yyyy', { locale: fr })}
          </Text>
        </View>

      </Page>
    </Document>
  )
}
