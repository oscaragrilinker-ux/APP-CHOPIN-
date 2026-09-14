'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Package, Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createOffer } from '@/lib/actions/offers'
import {
  computeTotal,
  formatEuro,
  formatTonnage,
  priceBasisLabel,
  priceBasisUnit,
} from '@/lib/utils/price'
import type { PriceBasis, VarietyWithFormats, ProductWithTree } from '@/types'
import { BRAND } from '@/lib/brand'

type Format = NonNullable<VarietyWithFormats['variety_formats'][number]['format']>

type Props = {
  product: Pick<ProductWithTree, 'name' | 'image_url' | 'season'>
  variety: VarietyWithFormats
  formats: Format[]
}

const PRICE_BASES: { value: PriceBasis; label: string; description: string }[] = [
  { value: 'per_tonne', label: '€ / tonne', description: 'Prix rapporté au poids total livré' },
  { value: 'per_container', label: '€ / contenant', description: 'Prix à l\'unité de conditionnement' },
  { value: 'total', label: 'Prix forfaitaire', description: 'Prix global pour toute la commande' },
]

export function OfferWizard({ product, variety, formats }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isPending, startTransition] = useTransition()

  const [selectedFormatId, setSelectedFormatId] = useState<string>(formats[0]?.id ?? '')
  const [quantity, setQuantity] = useState<string>('')
  const [priceBasis, setPriceBasis] = useState<PriceBasis>('per_tonne')
  const [unitPrice, setUnitPrice] = useState<string>('')
  const [requestedDate, setRequestedDate] = useState<string>('')
  const [message, setMessage] = useState<string>('')

  const selectedFormat = formats.find(f => f.id === selectedFormatId) ?? formats[0]
  const qty = parseInt(quantity, 10)
  const price = parseFloat(unitPrice)
  const hasQty = !isNaN(qty) && qty > 0
  const hasPrice = !isNaN(price) && price > 0

  const total = hasQty && hasPrice
    ? computeTotal({ priceBasis, unitPrice: price, quantity: qty, weightKg: selectedFormat?.weight_kg })
    : null

  function canNext() {
    if (step === 2) return !!selectedFormatId
    if (step === 3) return hasQty
    if (step === 4) return hasPrice
    return true
  }

  function handleSubmit() {
    startTransition(async () => {
      const res = await createOffer({
        variety_id: variety.id,
        format_id: selectedFormatId,
        quantity: qty,
        price_basis: priceBasis,
        unit_price: price,
        requested_date: requestedDate || null,
        message: message || null,
      })
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success(`Offre envoyée ! ${BRAND.name} reviendra vers vous très vite.`)
        router.push(`/offres/${res.offerId}`)
      }
    })
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Indicateur de progression */}
      <div className="flex items-center gap-1 mb-8">
        {[1, 2, 3, 4, 5, 6].map(s => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              s < step ? 'bg-primary' : s === step ? 'bg-accent' : 'bg-border'
            }`}
          />
        ))}
      </div>

      {/* Étape 1 — Variété */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-1">Étape 1 / 6</p>
            <h2 className="font-serif text-2xl text-foreground">Votre sélection</h2>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card p-5 flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/8 border border-border/40 flex items-center justify-center">
              <Leaf size={20} className="text-primary/50" />
            </div>
            <div>
              <p className="font-serif text-lg text-foreground">{product.name}</p>
              <p className="text-muted-foreground text-sm">{variety.name}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {variety.caliber && (
                  <span className="text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded bg-accent/10 text-accent/80 border border-accent/20">
                    {variety.caliber}
                  </span>
                )}
                {variety.quality_grade && (
                  <span className="text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded bg-accent/10 text-accent/80 border border-accent/20">
                    {variety.quality_grade}
                  </span>
                )}
                {product.season && (
                  <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/60">
                    {product.season}
                  </span>
                )}
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Vous allez soumettre une proposition de prix pour cette variété. {BRAND.name}
            vous répondra sous 48 h ouvrées.
          </p>
        </div>
      )}

      {/* Étape 2 — Contenant */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-1">Étape 2 / 6</p>
            <h2 className="font-serif text-2xl text-foreground">Choisissez un contenant</h2>
            <p className="text-sm text-muted-foreground mt-1">Format de conditionnement pour cette variété</p>
          </div>
          <div className="grid gap-2">
            {formats.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFormatId(f.id)}
                className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                  selectedFormatId === f.id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border/70 bg-card hover:border-primary/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Package size={16} className={selectedFormatId === f.id ? 'text-primary' : 'text-muted-foreground'} />
                  <div>
                    <p className="font-medium text-sm text-foreground">{f.name}</p>
                    {f.weight_kg != null && (
                      <p className="text-xs text-muted-foreground">{f.weight_kg.toLocaleString('fr-FR')} kg / contenant</p>
                    )}
                  </div>
                  {selectedFormatId === f.id && (
                    <CheckCircle2 size={16} className="ml-auto text-primary shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Étape 3 — Quantité */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-1">Étape 3 / 6</p>
            <h2 className="font-serif text-2xl text-foreground">Nombre de contenants</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Contenant sélectionné : <strong>{selectedFormat?.name}</strong>
              {selectedFormat?.weight_kg != null && ` · ${selectedFormat.weight_kg} kg/unité`}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-xs uppercase tracking-[0.08em]">
              Quantité (nombre de contenants)
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              step="1"
              placeholder="Ex. 40"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="h-11 text-lg"
              autoFocus
            />
          </div>
          {hasQty && (
            <div className="rounded-xl bg-secondary/50 border border-border/60 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Tonnage : </span>
              <strong className="text-foreground">
                {formatTonnage(qty, selectedFormat?.weight_kg)}
              </strong>
            </div>
          )}
        </div>
      )}

      {/* Étape 4 — Base de prix + Prix */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-1">Étape 4 / 6</p>
            <h2 className="font-serif text-2xl text-foreground">Votre proposition de prix</h2>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.08em]">Base de prix</Label>
            <div className="grid gap-2">
              {PRICE_BASES.map(pb => (
                <button
                  key={pb.value}
                  type="button"
                  onClick={() => setPriceBasis(pb.value)}
                  className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                    priceBasis === pb.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border/70 bg-card hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-foreground">{pb.label}</p>
                      <p className="text-xs text-muted-foreground">{pb.description}</p>
                    </div>
                    {priceBasis === pb.value && <CheckCircle2 size={16} className="text-primary shrink-0" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit-price" className="text-xs uppercase tracking-[0.08em]">
              {priceBasisLabel(priceBasis)} (€)
            </Label>
            <Input
              id="unit-price"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex. 450.00"
              value={unitPrice}
              onChange={e => setUnitPrice(e.target.value)}
              className="h-11 text-lg"
            />
          </div>

          {total !== null && (
            <div className="rounded-xl bg-secondary/50 border border-border/60 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground mb-1">Total estimé</p>
              <p className="font-serif text-2xl text-foreground">{formatEuro(total)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {qty} × {selectedFormat?.name}
                {priceBasis === 'per_tonne' && selectedFormat?.weight_kg != null
                  ? ` · ${formatTonnage(qty, selectedFormat.weight_kg)}`
                  : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Étape 5 — Date + Message */}
      {step === 5 && (
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-1">Étape 5 / 6</p>
            <h2 className="font-serif text-2xl text-foreground">Informations complémentaires</h2>
            <p className="text-sm text-muted-foreground mt-1">Optionnel — vous pouvez passer cette étape</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="req-date" className="text-xs uppercase tracking-[0.08em]">
              Date de livraison souhaitée
            </Label>
            <Input
              id="req-date"
              type="date"
              value={requestedDate}
              onChange={e => setRequestedDate(e.target.value)}
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg" className="text-xs uppercase tracking-[0.08em]">
              Message à {BRAND.name}
            </Label>
            <Textarea
              id="msg"
              rows={4}
              placeholder="Précisions sur la commande, contraintes particulières, questions…"
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="resize-none text-sm"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground/50 text-right">{message.length}/1000</p>
          </div>
        </div>
      )}

      {/* Étape 6 — Récapitulatif */}
      {step === 6 && (
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-1">Étape 6 / 6</p>
            <h2 className="font-serif text-2xl text-foreground">Récapitulatif</h2>
            <p className="text-sm text-muted-foreground mt-1">Vérifiez votre proposition avant l&apos;envoi</p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card divide-y divide-border/50">
            <Row label="Produit" value={`${product.name} · ${variety.name}`} />
            <Row label="Contenant" value={selectedFormat?.name ?? '—'} />
            <Row label="Quantité" value={`${qty} contenant${qty > 1 ? 's' : ''}`} />
            {selectedFormat?.weight_kg != null && (
              <Row label="Tonnage" value={formatTonnage(qty, selectedFormat.weight_kg)} />
            )}
            <Row label="Base de prix" value={priceBasisLabel(priceBasis)} />
            <Row label={`Prix (${priceBasisUnit(priceBasis)})`} value={formatEuro(price)} />
            {total !== null && (
              <Row label="Total estimé" value={formatEuro(total)} highlight />
            )}
            {requestedDate && (
              <Row label="Date souhaitée" value={new Date(requestedDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} />
            )}
            {message && (
              <div className="px-4 py-3">
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground mb-1">Message</p>
                <p className="text-sm text-foreground">{message}</p>
              </div>
            )}
          </div>

          <Button
            className="w-full h-11 bg-primary hover:bg-primary/90 text-base gap-2"
            disabled={isPending}
            onClick={handleSubmit}
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Envoi en cours…
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Envoyer mon offre
              </>
            )}
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className={`flex gap-3 mt-8 ${step === 1 ? 'justify-end' : 'justify-between'}`}>
        {step > 1 && (
          <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} disabled={isPending}>
            <ArrowLeft size={15} />
            Précédent
          </Button>
        )}
        {step < 6 && (
          <Button size="sm" onClick={() => setStep(s => s + 1)} disabled={!canNext() || isPending}>
            Suivant
            <ArrowRight size={15} />
          </Button>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-4">
      <span className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      <span className={`text-sm text-right ${highlight ? 'font-serif text-lg text-foreground' : 'text-foreground/80'}`}>
        {value}
      </span>
    </div>
  )
}
