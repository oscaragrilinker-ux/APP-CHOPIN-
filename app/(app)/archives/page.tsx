import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ArchivesFilters } from '@/components/archives/ArchivesFilters'
import { ArchivedOffers, type ArchivedGroup, type ArchivedOffer } from '@/components/archives/ArchivedOffers'
import type { OfferStatus } from '@/types'
import { OrderStatusBadge } from '@/components/commandes/OrderStatusBadge'
import { formatEuro, computeTTC } from '@/lib/utils/price'
import type { Role, OrderStatus } from '@/types'
import { BRAND } from '@/lib/brand'

export const metadata = { title: `Archives — ${BRAND.name}` }

const PAGE_SIZE = 25

export default async function ArchivesPage({
  searchParams,
}: {
  searchParams: {
    q?: string
    company?: string
    status?: string
    from?: string
    to?: string
    page?: string
  }
}) {
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
  if (!['admin', 'secretaire', 'super_admin'].includes(role)) redirect('/dashboard')

  // ── Paramètres URL ────────────────────────────────────────────────────────
  const q         = (searchParams.q ?? '').trim()
  const companyId = searchParams.company ?? ''
  const status    = searchParams.status ?? ''
  const dateFrom  = searchParams.from ?? ''
  const dateTo    = searchParams.to ?? ''
  const page      = Math.max(1, Number(searchParams.page ?? '1'))

  // ── Requêtes parallèles ───────────────────────────────────────────────────
  let ordersQuery = supabase
    .from('orders')
    .select(`
      id, product_name, variety_name, format_name,
      quantity, total_price, tva_rate, status,
      delivery_date, created_at, offer_id,
      company:companies ( id, name ),
      bons_de_commande ( bc_number, bc_date )
    `)
    .in('status', status ? [status] : ['delivered', 'cancelled'])
    .order('created_at', { ascending: false })

  if (companyId) ordersQuery = ordersQuery.eq('company_id', companyId)
  if (dateFrom)  ordersQuery = ordersQuery.gte('created_at', dateFrom)
  if (dateTo)    ordersQuery = ordersQuery.lte('created_at', dateTo + 'T23:59:59Z')

  const [{ data: rawOrders }, { data: companies }, { data: archivedRaw }] = await Promise.all([
    ordersQuery,
    supabase.from('companies').select('id, name').order('name'),
    supabase
      .from('offers')
      .select(`id, status, quantity, created_at, archived_at, quote_number, company_id,
               company:companies ( id, name ), product:products ( name ), variety:varieties ( name ),
               format:formats ( name ), offer_rounds ( unit_price, round_number )`)
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false }),
  ])

  // ── Offres archivées : par client, puis par mois (récent en premier) ────────
  const byCompany = new Map<string, ArchivedGroup>()
  for (const o of archivedRaw ?? []) {
    const company = o.company as unknown as { id: string; name: string } | null
    const key = company?.name ?? 'Sans client'
    const rounds = (o.offer_rounds ?? []) as { unit_price: number; round_number: number }[]
    const last = [...rounds].sort((a, b) => b.round_number - a.round_number)[0]
    const created = new Date(o.created_at)
    const month = format(created, 'MMMM yyyy', { locale: fr })
    const row: ArchivedOffer = {
      id: o.id,
      productName: (o.product as unknown as { name: string } | null)?.name ?? '—',
      varietyName: (o.variety as unknown as { name: string } | null)?.name ?? null,
      formatName: (o.format as unknown as { name: string } | null)?.name ?? null,
      quantity: o.quantity,
      lastPrice: last ? formatEuro(last.unit_price) : null,
      status: o.status as OfferStatus,
      quoteNumber: (o.quote_number as string | null) ?? null,
      createdAtIso: o.created_at,
      createdAtLabel: format(created, 'd MMM yyyy', { locale: fr }),
      archivedAtLabel: format(new Date(o.archived_at as string), 'd MMM yyyy', { locale: fr }),
    }
    const group = byCompany.get(key) ?? { companyId: company?.id ?? null, companyName: key, months: [], total: 0 }
    let m = group.months.find(x => x.label === month)
    if (!m) { m = { label: month, offers: [] }; group.months.push(m) }
    m.offers.push(row); group.total += 1
    byCompany.set(key, group)
  }
  const archivedGroups = Array.from(byCompany.values()).sort((a, b) => a.companyName.localeCompare(b.companyName, 'fr'))
  for (const g of archivedGroups) {
    for (const m of g.months) m.offers.sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso))
    g.months.sort((a, b) => (b.offers[0]?.createdAtIso ?? '').localeCompare(a.offers[0]?.createdAtIso ?? ''))
  }

  // ── Filtre texte côté serveur JS ──────────────────────────────────────────
  const filtered = (rawOrders ?? []).filter(o => {
    if (!q) return true
    const qLow = q.toLowerCase()
    const company = o.company as unknown as { name: string } | null
    return (
      o.product_name.toLowerCase().includes(qLow) ||
      (o.variety_name ?? '').toLowerCase().includes(qLow) ||
      (company?.name ?? '').toLowerCase().includes(qLow)
    )
  })

  // ── Pagination ────────────────────────────────────────────────────────────
  const total      = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (q)         params.set('q',       q)
    if (companyId) params.set('company', companyId)
    if (status)    params.set('status',  status)
    if (dateFrom)  params.set('from',    dateFrom)
    if (dateTo)    params.set('to',      dateTo)
    params.set('page', String(p))
    return `/archives?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Archives</h1>
        <p className="text-sm text-muted-foreground mt-1 uppercase tracking-[0.1em]">
          Offres archivées par client · Commandes terminées
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-xl text-foreground">Offres archivées</h2>
          <span className="text-xs text-muted-foreground">
            {archivedGroups.reduce((n, g) => n + g.total, 0)} offre{archivedGroups.reduce((n, g) => n + g.total, 0) > 1 ? 's' : ''} · {archivedGroups.length} client{archivedGroups.length > 1 ? 's' : ''}
          </span>
        </div>
        <ArchivedOffers groups={archivedGroups} />
      </section>

      <h2 className="font-serif text-xl text-foreground pt-4">Commandes terminées</h2>

      <ArchivesFilters
        companies={(companies ?? []) as { id: string; name: string }[]}
        q={q}
        companyId={companyId}
        status={status}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />

      {/* Compteur */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total === 0
            ? 'Aucun résultat'
            : `${total} commande${total > 1 ? 's' : ''} · page ${safePage} / ${totalPages}`}
        </span>
        {total > 0 && (
          <span className="font-medium text-foreground">
            CA TTC :{' '}
            {formatEuro(
              filtered.reduce((sum, o) => sum + computeTTC(o.total_price ?? 0, o.tva_rate), 0),
            )}
          </span>
        )}
      </div>

      {!paginated.length ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-16 text-center">
          <p className="font-serif text-2xl text-muted-foreground">Aucune commande archivée</p>
          {(q || companyId || status || dateFrom || dateTo) && (
            <p className="text-sm text-muted-foreground mt-2">
              Modifiez ou réinitialisez les filtres pour élargir la recherche.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/30">
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal hidden lg:table-cell">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal">
                    Client
                  </th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal">
                    Produit
                  </th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal hidden sm:table-cell">
                    Qté
                  </th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal hidden md:table-cell">
                    Montant TTC
                  </th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal">
                    Statut
                  </th>
                  <th className="px-4 py-3 hidden md:table-cell" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {paginated.map(o => {
                  const company = o.company as unknown as { id: string; name: string } | null
                  const bc = o.bons_de_commande as unknown as { bc_number: number; bc_date: string } | null
                  const ttc = computeTTC(o.total_price ?? 0, o.tva_rate)

                  return (
                    <tr key={o.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                        {format(new Date(o.created_at), 'd MMM yyyy', { locale: fr })}
                      </td>
                      <td className="px-4 py-3">
                        {company ? (
                          <Link
                            href={`/clients/${company.id}`}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {company.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
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
                          {o.offer_id && (
                            <Link
                              href={`/offres/${o.offer_id}`}
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <FileText size={12} />
                              Fil
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {safePage} sur {totalPages}
              </span>
              <div className="flex items-center gap-2">
                {safePage > 1 && (
                  <Link
                    href={pageUrl(safePage - 1)}
                    className="inline-flex items-center gap-1 px-3 h-8 rounded-md border border-border text-sm hover:bg-secondary/50 transition-colors"
                  >
                    <ChevronLeft size={14} />
                    Précédent
                  </Link>
                )}
                {safePage < totalPages && (
                  <Link
                    href={pageUrl(safePage + 1)}
                    className="inline-flex items-center gap-1 px-3 h-8 rounded-md border border-border text-sm hover:bg-secondary/50 transition-colors"
                  >
                    Suivant
                    <ChevronRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
