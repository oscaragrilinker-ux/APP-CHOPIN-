'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { respondToOffer, cancelOffer } from '@/lib/actions/offers'
import { priceBasisUnit, formatEuro } from '@/lib/utils/price'
import type { OfferStatus, Role, PriceBasis } from '@/types'

type Props = {
  offerId: string
  offerStatus: OfferStatus
  viewerRole: Role
  priceBasis: PriceBasis
  /** Dernier prix proposé par le client — ce que Chopin accepte s'il se range à sa position. */
  clientLastPrice?: number | null
  onDone?: () => void
}

export function RespondPanel({
  offerId,
  offerStatus,
  viewerRole,
  priceBasis,
  clientLastPrice,
  onDone,
}: Props) {
  const [mode, setMode] = useState<'idle' | 'counter' | 'refuse'>('idle')
  const [unitPrice, setUnitPrice] = useState('')
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  // La secrétaire consulte les négociations sans y répondre (docs/permissions.md).
  const isAdmin = ['admin', 'super_admin'].includes(viewerRole)
  const isClient = viewerRole === 'client_pro'

  const terminal: OfferStatus[] = ['accepted', 'refused', 'cancelled']
  if (terminal.includes(offerStatus)) return null

  if (!isAdmin && !isClient) {
    return (
      <div className="rounded-xl border border-border/60 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground text-center">
        Négociation en lecture seule pour votre rôle.
      </div>
    )
  }

  // Le tour indique qui doit répondre, mais Chopin garde la main sur une offre
  // qu'il a lui-même contre-proposée (réviser, se ranger au prix client, refuser).
  const isMyTurn = (offerStatus === 'pending' && isAdmin) || (offerStatus === 'counter_proposed' && isClient)
  const awaitingClient = isAdmin && offerStatus === 'counter_proposed'

  if (!isMyTurn && !isClient && !awaitingClient) {
    return (
      <div className="rounded-xl border border-border/60 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground text-center">
        En attente de la réponse du client…
      </div>
    )
  }

  if (!isMyTurn && isClient) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-border/60 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground text-center">
          En attente de la réponse de Chopin Conditionnement…
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-destructive"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const res = await cancelOffer({ offerId })
              if ('error' in res) {
                toast.error(res.error)
              } else {
                toast.success('Offre annulée.')
                onDone?.()
              }
            })
          }}
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
          Annuler mon offre
        </Button>
      </div>
    )
  }

  function handleRespond(action: 'accept' | 'refuse' | 'counter') {
    startTransition(async () => {
      const res = await respondToOffer({
        offerId,
        action,
        unitPrice: action === 'counter' ? Number(unitPrice) : undefined,
        message: message || undefined,
      })
      if ('error' in res) {
        toast.error(res.error)
      } else {
        const labels = { accept: 'Offre acceptée.', refuse: 'Offre refusée.', counter: 'Contre-proposition envoyée.' }
        toast.success(labels[action])
        setMode('idle')
        setUnitPrice('')
        setMessage('')
        onDone?.()
      }
    })
  }

  if (mode === 'counter') {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
        <p className="text-sm font-medium text-foreground">Contre-proposition</p>

        <div className="space-y-1.5">
          <Label htmlFor="counter-price" className="text-xs uppercase tracking-[0.08em]">
            Prix proposé ({priceBasisUnit(priceBasis)})
          </Label>
          <Input
            id="counter-price"
            type="number"
            min="0"
            step="0.01"
            placeholder="Ex. 450.00"
            value={unitPrice}
            onChange={e => setUnitPrice(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="counter-msg" className="text-xs uppercase tracking-[0.08em]">
            Message (optionnel)
          </Label>
          <Textarea
            id="counter-msg"
            rows={3}
            placeholder="Précisez votre position si nécessaire…"
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="resize-none text-sm"
          />
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            disabled={isPending || !unitPrice || Number(unitPrice) <= 0}
            onClick={() => handleRespond('counter')}
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            Envoyer
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setMode('idle'); setUnitPrice(''); setMessage('') }}>
            Annuler
          </Button>
        </div>
      </div>
    )
  }

  if (mode === 'refuse') {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-4">
        <p className="text-sm font-medium text-foreground">Refuser l&apos;offre</p>
        <div className="space-y-1.5">
          <Label htmlFor="refuse-msg" className="text-xs uppercase tracking-[0.08em]">
            Motif (optionnel)
          </Label>
          <Textarea
            id="refuse-msg"
            rows={3}
            placeholder="Expliquez pourquoi vous refusez…"
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="resize-none text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            disabled={isPending}
            onClick={() => handleRespond('refuse')}
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            Confirmer le refus
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setMode('idle'); setMessage('') }}>
            Annuler
          </Button>
        </div>
      </div>
    )
  }

  const headline = isClient
    ? 'Votre réponse'
    : awaitingClient
      ? 'En attente du client · vous pouvez encore intervenir'
      : 'Répondre à ce client'

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground/70 mb-3">
        {headline}
      </p>

      {awaitingClient && (
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          Votre contre-proposition a été transmise. Vous pouvez la réviser, vous ranger au
          prix du client ou clore la négociation sans attendre sa réponse.
        </p>
      )}

      <Button
        className="w-full bg-primary hover:bg-primary/90 gap-2"
        disabled={isPending || (awaitingClient && !clientLastPrice)}
        onClick={() => handleRespond('accept')}
      >
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
        {awaitingClient && clientLastPrice
          ? `Accepter le prix du client (${formatEuro(clientLastPrice)})`
          : 'Accepter le prix proposé'}
      </Button>

      <Button
        variant="outline"
        className="w-full gap-2"
        disabled={isPending}
        onClick={() => setMode('counter')}
      >
        <RefreshCw size={15} />
        {awaitingClient ? 'Réviser ma contre-proposition' : 'Contre-proposer'}
      </Button>

      {!isClient && (
        <Button
          variant="ghost"
          className="w-full gap-2 text-muted-foreground hover:text-destructive"
          disabled={isPending}
          onClick={() => setMode('refuse')}
        >
          <XCircle size={15} />
          Refuser
        </Button>
      )}

      {isClient && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground/60 hover:text-muted-foreground text-xs"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const res = await cancelOffer({ offerId })
              if ('error' in res) toast.error(res.error)
              else { toast.success('Offre annulée.'); onDone?.() }
            })
          }}
        >
          Annuler mon offre
        </Button>
      )}
    </div>
  )
}
