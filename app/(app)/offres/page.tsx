import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { OffersTable, type OfferRow } from '@/components/offres/OffersTable'
import Link from 'next/link'
import { formatEuro, priceBasisUnit } from '@/lib/utils/price'
import type { Role, OfferStatus, PriceBasis } from '@/types'
import { BRAND } from '@/lib/brand'

export const metadata = { title: `Négociations — ${BRAND.name}` }

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
    .is('archived_at', null)
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
            {isAdmin ? 'Propositions d\'achat clients · Gestion' : `Vos propositions d'achat · ${BRAND.name}`}
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
        <OffersTable
          staff={isAdmin}
          rows={sorted.map((offer): OfferRow => {
            const rounds = (offer.offer_rounds ?? []) as { unit_price: number; round_number: number }[]
            const lastRound = [...rounds].sort((a, b) => b.round_number - a.round_number)[0]
            const company = offer.company as unknown as { name: string } | null
            const product = offer.product as unknown as { name: string } | null
            const variety = offer.variety as unknown as { name: string } | null
            const fmt = offer.format as unknown as { name: string } | null
            return {
              id: offer.id,
              companyName: company?.name ?? null,
              productName: product?.name ?? '—',
              varietyName: variety?.name ?? null,
              formatName: fmt?.name ?? null,
              quantity: offer.quantity,
              lastPrice: lastRound ? formatEuro(lastRound.unit_price) : null,
              basisUnit: priceBasisUnit(offer.price_basis as PriceBasis),
              status: offer.status as OfferStatus,
              createdAt: format(new Date(offer.created_at), 'd MMM yyyy', { locale: fr }),
              needsAction: isAdmin ? offer.status === 'pending' : offer.status === 'counter_proposed',
            }
          })}
        />
      )}
    </div>
  )
}
