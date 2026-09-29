import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Package, FileDown } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { NegotiationThread } from '@/components/offres/NegotiationThread'
import { RespondPanel } from '@/components/offres/RespondPanel'
import { OfferStatusBadge } from '@/components/offres/OfferStatusBadge'
import { formatEuro, formatTonnage, priceBasisLabel } from '@/lib/utils/price'
import type { Role, OfferStatus, PriceBasis, OfferRound } from '@/types'

export const dynamic = 'force-dynamic'

export default async function OffreDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  const role = profile.role as Role
  const isAdmin = ['admin', 'secretaire', 'super_admin'].includes(role)

  const { data: offer, error } = await supabase
    .from('offers')
    .select(`
      id, status, quantity, price_basis, requested_date, notes, created_at, updated_at,
      company:companies ( id, name ),
      product:products ( id, name ),
      variety:varieties ( id, name ),
      format:formats ( id, name, weight_kg ),
      offer_rounds ( id, round_number, author_role, author_id, unit_price, message, created_at )
    `)
    .eq('id', params.id)
    .single()

  if (error || !offer) notFound()

  const company = offer.company as unknown as { id: string; name: string } | null
  const product = offer.product as unknown as { id: string; name: string } | null
  const variety = offer.variety as unknown as { id: string; name: string } | null
  const fmt = offer.format as unknown as { id: string; name: string; weight_kg: number | null } | null

  const rounds = ((offer.offer_rounds ?? []) as OfferRound[])
    .slice()
    .sort((a, b) => a.round_number - b.round_number)

  const lastRound = rounds[rounds.length - 1]
  const lastClientRound = [...rounds].reverse().find(r => r.author_role === 'client')
  const priceBasis = offer.price_basis as PriceBasis
  const status = offer.status as OfferStatus

  // Lien vers la commande si acceptée
  let orderId: string | null = null
  if (status === 'accepted') {
    const { data: order } = await supabase
      .from('orders')
      .select('id')
      .eq('offer_id', offer.id)
      .maybeSingle()
    orderId = order?.id ?? null
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/offres" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-serif text-2xl text-foreground">
              {product?.name ?? '—'}
              {variety && <span className="text-muted-foreground"> · {variety.name}</span>}
            </h1>
            <OfferStatusBadge status={status} />
          </div>
          {isAdmin && company && (
            <p className="text-sm text-muted-foreground mt-0.5">{company.name}</p>
          )}
        </div>
      </div>

      {/* Devis PDF : la dernière position de la négociation, numérotée à la première édition */}
      <a
        href={`/api/pdf/devis?id=${offer.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border bg-card text-sm text-foreground hover:bg-secondary/50 transition-colors"
      >
        <FileDown size={14} />
        Télécharger le devis
      </a>

      {/* Fiche récap */}
      <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/50">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-border/50">
          <Cell label="Contenant" value={fmt?.name ?? '—'} />
          <Cell label="Quantité" value={`${offer.quantity} unité${offer.quantity > 1 ? 's' : ''}`} />
          <Cell label="Tonnage" value={formatTonnage(offer.quantity, fmt?.weight_kg)} />
          <Cell label="Base de prix" value={priceBasisLabel(priceBasis)} />
        </div>
        {offer.requested_date && (
          <div className="px-4 py-3 text-sm text-muted-foreground">
            Date souhaitée :{' '}
            <strong className="text-foreground">
              {format(new Date(offer.requested_date), 'd MMMM yyyy', { locale: fr })}
            </strong>
          </div>
        )}
        {lastRound && (
          <div className="px-4 py-3 flex items-baseline gap-2">
            <span className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Dernier prix</span>
            <span className="font-serif text-xl text-foreground">{formatEuro(lastRound.unit_price)}</span>
            <span className="text-xs text-muted-foreground">Round {lastRound.round_number}</span>
          </div>
        )}
      </div>

      {/* Encart commande si acceptée */}
      {status === 'accepted' && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 flex items-start gap-3">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-800">Offre acceptée — commande créée</p>
            {orderId ? (
              <Link href={`/commandes/${orderId}`} className="text-sm text-emerald-700 hover:underline mt-0.5 inline-flex items-center gap-1">
                <Package size={13} />
                Voir la commande →
              </Link>
            ) : (
              <p className="text-xs text-emerald-600/70 mt-0.5">Traitement en cours…</p>
            )}
          </div>
        </div>
      )}

      {/* Fil de négociation */}
      <div>
        <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-4">
          Historique · {rounds.length} échange{rounds.length > 1 ? 's' : ''}
        </p>
        <NegotiationThread
          rounds={rounds}
          priceBasis={priceBasis}
          quantity={offer.quantity}
          weightKg={fmt?.weight_kg}
          companyName={company?.name ?? 'Client'}
        />
      </div>

      {/* Panneau d'actions */}
      {!['accepted', 'refused', 'cancelled'].includes(status) && (
        <div className="pt-2">
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-3">Actions</p>
          <RespondPanel
            offerId={offer.id}
            offerStatus={status}
            viewerRole={role}
            priceBasis={priceBasis}
            clientLastPrice={lastClientRound ? Number(lastClientRound.unit_price) : null}
          />
        </div>
      )}
    </div>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
    </div>
  )
}
