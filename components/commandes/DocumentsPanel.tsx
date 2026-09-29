'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Download, FileCheck2, FileText, Loader2, Truck, ClipboardList, Receipt } from 'lucide-react'
import { issueDeliveryNotesForOrder } from '@/lib/actions/logistics'

type Props = {
  orderId: string
  offerId: string | null
  invoice: { id: string; number: string } | null
  sheetCount: number
  issuedCount: number
  /** L'atelier n'a ni prix, ni transport, ni facture : uniquement BC (sans prix) et BL. */
  atelier: boolean
  canIssue: boolean
}

/**
 * Tous les documents d'une commande au même endroit.
 *
 * Chaque PDF se régénère à la demande depuis la base : pas de fichier stocké
 * qui pourrait diverger. Seule l'émission du bon de livraison est une action —
 * elle attribue des numéros définitifs, on ne la déclenche pas par une lecture.
 */
export function DocumentsPanel({ orderId, offerId, invoice, sheetCount, issuedCount, atelier, canIssue }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const blReady = sheetCount > 0 && issuedCount === sheetCount

  const issue = () => startTransition(async () => {
    const res = await issueDeliveryNotesForOrder({ orderId })
    if ('error' in res) { toast.error('Émission impossible', { description: res.error }); return }
    toast.success(
      res.issued ? `${res.issued} numéro${res.issued > 1 ? 's' : ''} attribué${res.issued > 1 ? 's' : ''}` : 'Déjà émis',
      { description: res.numbers.join(' · ') },
    )
    router.refresh()
    window.open(`/api/pdf/bon-livraison?order=${orderId}`, '_blank', 'noopener')
  })

  return (
    <div className="rounded-2xl border border-border/60 bg-card">
      <div className="px-4 py-3 border-b border-border/50">
        <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground">Documents</p>
      </div>
      <div className="divide-y divide-border/40">
        <Doc icon={ClipboardList} title="Bon de commande" sub={atelier ? 'Exemplaire atelier, sans prix' : 'Avec détail financier'}
             href={`/api/bon-commande/${orderId}`} />

        {!atelier && offerId && (
          <Doc icon={FileText} title="Devis" sub="Dernière position de la négociation" href={`/api/pdf/devis?id=${offerId}`} />
        )}

        <Doc
          icon={FileCheck2}
          title="Bon de livraison"
          sub={
            sheetCount === 0 ? 'Aucune fiche palette saisie'
            : blReady ? `${sheetCount} palette${sheetCount > 1 ? 's' : ''} · numéros émis`
            : `${issuedCount}/${sheetCount} numéro${sheetCount > 1 ? 's' : ''} émis — le document sortira « provisoire »`
          }
          href={`/api/pdf/bon-livraison?order=${orderId}`}
          action={canIssue && sheetCount > 0 && !blReady ? (
            <button
              onClick={issue}
              disabled={pending}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-60"
            >
              {pending ? <Loader2 size={13} className="animate-spin" /> : <FileCheck2 size={13} />}
              Émettre et ouvrir
            </button>
          ) : null}
        />

        {!atelier && (
          <Doc icon={Truck} title="Bon de transport" sub="À remettre au chauffeur" href={`/api/pdf/transport?order=${orderId}`} />
        )}

        {!atelier && invoice && (
          <Doc icon={Receipt} title={`Facture ${invoice.number}`} sub="Régénérée depuis la base à chaque ouverture"
               href={`/api/pdf/invoice?id=${invoice.id}`}
               action={<Link href={`/facturation/${invoice.id}`} className="text-xs text-primary hover:underline">Suivi</Link>} />
        )}
      </div>
    </div>
  )
}

function Doc({ icon: Icon, title, sub, href, action }: {
  icon: typeof FileText; title: string; sub: string; href: string; action?: React.ReactNode
}) {
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <Icon size={16} className="text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{sub}</p>
      </div>
      {action}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-xs text-foreground hover:bg-secondary/50 transition-colors shrink-0"
      >
        <Download size={13} />
        PDF
      </a>
    </div>
  )
}
