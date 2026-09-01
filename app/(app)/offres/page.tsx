import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { OfferStatusBadge } from '@/components/offres/OfferStatusBadge'
import { formatEuro, priceBasisUnit } from '@/lib/utils/price'
import type { Role, OfferStatus, PriceBasis } from '@/types'

export const metadata = { title: 'Négociations — Chopin' }

export default async function OffresPage() {
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

  const query = supabase
    .from('offers')
    .select(`
      id, status, quantity, price_basis, requested_date, created_at,
      company:companies ( id, name ),
      product:products ( id, name ),
      variety:varieties ( id, name ),
      format:formats ( id, name, weight_kg ),
      offer_rounds ( unit_price, round_number )
    `)
    .order('updated_at', { ascending: false })

  const { data: offers, error } = await query

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <p className="text-sm text-destructive">Impossible de charger les négociations.</p>
      </div>
    )
  }

  // Tri admin : pending en premier
  const sorted = isAdmin
    ? [...(offers ?? [])].sort((a, b) => {
        const order: Record<string, number> = { pending: 0, counter_proposed: 1, accepted: 2, refused: 3, cancelled: 4 }
        return (order[a.status] ?? 5) - (order[b.status] ?? 5)
      })
    : (offers ?? [])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Négociations</h1>
          <p className="text-sm text-muted-foreground mt-1 uppercase tracking-[0.1em]">
            {isAdmin ? 'Propositions d\'achat clients · Gestion' : 'Vos propositions d\'achat · Chopin Conditionnement'}
          </p>
        </div>
        {role === 'client_pro' && (
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
          >
            Nouvelle offre
          </Link>
        )}
      </div>

      {!sorted.length ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-16 text-center">
          <p className="font-serif text-2xl text-muted-foreground mb-2">
            {isAdmin ? "Aucune négociation en cours" : "Vous n'avez pas encore soumis d'offre"}
          </p>
          {role === 'client_pro' && (
            <Link href="/catalogue" className="text-sm text-primary hover:underline mt-2 inline-block">
              Découvrir le catalogue →
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/30">
                {isAdmin && (
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal">
                    Client
                  </th>
                )}
                <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal">
                  Produit
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal hidden sm:table-cell">
                  Qté
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal hidden md:table-cell">
                  Dernier prix
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal">
                  Statut
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal hidden lg:table-cell">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {sorted.map((offer) => {
                const rounds = (offer.offer_rounds ?? []) as { unit_price: number; round_number: number }[]
                const lastRound = rounds.sort((a, b) => b.round_number - a.round_number)[0]
                const company = offer.company as unknown as { name: string } | null
                const product = offer.product as unknown as { name: string } | null
                const variety = offer.variety as unknown as { name: string } | null
                const fmt = offer.format as unknown as { name: string; weight_kg: number | null } | null

                const needsAction = isAdmin
                  ? offer.status === 'pending'
                  : offer.status === 'counter_proposed'

                return (
                  <Link key={offer.id} href={`/offres/${offer.id}`} legacyBehavior>
                    <tr
                      className={`hover:bg-secondary/40 cursor-pointer transition-colors ${
                        needsAction ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      {isAdmin && (
                        <td className="px-4 py-3 text-foreground font-medium">
                          {company?.name ?? '—'}
                          {needsAction && (
                            <span className="ml-2 inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{product?.name ?? '—'}</p>
                        {variety && (
                          <p className="text-xs text-muted-foreground">{variety.name} · {fmt?.name ?? '—'}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {offer.quantity}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {lastRound ? (
                          <span className="text-foreground">
                            {formatEuro(lastRound.unit_price)}
                            <span className="text-muted-foreground text-xs ml-1">
                              {priceBasisUnit(offer.price_basis as PriceBasis)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <OfferStatusBadge status={offer.status as OfferStatus} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {format(new Date(offer.created_at), 'd MMM yyyy', { locale: fr })}
                      </td>
                    </tr>
                  </Link>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
