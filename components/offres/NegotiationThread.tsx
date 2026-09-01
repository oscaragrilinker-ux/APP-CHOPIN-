import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { OfferRound, PriceBasis } from '@/types'
import { computeTotal, formatEuro, priceBasisUnit } from '@/lib/utils/price'

type Props = {
  rounds: OfferRound[]
  priceBasis: PriceBasis
  quantity: number
  weightKg?: number | null
  companyName: string
}

export function NegotiationThread({ rounds, priceBasis, quantity, weightKg, companyName }: Props) {
  if (!rounds.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Aucun échange pour l&apos;instant.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {rounds.map(round => {
        const isAdminRound = round.author_role === 'admin'
        const isRight = isAdminRound
        const label = isAdminRound ? 'Chopin Conditionnement' : companyName
        const total = computeTotal({ priceBasis, unitPrice: round.unit_price, quantity, weightKg })

        return (
          <div key={round.id} className={`flex ${isRight ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${isRight
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-secondary/70 text-foreground rounded-tl-sm border border-border/60'
            }`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${isRight ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                  {label}
                </span>
                <span className={`text-[10px] ${isRight ? 'text-primary-foreground/40' : 'text-muted-foreground/50'}`}>
                  Round {round.round_number}
                </span>
              </div>

              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-serif text-xl leading-none">
                  {formatEuro(round.unit_price)}
                </span>
                <span className={`text-xs ${isRight ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                  {priceBasisUnit(priceBasis)}
                </span>
              </div>

              <p className={`text-xs mt-1 ${isRight ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                Total estimé : {formatEuro(total)}
              </p>

              {round.message && (
                <p className={`text-sm mt-2 pt-2 border-t ${isRight
                  ? 'border-primary-foreground/20 text-primary-foreground/80'
                  : 'border-border/40 text-foreground/80'
                }`}>
                  {round.message}
                </p>
              )}

              <p className={`text-[10px] mt-2 ${isRight ? 'text-primary-foreground/40' : 'text-muted-foreground/50'}`}>
                {format(new Date(round.created_at), 'd MMM yyyy à HH:mm', { locale: fr })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
