'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileCheck2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { savePalletSheet, issueDeliveryNote } from '@/lib/actions/logistics'
import {
  PALLET_KIND_LABELS, STRAPPING_LABELS,
  type OrderForConditionnement, type PalletKind, type PalletSheet, type StrappingKind,
} from '@/types'

type Props = {
  order: OrderForConditionnement
  sheet?: PalletSheet
  operatorNames: string[]
  defaultOperator: string | null
  trigger: React.ReactNode
}

/** Lot par défaut : LOT-AAAAMMJJ-<4 premières lettres de la variété>. */
function suggestLot(order: OrderForConditionnement) {
  const d = new Date()
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const seed = (order.variety_name ?? order.product_name ?? 'LOT')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase()
  return `LOT-${stamp}-${seed}`
}

export function PalletSheetDialog({
  order, sheet, operatorNames, defaultOperator, trigger,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const isEdit = !!sheet

  const [lotNumber, setLotNumber]   = useState(sheet?.lot_number ?? suggestLot(order))
  const [palletCount, setPalletCount] = useState(String(sheet?.pallet_count ?? 1))
  const [palletKind, setPalletKind] = useState<PalletKind>(sheet?.pallet_kind ?? 'europe')
  const [packaging, setPackaging]   = useState(sheet?.packaging_type ?? order.format_name ?? '')
  const [parcelCount, setParcelCount] = useState(
    sheet?.parcel_count != null ? String(sheet.parcel_count) : String(order.quantity ?? ''),
  )
  const [strapping, setStrapping]   = useState<StrappingKind>(sheet?.strapping ?? 'film')
  const [weight, setWeight]         = useState(
    sheet?.net_weight_kg != null
      ? String(sheet.net_weight_kg)
      : order.format_weight_kg
        ? String(order.quantity * Number(order.format_weight_kg))
        : '',
  )
  const [operator, setOperator] = useState(sheet?.operator_name ?? defaultOperator ?? '')
  const [notes, setNotes] = useState(sheet?.notes ?? '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await savePalletSheet({
        id: sheet?.id,
        order_id: order.id,
        lot_number: lotNumber,
        pallet_count: Number(palletCount),
        pallet_kind: palletKind,
        packaging_type: packaging || null,
        parcel_count: parcelCount.trim() ? Number(parcelCount) : null,
        strapping,
        net_weight_kg: weight.trim() ? Number(weight) : null,
        operator_name: operator || null,
        notes: notes || null,
      })
      if ('error' in res) {
        toast.error('Enregistrement impossible', { description: res.error })
        return
      }
      toast.success(isEdit ? 'Fiche palette mise à jour.' : 'Palette enregistrée.')
      setOpen(false)
      router.refresh()
    })
  }

  function emitBL() {
    if (!sheet) return
    startTransition(async () => {
      const res = await issueDeliveryNote({ palletSheetId: sheet.id })
      if ('error' in res) {
        toast.error(res.error)
        return
      }
      toast.success(`Bon de livraison ${res.blNumber} émis.`)
      setOpen(false)
      router.refresh()
    })
  }

  const selectClass =
    'flex h-12 w-full rounded-md border border-input bg-background px-3 text-base shadow-sm ' +
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Modifier la palette' : 'Nouvelle palette'} — {order.company_name}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-2">
          {order.product_name}
          {order.variety_name && ` · ${order.variety_name}`}
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="p-lot">Numéro de lot</Label>
            <Input
              id="p-lot" required value={lotNumber} disabled={pending}
              onChange={e => setLotNumber(e.target.value)}
              className="h-12 text-base font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-count">Nombre de palettes</Label>
              <Input
                id="p-count" type="number" min={1} inputMode="numeric" required
                value={palletCount} disabled={pending}
                onChange={e => setPalletCount(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-parcels">Nombre de colis</Label>
              <Input
                id="p-parcels" type="number" min={1} inputMode="numeric"
                value={parcelCount} disabled={pending}
                onChange={e => setParcelCount(e.target.value)}
                className="h-12 text-base"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-kind">Type de palette</Label>
            <select
              id="p-kind" value={palletKind} disabled={pending}
              onChange={e => setPalletKind(e.target.value as PalletKind)}
              className={selectClass}
            >
              {(Object.keys(PALLET_KIND_LABELS) as PalletKind[]).map(k => (
                <option key={k} value={k}>{PALLET_KIND_LABELS[k]}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-packaging">Type de conditionnement</Label>
            <Input
              id="p-packaging" value={packaging} disabled={pending}
              onChange={e => setPackaging(e.target.value)}
              placeholder="Carton 5 kg"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-strap">Type de cerclage</Label>
            <select
              id="p-strap" value={strapping} disabled={pending}
              onChange={e => setStrapping(e.target.value as StrappingKind)}
              className={selectClass}
            >
              {(Object.keys(STRAPPING_LABELS) as StrappingKind[]).map(k => (
                <option key={k} value={k}>{STRAPPING_LABELS[k]}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-weight">Poids net (kg)</Label>
              <Input
                id="p-weight" type="number" min={0} step="0.001" inputMode="decimal"
                value={weight} disabled={pending}
                onChange={e => setWeight(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-operator">Préparé par</Label>
              {operatorNames.length > 1 ? (
                <select
                  id="p-operator" value={operator} disabled={pending}
                  onChange={e => setOperator(e.target.value)}
                  className={selectClass}
                >
                  <option value="">—</option>
                  {operatorNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              ) : (
                <Input
                  id="p-operator" value={operator} disabled={pending}
                  onChange={e => setOperator(e.target.value)}
                  className="h-12 text-base"
                />
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-notes">Observations (optionnel)</Label>
            <Textarea
              id="p-notes" rows={2} value={notes} disabled={pending}
              onChange={e => setNotes(e.target.value)}
              className="resize-none text-base"
            />
          </div>

          <Button type="submit" className="w-full h-12 text-base" disabled={pending || !lotNumber}>
            {pending && <Loader2 size={16} className="mr-2 animate-spin" />}
            {isEdit ? 'Enregistrer' : 'Valider la palette'}
          </Button>

          {isEdit && !sheet!.bl_number && (
            <>
              <Button
                type="button" variant="outline"
                className="w-full h-12 text-base gap-2"
                disabled={pending}
                onClick={emitBL}
              >
                <FileCheck2 size={16} />
                Émettre le bon de livraison
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Une fois le bon émis, la fiche n&apos;est plus modifiable en atelier.
              </p>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
