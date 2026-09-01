'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format as formatDate, differenceInCalendarDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronRight, Layers, Loader2, Pin, PinOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PalletSheetDialog } from './PalletSheetDialog'
import { updateOrderStatus } from '@/lib/actions/orders'
import { setOrderPriority } from '@/lib/actions/logistics'
import type { OrderForConditionnement, OrderStatus, PalletSheet } from '@/types'

type Props = {
  orders: OrderForConditionnement[]
  sheets: PalletSheet[]
  canPin: boolean
  canPrepare: boolean
  operatorNames: string[]
  defaultOperator: string | null
}

const NEXT_STEP: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  accepted:       { status: 'in_preparation', label: 'Démarrer' },
  in_preparation: { status: 'ready',          label: 'Marquer prête' },
}

const STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  accepted:       'À préparer',
  in_preparation: 'En préparation',
  ready:          'Prête',
}

/** Urgence lisible d'un coup d'œil, sans avoir à calculer une date. */
function urgency(deliveryDate: string | null) {
  if (!deliveryDate) return { label: 'Sans date', tone: 'none' as const }
  const days = differenceInCalendarDays(new Date(deliveryDate), new Date())
  if (days < 0) return { label: `Retard ${Math.abs(days)} j`, tone: 'late' as const }
  if (days === 0) return { label: "Aujourd'hui", tone: 'today' as const }
  if (days === 1) return { label: 'Demain', tone: 'soon' as const }
  return { label: `J-${days}`, tone: 'later' as const }
}

const TONE_CLASSES: Record<string, string> = {
  late:  'bg-destructive/10 text-destructive border-destructive/30',
  today: 'bg-amber-100 text-amber-900 border-amber-300',
  soon:  'bg-amber-50 text-amber-800 border-amber-200',
  later: 'bg-secondary text-muted-foreground border-border',
  none:  'bg-secondary text-muted-foreground border-border',
}

export function AtelierQueue({
  orders, sheets, canPin, canPrepare, operatorNames, defaultOperator,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  const sheetsByOrder = useMemo(() => {
    const map = new Map<string, PalletSheet[]>()
    for (const s of sheets) {
      const list = map.get(s.order_id) ?? []
      list.push(s)
      map.set(s.order_id, list)
    }
    return map
  }, [sheets])

  function advance(order: OrderForConditionnement) {
    const next = NEXT_STEP[order.status]
    if (!next) return
    setBusyId(order.id)
    startTransition(async () => {
      const res = await updateOrderStatus({ orderId: order.id, newStatus: next.status })
      setBusyId(null)
      if ('error' in res) toast.error(res.error)
      else {
        toast.success(`${order.company_name} — ${next.label.toLowerCase()}`)
        router.refresh()
      }
    })
  }

  function togglePin(order: OrderForConditionnement) {
    setBusyId(order.id)
    startTransition(async () => {
      const res = await setOrderPriority({ orderId: order.id, pinned: !order.priority_pinned_at })
      setBusyId(null)
      if ('error' in res) toast.error(res.error)
      else {
        toast.success(order.priority_pinned_at ? 'Retirée de la tête de file.' : 'Épinglée en tête de file.')
        router.refresh()
      }
    })
  }

  if (!orders.length) {
    return (
      <div className="space-y-6">
        <Header count={0} />
        <div className="rounded-2xl border border-dashed border-border/60 p-16 text-center">
          <p className="font-serif text-2xl text-muted-foreground">Aucune commande à préparer</p>
          <p className="text-sm text-muted-foreground mt-2">La file est vide, tout est à jour.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Header count={orders.length} />

      <ol className="space-y-4">
        {orders.map((order, index) => {
          const u = urgency(order.delivery_date)
          const next = NEXT_STEP[order.status]
          const orderSheets = sheetsByOrder.get(order.id) ?? []
          const palletsDone = orderSheets.reduce((s, p) => s + p.pallet_count, 0)
          const isBusy = pending && busyId === order.id
          const theoreticalWeight = order.format_weight_kg
            ? order.quantity * Number(order.format_weight_kg)
            : null

          return (
            <li
              key={order.id}
              className={`rounded-2xl border bg-card overflow-hidden ${
                order.priority_pinned_at ? 'border-accent shadow-sm' : 'border-border/60'
              }`}
            >
              {order.priority_pinned_at && (
                <div className="bg-accent/15 px-4 py-1.5 text-[11px] uppercase tracking-[0.12em] text-accent-foreground/80 flex items-center gap-1.5">
                  <Pin size={12} />
                  Priorité
                </div>
              )}

              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground tabular-nums">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h2 className="font-serif text-xl sm:text-2xl text-foreground">
                        {order.company_name}
                      </h2>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${TONE_CLASSES[u.tone]}`}>
                        {u.label}
                      </span>
                    </div>

                    <p className="text-sm text-foreground mt-1">
                      {order.product_name}
                      {order.variety_name && <span className="text-muted-foreground"> · {order.variety_name}</span>}
                    </p>

                    <p className="text-sm text-muted-foreground mt-0.5 tabular-nums">
                      {order.quantity} × {order.format_name ?? 'contenant'}
                      {theoreticalWeight !== null && ` · ${theoreticalWeight.toLocaleString('fr-FR')} kg`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {canPin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-11 px-3 text-muted-foreground"
                        disabled={isBusy}
                        onClick={() => togglePin(order)}
                        title={order.priority_pinned_at ? 'Retirer la priorité' : 'Épingler en tête'}
                      >
                        {order.priority_pinned_at ? <PinOff size={16} /> : <Pin size={16} />}
                      </Button>
                    )}
                    <span className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                      {STATUS_LABEL[order.status]}
                    </span>
                  </div>
                </div>

                {/* Logistique */}
                {(order.delivery_date || order.carrier_name || order.delivery_location) && (
                  <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    {order.delivery_date && (
                      <Field label="Livraison">
                        {formatDate(new Date(order.delivery_date), 'd MMM', { locale: fr })}
                        {order.delivery_time && ` · ${order.delivery_time.slice(0, 5)}`}
                      </Field>
                    )}
                    {order.carrier_name && <Field label="Transporteur">{order.carrier_name}</Field>}
                    {order.pickup_location && <Field label="Enlèvement">{order.pickup_location}</Field>}
                    {order.delivery_location && <Field label="Destination">{order.delivery_location}</Field>}
                  </div>
                )}

                {order.transport_notes && (
                  <p className="mt-3 text-sm text-muted-foreground italic">{order.transport_notes}</p>
                )}

                {/* Palettes déjà saisies */}
                {orderSheets.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
                    {orderSheets.map(sheet => (
                      <div key={sheet.id} className="flex items-center gap-2 text-sm flex-wrap">
                        <Layers size={14} className="text-muted-foreground shrink-0" />
                        <span className="text-foreground tabular-nums">
                          {sheet.pallet_count} palette{sheet.pallet_count > 1 ? 's' : ''}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">Lot {sheet.lot_number}</span>
                        {sheet.bl_number && (
                          <>
                            <span className="text-muted-foreground">·</span>
                            <span className="font-mono text-xs text-primary">{sheet.bl_number}</span>
                          </>
                        )}
                        {canPrepare && !sheet.bl_number && (
                          <PalletSheetDialog
                            order={order}
                            sheet={sheet}
                            operatorNames={operatorNames}
                            defaultOperator={defaultOperator}
                            trigger={
                              <button className="text-xs text-primary hover:underline ml-auto">
                                Modifier
                              </button>
                            }
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {canPrepare && (
                    <PalletSheetDialog
                      order={order}
                      operatorNames={operatorNames}
                      defaultOperator={defaultOperator}
                      trigger={
                        <Button variant="outline" className="h-12 px-5 gap-2 text-base">
                          <Layers size={17} />
                          Nouvelle palette
                        </Button>
                      }
                    />
                  )}

                  {next && canPrepare && (
                    <Button
                      className="h-12 px-6 gap-2 text-base bg-primary hover:bg-primary/90"
                      disabled={isBusy}
                      onClick={() => advance(order)}
                    >
                      {isBusy ? <Loader2 size={17} className="animate-spin" /> : <ChevronRight size={17} />}
                      {next.label}
                    </Button>
                  )}

                  {palletsDone > 0 && (
                    <span className="text-sm text-muted-foreground ml-auto tabular-nums">
                      {palletsDone} palette{palletsDone > 1 ? 's' : ''} montée{palletsDone > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Header({ count }: { count: number }) {
  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground">Atelier</h1>
      <p className="text-sm text-muted-foreground mt-1 uppercase tracking-[0.1em]">
        File de préparation · {count} commande{count > 1 ? 's' : ''}
      </p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground mt-0.5">{children}</p>
    </div>
  )
}
