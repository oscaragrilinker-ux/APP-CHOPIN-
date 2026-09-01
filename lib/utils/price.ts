import type { PriceBasis } from '@/types'

export function computeTTC(totalHt: number, tvaRate: number | null): number {
  if (tvaRate == null) return totalHt
  return totalHt + totalHt * (tvaRate / 100)
}

export function computeTotal({
  priceBasis,
  unitPrice,
  quantity,
  weightKg,
}: {
  priceBasis: PriceBasis
  unitPrice: number
  quantity: number
  weightKg?: number | null
}): number {
  switch (priceBasis) {
    case 'per_tonne':
      return unitPrice * quantity * ((weightKg ?? 0) / 1000)
    case 'per_container':
      return unitPrice * quantity
    case 'total':
      return unitPrice
  }
}

export function formatEuro(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
}

export function formatTonnage(quantity: number, weightKg: number | null | undefined): string {
  if (!weightKg) return `${quantity} contenant${quantity > 1 ? 's' : ''}`
  const totalKg = quantity * weightKg
  if (totalKg >= 1000) {
    return `${quantity} × ${weightKg.toLocaleString('fr-FR')} kg = ${(totalKg / 1000).toLocaleString('fr-FR')} t`
  }
  return `${quantity} × ${weightKg.toLocaleString('fr-FR')} kg = ${totalKg.toLocaleString('fr-FR')} kg`
}

export function priceBasisLabel(pb: PriceBasis): string {
  switch (pb) {
    case 'per_tonne':     return 'Prix / tonne'
    case 'per_container': return 'Prix / contenant'
    case 'total':         return 'Prix forfaitaire'
  }
}

export function priceBasisUnit(pb: PriceBasis): string {
  switch (pb) {
    case 'per_tonne':     return '€/tonne'
    case 'per_container': return '€/contenant'
    case 'total':         return '€ (total)'
  }
}
