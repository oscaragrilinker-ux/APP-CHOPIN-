'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArchiveRestore, ChevronDown, ChevronRight, Download, Loader2 } from 'lucide-react'
import { OfferStatusBadge } from '@/components/offres/OfferStatusBadge'
import { unarchiveOffers } from '@/lib/actions/archives'
import type { OfferStatus } from '@/types'

export type ArchivedOffer = {
  id: string
  productName: string
  varietyName: string | null
  formatName: string | null
  quantity: number
  lastPrice: string | null
  status: OfferStatus
  quoteNumber: string | null
  createdAtIso: string
  createdAtLabel: string
  archivedAtLabel: string
}

export type ArchivedGroup = {
  companyId: string | null
  companyName: string
  /** Mois → offres, du plus récent au plus ancien. */
  months: { label: string; offers: ArchivedOffer[] }[]
  total: number
}

/**
 * Archives classées par client puis par mois. Un client replié ne montre que
 * son nombre d'offres ; déplié, ses mois, du plus récent au plus ancien.
 */
export function ArchivedOffers({ groups }: { groups: ArchivedGroup[] }) {
  const router = useRouter()
  const [open, setOpen] = useState<Set<string>>(new Set(groups.slice(0, 1).map(g => g.companyName)))
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)

  const restore = (id: string) => {
    setBusy(id)
    startTransition(async () => {
      const res = await unarchiveOffers({ ids: [id] })
      setBusy(null)
      if ('error' in res) { toast.error('Restauration impossible', { description: res.error }); return }
      toast.success('Offre remise dans les négociations en cours.')
      router.refresh()
    })
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center">
        <p className="font-serif text-xl text-muted-foreground">Aucune offre archivée</p>
        <p className="text-sm text-muted-foreground mt-2">
          Depuis <Link href="/offres" className="text-primary hover:underline">Négociations</Link>, cochez une ou plusieurs offres puis « Archiver ».
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {groups.map(g => {
        const isOpen = open.has(g.companyName)
        return (
          <div key={g.companyName} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <button
              onClick={() => setOpen(prev => { const n = new Set(prev); if (n.has(g.companyName)) n.delete(g.companyName); else n.add(g.companyName); return n })}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
              aria-expanded={isOpen}
            >
              {isOpen ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
              <span className="font-medium text-foreground flex-1">{g.companyName}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{g.total} offre{g.total > 1 ? 's' : ''}</span>
            </button>

            {isOpen && g.months.map(m => (
              <div key={m.label} className="border-t border-border/40">
                <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{m.label}</p>
                <ul className="divide-y divide-border/30">
                  {m.offers.map(o => (
                    <li key={o.id} className="px-4 py-2.5 flex items-center gap-3 flex-wrap">
                      <div className="flex-1 min-w-[12rem]">
                        <Link href={`/offres/${o.id}`} className="text-sm font-medium text-foreground hover:text-primary">
                          {o.productName}{o.varietyName ? ` · ${o.varietyName}` : ''}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {o.createdAtLabel} · {o.quantity} × {o.formatName ?? 'contenant'}
                          {o.lastPrice ? ` · ${o.lastPrice}` : ''}
                          {o.quoteNumber ? ` · ${o.quoteNumber}` : ''}
                        </p>
                      </div>
                      <OfferStatusBadge status={o.status} />
                      <span className="text-[11px] text-muted-foreground hidden md:inline">archivée le {o.archivedAtLabel}</span>
                      <a href={`/api/pdf/devis?id=${o.id}`} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" title="Devis PDF">
                        <Download size={12} /> Devis
                      </a>
                      <button
                        onClick={() => restore(o.id)}
                        disabled={pending && busy === o.id}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
                        title="Remettre dans les négociations"
                      >
                        {pending && busy === o.id ? <Loader2 size={12} className="animate-spin" /> : <ArchiveRestore size={12} />}
                        Restaurer
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
