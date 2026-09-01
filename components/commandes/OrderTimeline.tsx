import { CheckCircle2, Circle, Clock } from 'lucide-react'
import type { OrderStatus } from '@/types'

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'accepted',       label: 'Acceptée' },
  { status: 'in_preparation', label: 'En préparation' },
  { status: 'ready',          label: 'Prête' },
  { status: 'shipped',        label: 'Expédiée' },
  { status: 'delivered',      label: 'Livrée' },
]

const ORDER: OrderStatus[] = ['accepted', 'in_preparation', 'ready', 'shipped', 'delivered']

export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-gray-400" />
        Commande annulée
      </div>
    )
  }

  const currentIndex = ORDER.indexOf(status)

  return (
    <div className="flex items-start gap-0">
      {STEPS.map((step, i) => {
        const done = i < currentIndex
        const active = i === currentIndex

        return (
          <div key={step.status} className="flex items-center flex-1 min-w-0">
            {/* Connecteur gauche */}
            {i > 0 && (
              <div className={`h-0.5 flex-1 transition-colors ${done || active ? 'bg-primary' : 'bg-border'}`} />
            )}

            <div className="flex flex-col items-center gap-1 shrink-0">
              {done ? (
                <CheckCircle2 size={20} className="text-primary" />
              ) : active ? (
                <Clock size={20} className="text-accent" />
              ) : (
                <Circle size={20} className="text-border" />
              )}
              <span className={`text-[10px] uppercase tracking-[0.08em] text-center leading-tight max-w-[56px] ${
                done ? 'text-primary' : active ? 'text-accent font-semibold' : 'text-muted-foreground/50'
              }`}>
                {step.label}
              </span>
            </div>

            {/* Connecteur droit */}
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 transition-colors ${done ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
