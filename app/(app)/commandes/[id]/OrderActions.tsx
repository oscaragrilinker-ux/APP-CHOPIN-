'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateOrderStatus } from '@/lib/actions/orders'
import type { Role, OrderStatus } from '@/types'

type Props = {
  orderId: string
  currentStatus: OrderStatus
  role: Role
}

const NEXT_STATUS: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  accepted:       { status: 'in_preparation', label: 'Démarrer la préparation' },
  in_preparation: { status: 'ready',          label: 'Marquer comme prête' },
  ready:          { status: 'shipped',         label: 'Marquer comme expédiée' },
  shipped:        { status: 'delivered',       label: 'Confirmer la livraison' },
}

// Miroir UI de lib/actions/orders.ts — la vérification qui fait foi est côté serveur.
const CONDITIONNEMENT_NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  accepted:       { status: 'in_preparation', label: 'Démarrer la préparation' },
  in_preparation: { status: 'ready',          label: 'Marquer comme prête' },
}

const SECRETAIRE_NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  ready:   { status: 'shipped',   label: 'Marquer comme expédiée' },
  shipped: { status: 'delivered', label: 'Confirmer la livraison' },
}

export function OrderActions({ orderId, currentStatus, role }: Props) {
  const [isPending, startTransition] = useTransition()

  const transitions =
    role === 'conditionnement' ? CONDITIONNEMENT_NEXT
    : role === 'secretaire'    ? SECRETAIRE_NEXT
    : NEXT_STATUS
  const next = transitions[currentStatus]

  if (!next) return null

  function advance() {
    startTransition(async () => {
      const res = await updateOrderStatus({ orderId, newStatus: next!.status })
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success(`Commande : ${next!.label.toLowerCase()} ✓`)
      }
    })
  }

  return (
    <div className="pt-2">
      <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-3">Action</p>
      <Button
        className="w-full sm:w-auto h-10 gap-2 bg-primary hover:bg-primary/90"
        onClick={advance}
        disabled={isPending}
      >
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />}
        {next.label}
      </Button>
    </div>
  )
}
