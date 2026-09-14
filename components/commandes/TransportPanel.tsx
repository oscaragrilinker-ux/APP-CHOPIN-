'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format as formatDate } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Check, Copy, Loader2, Mail, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateTransport } from '@/lib/actions/logistics'
import type { Carrier } from '@/types'
import { BRAND } from '@/lib/brand'

type Props = {
  orderId: string
  carriers: Carrier[]
  current: {
    carrier_id: string | null
    pickup_location: string | null
    delivery_location: string | null
    delivery_date: string | null
    delivery_time: string | null
    transport_notes: string | null
  }
  /** Sert à composer le récapitulatif envoyé au transporteur. */
  shipment: {
    companyName: string
    companyAddress: string | null
    productLabel: string
    quantity: number
    formatName: string | null
    palletCount: number | null
    parcelCount: number | null
    weightKg: number | null
  }
  canEdit: boolean
}

export function TransportPanel({ orderId, carriers, current, shipment, canEdit }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)

  const [carrierId, setCarrierId] = useState(current.carrier_id ?? '')
  const [pickup, setPickup] = useState(current.pickup_location ?? '')
  const [dropoff, setDropoff] = useState(current.delivery_location ?? shipment.companyAddress ?? '')
  const [date, setDate] = useState(current.delivery_date ?? '')
  const [time, setTime] = useState(current.delivery_time?.slice(0, 5) ?? '')
  const [notes, setNotes] = useState(current.transport_notes ?? '')

  const carrier = carriers.find(c => c.id === carrierId) ?? null

  const recap = useMemo(() => {
    const lines: string[] = []
    lines.push(`DEMANDE DE TRANSPORT — ${shipment.companyName}`)
    lines.push('')
    lines.push('Chargement :')
    lines.push(`  ${shipment.productLabel}`)
    lines.push(`  ${shipment.quantity} × ${shipment.formatName ?? 'contenant'}`)
    if (shipment.palletCount) lines.push(`  ${shipment.palletCount} palette${shipment.palletCount > 1 ? 's' : ''}`)
    if (shipment.parcelCount) lines.push(`  ${shipment.parcelCount} colis`)
    if (shipment.weightKg) lines.push(`  Poids : ${shipment.weightKg.toLocaleString('fr-FR')} kg`)
    lines.push('')
    lines.push(`Enlèvement : ${pickup || 'à préciser'}`)
    if (date) {
      const when = formatDate(new Date(date), 'EEEE d MMMM yyyy', { locale: fr })
      lines.push(`  ${when}${time ? ` à ${time}` : ''}`)
    }
    lines.push('')
    lines.push(`Livraison : ${dropoff || 'à préciser'}`)
    if (notes) {
      lines.push('')
      lines.push(`Remarques : ${notes}`)
    }
    lines.push('')
    lines.push(BRAND.legalName)
    return lines.join('\n')
  }, [shipment, pickup, dropoff, date, time, notes])

  function save() {
    startTransition(async () => {
      const res = await updateTransport({
        order_id: orderId,
        carrier_id: carrierId || null,
        pickup_location: pickup || null,
        delivery_location: dropoff || null,
        delivery_date: date || null,
        delivery_time: time || null,
        transport_notes: notes || null,
      })
      if ('error' in res) {
        toast.error('Enregistrement impossible', { description: res.error })
        return
      }
      toast.success('Transport enregistré.')
      router.refresh()
    })
  }

  async function copyRecap() {
    await navigator.clipboard.writeText(recap)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const mailto = carrier?.email
    ? `mailto:${carrier.email}?subject=${encodeURIComponent(
        `Demande de transport — ${shipment.companyName}`,
      )}&body=${encodeURIComponent(recap)}`
    : null

  const selectClass =
    'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm ' +
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50'

  if (!canEdit) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground mb-3">
          Transport
        </p>
        {carrier || pickup || dropoff ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            {carrier && <Read label="Transporteur">{carrier.name}</Read>}
            {date && (
              <Read label="Enlèvement">
                {formatDate(new Date(date), 'd MMM yyyy', { locale: fr })}
                {time && ` · ${time}`}
              </Read>
            )}
            {pickup && <Read label="Lieu de chargement">{pickup}</Read>}
            {dropoff && <Read label="Lieu de livraison">{dropoff}</Read>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Transport non organisé.</p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Truck size={15} className="text-muted-foreground" />
        <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground">
          Transport
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="tr-carrier">Transporteur</Label>
          <select
            id="tr-carrier" value={carrierId} disabled={pending}
            onChange={e => setCarrierId(e.target.value)}
            className={selectClass}
          >
            <option value="">Non attribué</option>
            {carriers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tr-date">Date d&apos;enlèvement</Label>
          <Input
            id="tr-date" type="date" value={date} disabled={pending}
            onChange={e => setDate(e.target.value)} className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tr-time">Heure</Label>
          <Input
            id="tr-time" type="time" value={time} disabled={pending}
            onChange={e => setTime(e.target.value)} className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tr-pickup">Lieu de chargement</Label>
          <Input
            id="tr-pickup" value={pickup} disabled={pending}
            onChange={e => setPickup(e.target.value)}
            placeholder="Site Chopin" className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tr-dropoff">Lieu de livraison</Label>
          <Input
            id="tr-dropoff" value={dropoff} disabled={pending}
            onChange={e => setDropoff(e.target.value)} className="h-9"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="tr-notes">Consignes (optionnel)</Label>
          <Textarea
            id="tr-notes" rows={2} value={notes} disabled={pending}
            onChange={e => setNotes(e.target.value)}
            className="resize-none text-sm"
            placeholder="Hayon nécessaire, créneau de quai, contact sur place…"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={save} disabled={pending}>
          {pending && <Loader2 size={14} className="mr-2 animate-spin" />}
          Enregistrer
        </Button>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={copyRecap}>
          {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
          Copier le récap
        </Button>
        {mailto && (
          <Button asChild variant="outline" size="sm" className="gap-2">
            <a href={mailto}>
              <Mail size={14} />
              Envoyer à {carrier!.name}
            </a>
          </Button>
        )}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Aperçu du récapitulatif
        </summary>
        <pre className="mt-2 p-3 rounded-lg bg-secondary/50 border border-border/60 text-xs whitespace-pre-wrap font-mono overflow-x-auto">
          {recap}
        </pre>
      </details>
    </div>
  )
}

function Read({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground mt-0.5">{children}</p>
    </div>
  )
}
