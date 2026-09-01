import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail, MapPin, Download, FileText, User } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { OrderStatusBadge } from '@/components/commandes/OrderStatusBadge'
import { OfferStatusBadge } from '@/components/offres/OfferStatusBadge'
import { CompanyDialog } from '@/components/clients/CompanyDialog'
import { ToggleCompanyActive } from '@/components/clients/ToggleCompanyActive'
import { InviteDialog } from '@/components/invitations/InviteDialog'
import { formatEuro, computeTTC, priceBasisUnit } from '@/lib/utils/price'
import { hasPermission, type PermissionOverrides } from '@/lib/permissions'
import type { Role, OrderStatus, OfferStatus, PriceBasis } from '@/types'

export const dynamic = 'force-dynamic'

function fmtDate(d: string | null) {
  if (!d) return '—'
  return format(new Date(d), 'd MMM yyyy', { locale: fr })
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-5 py-4">
      <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground mb-1">{label}</p>
      <p className="font-serif text-2xl text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      <h2 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground">
        {children}
      </h2>
      {count !== undefined && (
        <span className="text-[10px] text-muted-foreground/60">{count}</span>
      )}
    </div>
  )
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permission_overrides')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  const role = profile.role as Role
  if (!['admin', 'secretaire', 'super_admin'].includes(role)) redirect('/dashboard')

  const overrides = (profile.permission_overrides ?? {}) as PermissionOverrides
  const canEdit = hasPermission(role, 'clients:edit_any', overrides)
  const canDisable = hasPermission(role, 'clients:disable', overrides)
  const canInvite = hasPermission(role, 'clients:invite', overrides)

  const [
    { data: company, error: companyError },
    { data: clientUsers },
    { data: orders },
    { data: offers },
  ] = await Promise.all([
    supabase
      .from('companies')
      .select('*')
      .eq('id', params.id)
      .single(),

    supabase
      .from('client_users')
      .select('user_id, is_primary, profiles(id, first_name, last_name, phone)')
      .eq('company_id', params.id),

    supabase
      .from('orders')
      .select(`
        id, product_name, variety_name, format_name,
        quantity, unit_price, total_price, tva_rate, price_basis,
        status, delivery_date, created_at,
        bons_de_commande ( bc_number, bc_date )
      `)
      .eq('company_id', params.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('offers')
      .select(`
        id, status, quantity, price_basis, created_at,
        product:products ( name ),
        variety:varieties ( name ),
        format:formats ( name ),
        offer_rounds ( unit_price, round_number )
      `)
      .eq('company_id', params.id)
      .order('created_at', { ascending: false }),
  ])

  if (companyError || !company) notFound()

  // ── Indicateurs CA ───────────────────────────────────────────────────────
  const allOrders = (orders ?? []) as {
    id: string
    product_name: string
    variety_name: string
    format_name: string
    quantity: number
    total_price: number
    tva_rate: number | null
    price_basis: string | null
    status: string
    delivery_date: string | null
    created_at: string
    bons_de_commande: unknown
  }[]

  const deliveredOrders = allOrders.filter(o => o.status === 'delivered')
  const caTtc = deliveredOrders.reduce(
    (sum, o) => sum + computeTTC(o.total_price ?? 0, o.tva_rate),
    0,
  )
  const totalOrders = allOrders.filter(o => o.status !== 'cancelled').length
  const avgBasket = deliveredOrders.length ? caTtc / deliveredOrders.length : 0

  return (
    <div className="space-y-8 max-w-4xl">
      {/* ── En-tête ── */}
      <div>
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Clients
        </Link>

        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-serif text-3xl text-foreground">{company.name}</h1>
              {!company.is_active && (
                <span className="text-xs uppercase tracking-wide text-muted-foreground border border-border rounded px-2 py-0.5">
                  Inactif
                </span>
              )}
            </div>
            {company.siren && (
              <p className="text-sm text-muted-foreground mt-0.5">SIREN {company.siren}</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canInvite && <InviteDialog company={{ id: company.id, name: company.name }} />}
            {canEdit && (
              <CompanyDialog
                mode="edit"
                company={{
                  id: company.id,
                  name: company.name,
                  siren: company.siren ?? '',
                  email: company.email ?? '',
                  phone: company.phone ?? '',
                  address_line1: company.address_line1 ?? '',
                  address_line2: company.address_line2 ?? '',
                  postal_code: company.postal_code ?? '',
                  city: company.city ?? '',
                  payment_terms: company.payment_terms ?? 30,
                  notes: company.notes ?? '',
                }}
              />
            )}
            {canDisable && (
              <ToggleCompanyActive id={company.id} isActive={!!company.is_active} />
            )}
          </div>
        </div>
      </div>

      {/* ── Coordonnées + Contacts ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
          <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground">
            Coordonnées
          </p>
          {(company.address_line1 || company.city) && (
            <div className="flex gap-2 text-sm">
              <MapPin size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
              <div className="text-foreground">
                {company.address_line1 && <p>{company.address_line1}</p>}
                {company.address_line2 && <p>{company.address_line2}</p>}
                {(company.postal_code || company.city) && (
                  <p>{[company.postal_code, company.city].filter(Boolean).join(' ')}</p>
                )}
                {company.country && company.country !== 'France' && <p>{company.country}</p>}
              </div>
            </div>
          )}
          {company.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail size={14} className="shrink-0 text-muted-foreground" />
              <a
                href={`mailto:${company.email}`}
                className="text-foreground hover:text-primary transition-colors"
              >
                {company.email}
              </a>
            </div>
          )}
          {company.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone size={14} className="shrink-0 text-muted-foreground" />
              <a
                href={`tel:${company.phone}`}
                className="text-foreground hover:text-primary transition-colors"
              >
                {company.phone}
              </a>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Délai de paiement :{' '}
            <span className="text-foreground">{company.payment_terms ?? 30} j.</span>
          </p>
          {company.notes && (
            <p className="text-sm text-muted-foreground border-t border-border/50 pt-3">
              {company.notes}
            </p>
          )}
          <p className="text-xs text-muted-foreground/60">
            Client depuis le {fmtDate(company.created_at)}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
          <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground">
            Contacts
            {(clientUsers ?? []).length > 0 && (
              <span className="ml-1.5 text-muted-foreground/60 normal-case font-normal">
                ({clientUsers!.length})
              </span>
            )}
          </p>
          {!(clientUsers ?? []).length ? (
            <p className="text-sm text-muted-foreground/60">Aucun utilisateur rattaché</p>
          ) : (
            <div className="space-y-3">
              {(clientUsers ?? []).map(cu => {
                const p = cu.profiles as unknown as {
                  id: string
                  first_name: string | null
                  last_name: string | null
                  phone: string | null
                } | null
                if (!p) return null
                return (
                  <div key={cu.user_id} className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                      <User size={13} className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {[p.first_name, p.last_name].filter(Boolean).join(' ') || 'Nom inconnu'}
                        {cu.is_primary && (
                          <span className="ml-1.5 text-[10px] text-accent font-normal">
                            Principal
                          </span>
                        )}
                      </p>
                      {p.phone && (
                        <p className="text-xs text-muted-foreground">{p.phone}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── KPIs CA ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <KpiCard
          label="CA TTC livré"
          value={caTtc > 0 ? formatEuro(caTtc) : '—'}
          sub={
            deliveredOrders.length
              ? `${deliveredOrders.length} commande${deliveredOrders.length > 1 ? 's' : ''} livrée${deliveredOrders.length > 1 ? 's' : ''}`
              : 'Aucune commande livrée'
          }
        />
        <KpiCard
          label="Commandes actives"
          value={String(totalOrders)}
          sub={totalOrders === 0 ? 'Aucune commande' : undefined}
        />
        <KpiCard
          label="Panier moyen TTC"
          value={avgBasket > 0 ? formatEuro(avgBasket) : '—'}
          sub="sur commandes livrées"
        />
      </div>

      {/* ── Commandes ── */}
      <div>
        <SectionTitle count={allOrders.length}>Commandes</SectionTitle>
        {!allOrders.length ? (
          <p className="text-sm text-muted-foreground">Aucune commande pour ce client.</p>
        ) : (
          <div className="rounded-2xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/30">
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal">Produit</th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal hidden sm:table-cell">Qté</th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal hidden md:table-cell">Montant TTC</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal">Statut</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3 hidden md:table-cell" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {allOrders.map(o => {
                  const bc = o.bons_de_commande as unknown as { bc_number: number; bc_date: string } | null
                  const ttc = computeTTC(o.total_price ?? 0, o.tva_rate)
                  return (
                    <tr key={o.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{o.product_name}</p>
                        {(o.variety_name || o.format_name) && (
                          <p className="text-xs text-muted-foreground">
                            {[o.variety_name, o.format_name].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
                        {o.quantity}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="font-medium text-foreground">{formatEuro(ttc)}</span>
                        <span className="text-xs text-muted-foreground ml-1">TTC</span>
                      </td>
                      <td className="px-4 py-3">
                        <OrderStatusBadge status={o.status as OrderStatus} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {fmtDate(o.created_at)}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-3 justify-end">
                          <Link
                            href={`/commandes/${o.id}`}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <FileText size={12} />
                            Détail
                          </Link>
                          {bc && (
                            <a
                              href={`/api/bon-commande/${o.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Download size={12} />
                              BC
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Négociations ── */}
      <div>
        <SectionTitle count={(offers ?? []).length}>Négociations</SectionTitle>
        {!(offers ?? []).length ? (
          <p className="text-sm text-muted-foreground">Aucune négociation pour ce client.</p>
        ) : (
          <div className="rounded-2xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/30">
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal">Produit</th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal hidden sm:table-cell">Qté</th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal hidden md:table-cell">Dernier prix</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal">Statut</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3 hidden md:table-cell" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {(offers ?? []).map(offer => {
                  const product = offer.product as unknown as { name: string } | null
                  const variety = offer.variety as unknown as { name: string } | null
                  const fmt = offer.format as unknown as { name: string } | null
                  const rounds = (
                    (offer.offer_rounds ?? []) as { unit_price: number; round_number: number }[]
                  ).sort((a, b) => b.round_number - a.round_number)
                  const lastRound = rounds[0]

                  return (
                    <tr key={offer.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{product?.name ?? '—'}</p>
                        {(variety || fmt) && (
                          <p className="text-xs text-muted-foreground">
                            {[variety?.name, fmt?.name].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
                        {offer.quantity}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
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
                        {fmtDate(offer.created_at)}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Link
                          href={`/offres/${offer.id}`}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <FileText size={12} />
                          Fil
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
