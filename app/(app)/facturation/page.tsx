import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { FilePlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { InvoiceStatusBadge } from '@/components/facturation/InvoiceStatusBadge'
import { formatEuro } from '@/lib/utils/price'
import type { Role, InvoiceStatus } from '@/types'

export const metadata = { title: 'Facturation — Chopin' }
export const dynamic = 'force-dynamic'

const STATUS_TABS: { value: string; label: string }[] = [
  { value: '',              label: 'Toutes' },
  { value: 'issued',       label: 'Émises' },
  { value: 'partially_paid', label: 'Partiel' },
  { value: 'overdue',      label: 'En retard' },
  { value: 'paid',         label: 'Payées' },
  { value: 'cancelled',    label: 'Annulées' },
]

export default async function FacturationPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const role = profile.role as Role
  if (!['admin', 'secretaire', 'super_admin'].includes(role)) redirect('/dashboard')

  const statusFilter = searchParams.status ?? ''

  // ── Requêtes parallèles ───────────────────────────────────────────────────
  let invoicesQuery = supabase
    .from('invoices')
    .select(`
      id, invoice_number, status, issued_at, due_date,
      subtotal, tax_amount, total, amount_paid,
      company:companies ( id, name ),
      order:orders ( id, product_name )
    `)
    .order('issued_at', { ascending: false })

  if (statusFilter) invoicesQuery = invoicesQuery.eq('status', statusFilter)

  // Commandes livrées sans facture (pour proposer de créer).
  // La liste des commandes déjà facturées est chargée à part : la déduire de
  // `invoices` fausserait le résultat dès qu'un onglet de statut est actif,
  // puisque cette liste-là est filtrée.
  const [{ data: invoices }, { data: deliveredOrders }, { data: allInvoicedOrders }] = await Promise.all([
    invoicesQuery,
    supabase
      .from('orders')
      .select('id, product_name, variety_name, total_price, created_at, company:companies(name)')
      .eq('status', 'delivered')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('invoices').select('order_id').neq('status', 'cancelled'),
  ])

  // PostgREST n'accepte pas de sous-requête NOT IN : l'exclusion se fait ici.
  const invoicedOrderIds = new Set(
    (allInvoicedOrders ?? []).map(i => i.order_id as string).filter(Boolean)
  )
  const eligibleOrders = (deliveredOrders ?? [])
    .filter(o => !invoicedOrderIds.has(o.id as string))
    .slice(0, 20)

  const remaining = (inv: { total: number; amount_paid: number }) =>
    Math.max(0, Number(inv.total) - Number(inv.amount_paid))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Facturation</h1>
          <p className="text-sm text-muted-foreground mt-1 uppercase tracking-[0.1em]">
            Émission · Suivi · Paiements
          </p>
        </div>
      </div>

      {/* Commandes éligibles à la facturation */}
      {eligibleOrders.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
          <p className="text-sm font-medium text-amber-800 mb-3">
            {eligibleOrders.length} commande{eligibleOrders.length > 1 ? 's' : ''} livrée{eligibleOrders.length > 1 ? 's' : ''} sans facture
          </p>
          <div className="space-y-2">
            {eligibleOrders.slice(0, 5).map(o => {
              const company = o.company as unknown as { name: string } | null
              return (
                <div key={o.id as string} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-foreground font-medium">
                    {company?.name ?? '—'} · {o.product_name as string}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{formatEuro(Number(o.total_price))}</span>
                    <Link
                      href={`/commandes/${o.id}?facture=1`}
                      className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium transition-colors"
                    >
                      <FilePlus size={12} />
                      Facturer
                    </Link>
                  </div>
                </div>
              )
            })}
            {eligibleOrders.length > 5 && (
              <p className="text-xs text-amber-600">+ {eligibleOrders.length - 5} autre(s)…</p>
            )}
          </div>
        </div>
      )}

      {/* Tabs statut */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_TABS.map(tab => (
          <Link
            key={tab.value}
            href={tab.value ? `/facturation?status=${tab.value}` : '/facturation'}
            className={`px-3 h-8 rounded-lg text-sm transition-colors ${
              statusFilter === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'border border-border text-muted-foreground hover:bg-secondary/50'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      {!(invoices ?? []).length ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-16 text-center">
          <p className="font-serif text-2xl text-muted-foreground">Aucune facture</p>
          {statusFilter && (
            <Link href="/facturation" className="text-sm text-primary hover:underline mt-2 inline-block">
              Voir toutes les factures
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/30">
                <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal">
                  N° facture
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal">
                  Client
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal hidden md:table-cell">
                  Émise le
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal hidden lg:table-cell">
                  Échéance
                </th>
                <th className="text-right px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal">
                  Total TTC
                </th>
                <th className="text-right px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal hidden sm:table-cell">
                  Reste dû
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {(invoices ?? []).map(inv => {
                const company = inv.company as unknown as { id: string; name: string } | null
                const resteDu = remaining(inv as { total: number; amount_paid: number })
                const isOverdue = inv.status === 'overdue'

                return (
                  <Link key={inv.id} href={`/facturation/${inv.id}`} legacyBehavior>
                    <tr className={`hover:bg-secondary/40 cursor-pointer transition-colors ${isOverdue ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3 font-mono text-sm text-foreground">
                        {inv.invoice_number}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {company?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {inv.issued_at
                          ? format(new Date(inv.issued_at), 'd MMM yyyy', { locale: fr })
                          : '—'}
                      </td>
                      <td className={`px-4 py-3 hidden lg:table-cell ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                        {inv.due_date
                          ? format(new Date(inv.due_date), 'd MMM yyyy', { locale: fr })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        {formatEuro(Number(inv.total))}
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        {resteDu > 0 ? (
                          <span className="text-amber-700">{formatEuro(resteDu)}</span>
                        ) : (
                          <span className="text-emerald-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <InvoiceStatusBadge status={inv.status as InvoiceStatus} />
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
