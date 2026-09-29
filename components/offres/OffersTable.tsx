'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Archive, Loader2, X } from 'lucide-react'
import { OfferStatusBadge } from '@/components/offres/OfferStatusBadge'
import { archiveOffers } from '@/lib/actions/archives'
import type { OfferStatus } from '@/types'

export type OfferRow = {
  id: string
  companyName: string | null
  productName: string
  varietyName: string | null
  formatName: string | null
  quantity: number
  lastPrice: string | null
  basisUnit: string
  status: OfferStatus
  createdAt: string        // déjà formatée
  needsAction: boolean
}

/**
 * Liste des négociations, avec sélection multiple pour l'exploitation.
 *
 * La ligne entière ouvre l'offre ; la case à cocher, elle, arrête la
 * propagation — on peut cocher dix lignes sans jamais quitter la page.
 */
export function OffersTable({ rows, staff }: { rows: OfferRow[]; staff: boolean }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const allSelected = rows.length > 0 && selected.size === rows.length
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)))

  const archive = () => startTransition(async () => {
    const res = await archiveOffers({ ids: Array.from(selected) })
    if ('error' in res) { toast.error('Archivage impossible', { description: res.error }); return }
    toast.success(`${res.count} offre${res.count > 1 ? 's' : ''} archivée${res.count > 1 ? 's' : ''}`, {
      description: 'Retrouvez-les dans Archives, classées par client.',
    })
    setSelected(new Set())
    router.refresh()
  })

  const th = 'text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal'

  return (
    <div className="space-y-3">
      {staff && selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-sm text-foreground">
            <strong>{selected.size}</strong> offre{selected.size > 1 ? 's' : ''} sélectionnée{selected.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={archive}
            disabled={pending}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-60"
          >
            {pending ? <Loader2 size={13} className="animate-spin" /> : <Archive size={13} />}
            Archiver
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-muted-foreground hover:text-foreground" aria-label="Annuler la sélection">
            <X size={15} />
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-border/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-secondary/30">
              {staff && (
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" aria-label="Tout sélectionner" checked={allSelected} onChange={toggleAll} className="accent-primary" />
                </th>
              )}
              {staff && <th className={th}>Client</th>}
              <th className={th}>Produit</th>
              <th className={`${th} hidden sm:table-cell`}>Qté</th>
              <th className={`${th} hidden md:table-cell`}>Dernier prix</th>
              <th className={th}>Statut</th>
              <th className={`${th} hidden lg:table-cell`}>Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map(r => (
              <tr
                key={r.id}
                onClick={() => router.push(`/offres/${r.id}`)}
                className={`hover:bg-secondary/40 cursor-pointer transition-colors ${r.needsAction ? 'bg-amber-50/40' : ''} ${selected.has(r.id) ? 'bg-primary/5' : ''}`}
              >
                {staff && (
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" aria-label={`Sélectionner l'offre ${r.productName}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="accent-primary" />
                  </td>
                )}
                {staff && (
                  <td className="px-4 py-3 text-foreground font-medium">
                    {r.companyName ?? '—'}
                    {r.needsAction && <span className="ml-2 inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />}
                  </td>
                )}
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{r.productName}</p>
                  {r.varietyName && <p className="text-xs text-muted-foreground">{r.varietyName} · {r.formatName ?? '—'}</p>}
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.quantity}</td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {r.lastPrice ? (
                    <span className="text-foreground">{r.lastPrice}<span className="text-muted-foreground text-xs ml-1">{r.basisUnit}</span></span>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3"><OfferStatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{r.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
