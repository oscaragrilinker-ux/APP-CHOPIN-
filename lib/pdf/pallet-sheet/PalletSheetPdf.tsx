import React from 'react'
import { Document, Page, StyleSheet, Text, View, Image } from '@react-pdf/renderer'

export type PalletSheetPdfProps = {
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

// Charte Chopin. Les variables CSS n'existent pas côté PDF : valeurs en dur.
const FOREST = '#1F3D2B'
const GOLD = '#B8975A'
const INK = '#1A1A1A'
const MUTED = '#6B6B6B'
const RULE = '#DDD6C6'
const CREAM = '#F5F1E8'

const s = StyleSheet.create({
  page: { padding: 34, fontSize: 10, color: INK, fontFamily: 'Helvetica' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { fontSize: 22, color: FOREST },
  brandSub: { fontSize: 7, color: MUTED, letterSpacing: 2, marginTop: 2 },
  docTitle: { fontSize: 15, color: FOREST, textAlign: 'right' },
  docRef: { fontSize: 9, color: MUTED, textAlign: 'right', marginTop: 3 },

  rule: { borderBottomWidth: 2, borderBottomColor: GOLD, marginTop: 12, marginBottom: 16 },

  // Le lot est l'information qu'un cariste doit lire à distance.
  lotBand: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: CREAM, borderWidth: 1, borderColor: RULE,
    borderRadius: 5, padding: 14, marginBottom: 16,
  },
  lotLabel: { fontSize: 7, color: MUTED, letterSpacing: 1.5, marginBottom: 4 },
  lotValue: { fontSize: 26, color: FOREST, fontFamily: 'Helvetica-Bold' },
  lotDate: { fontSize: 9, color: MUTED, marginTop: 4 },
  qr: { width: 78, height: 78 },

  sectionTitle: {
    fontSize: 7, color: MUTED, letterSpacing: 1.5,
    marginBottom: 6, marginTop: 4,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '50%', paddingVertical: 6, paddingRight: 10 },
  cellThird: { width: '33.33%', paddingVertical: 6, paddingRight: 10 },
  label: { fontSize: 7, color: MUTED, letterSpacing: 0.8, marginBottom: 2 },
  value: { fontSize: 11, color: INK },
  valueStrong: { fontSize: 13, color: FOREST, fontFamily: 'Helvetica-Bold' },

  block: {
    borderWidth: 1, borderColor: RULE, borderRadius: 5,
    padding: 12, marginBottom: 12,
  },

  notes: {
    backgroundColor: CREAM, borderLeftWidth: 2, borderLeftColor: GOLD,
    padding: 10, marginTop: 4,
  },

  signRow: { flexDirection: 'row', marginTop: 22 },
  signBox: { flex: 1, marginRight: 12 },
  signLine: { borderBottomWidth: 1, borderBottomColor: RULE, height: 34 },

  footer: {
    position: 'absolute', bottom: 26, left: 34, right: 34,
    borderTopWidth: 1, borderTopColor: RULE, paddingTop: 8,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: MUTED },
})

function frDate(iso: string | null) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export function PalletSheetPdf(props: PalletSheetPdfProps) {
  const {
    blNumber, lotNumber, lotDate, companyName, productName, varietyName,
    palletCount, palletKindLabel, packagingType, parcelCount, strappingLabel,
    netWeightKg, operatorName, preparedAt, deliveryDate, deliveryLocation,
    carrierName, notes, qrDataUri,
  } = props

  return (
    <Document title={`Fiche palette ${lotNumber}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>Chopin</Text>
            <Text style={s.brandSub}>CONDITIONNEMENT</Text>
          </View>
          <View>
            <Text style={s.docTitle}>Fiche palette</Text>
            {blNumber && <Text style={s.docRef}>Bon de livraison {blNumber}</Text>}
            <Text style={s.docRef}>Éditée le {frDate(new Date().toISOString())}</Text>
          </View>
        </View>

        <View style={s.rule} />

        <View style={s.lotBand}>
          <View>
            <Text style={s.lotLabel}>NUMÉRO DE LOT</Text>
            <Text style={s.lotValue}>{lotNumber}</Text>
            <Text style={s.lotDate}>Lot du {frDate(lotDate)}</Text>
          </View>
          {qrDataUri && <Image src={qrDataUri} style={s.qr} />}
        </View>

        <Text style={s.sectionTitle}>MARCHANDISE</Text>
        <View style={s.block}>
          <View style={s.grid}>
            <View style={s.cell}>
              <Text style={s.label}>PRODUIT</Text>
              <Text style={s.valueStrong}>{productName}</Text>
            </View>
            <View style={s.cell}>
              <Text style={s.label}>VARIÉTÉ</Text>
              <Text style={s.valueStrong}>{varietyName ?? '—'}</Text>
            </View>
            <View style={s.cell}>
              <Text style={s.label}>CLIENT</Text>
              <Text style={s.value}>{companyName}</Text>
            </View>
            <View style={s.cell}>
              <Text style={s.label}>CONDITIONNEMENT</Text>
              <Text style={s.value}>{packagingType ?? '—'}</Text>
            </View>
          </View>
        </View>

        <Text style={s.sectionTitle}>PALETTISATION</Text>
        <View style={s.block}>
          <View style={s.grid}>
            <View style={s.cellThird}>
              <Text style={s.label}>NOMBRE DE PALETTES</Text>
              <Text style={s.valueStrong}>{palletCount}</Text>
            </View>
            <View style={s.cellThird}>
              <Text style={s.label}>NOMBRE DE COLIS</Text>
              <Text style={s.valueStrong}>{parcelCount ?? '—'}</Text>
            </View>
            <View style={s.cellThird}>
              <Text style={s.label}>POIDS NET</Text>
              <Text style={s.valueStrong}>
                {netWeightKg != null ? `${netWeightKg.toLocaleString('fr-FR')} kg` : '—'}
              </Text>
            </View>
            <View style={s.cell}>
              <Text style={s.label}>TYPE DE PALETTE</Text>
              <Text style={s.value}>{palletKindLabel}</Text>
            </View>
            <View style={s.cell}>
              <Text style={s.label}>CERCLAGE</Text>
              <Text style={s.value}>{strappingLabel}</Text>
            </View>
          </View>
        </View>

        <Text style={s.sectionTitle}>EXPÉDITION</Text>
        <View style={s.block}>
          <View style={s.grid}>
            <View style={s.cellThird}>
              <Text style={s.label}>DATE DE LIVRAISON</Text>
              <Text style={s.value}>{frDate(deliveryDate)}</Text>
            </View>
            <View style={s.cellThird}>
              <Text style={s.label}>TRANSPORTEUR</Text>
              <Text style={s.value}>{carrierName ?? '—'}</Text>
            </View>
            <View style={s.cellThird}>
              <Text style={s.label}>DESTINATION</Text>
              <Text style={s.value}>{deliveryLocation ?? '—'}</Text>
            </View>
          </View>
        </View>

        {notes && (
          <View style={s.notes}>
            <Text style={s.label}>OBSERVATIONS</Text>
            <Text style={s.value}>{notes}</Text>
          </View>
        )}

        <View style={s.signRow}>
          <View style={s.signBox}>
            <Text style={s.label}>PRÉPARÉ PAR</Text>
            <Text style={[s.value, { marginBottom: 4 }]}>{operatorName ?? '—'}</Text>
            <Text style={[s.label, { marginTop: 2 }]}>
              Le {frDate(preparedAt.slice(0, 10))}
            </Text>
          </View>
          <View style={s.signBox}>
            <Text style={s.label}>CONTRÔLÉ PAR</Text>
            <View style={s.signLine} />
          </View>
          <View style={s.signBox}>
            <Text style={s.label}>RÉCEPTIONNÉ PAR</Text>
            <View style={s.signLine} />
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>SCEA Chopin Conditionnement</Text>
          <Text style={s.footerText}>
            Lot {lotNumber}{blNumber ? ` · ${blNumber}` : ''}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
