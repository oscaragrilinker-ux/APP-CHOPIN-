import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { OrderStatusBadge } from '@/components/commandes/OrderStatusBadge'
import { formatEuro, formatTonnage } from '@/lib/utils/price'
import type { Role, OrderStatus } from '@/types'
import { BRAND } from '@/lib/brand'

export const metadata = { title: `Commandes — ${BRAND.name}` }

export default async function CommandesPage() {
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
  const isConditionnement = role === 'conditionnement'

  let orders: Record<string, unknown>[] = []
  let fetchError: string | null = null

  if (isConditionnement) {
    // Vue sans prix — filtre les commandes actives uniquement
    const { data, error } = await supabase
      .from('orders_for_conditionnement' as 'orders')
      .select('id, product_name, variety_name, format_name, quantity, status, delivery_date, created_at, company_name')
      .in('status', ['accepted', 'in_preparation', 'ready'])
      .order('created_at', { ascending: true })

    if (error) fetchError = error.message
    else orders = (data ?? []) as Record<string, unknown>[]
  } else {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, product_name, variety_name, format_name, quantity, unit_price, total_price,
        status, delivery_date, created_at,
        company:companies ( id, name ),
        offer:offers ( id, price_basis )
      `)
      .order('created_at', { ascending: false })

    if (error) fetchError = error.message
    else orders = (data ?? []) as Record<string, unknown>[]
  }

  if (fetchError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <p className="text-sm text-destructive">Impossible de charger les commandes.</p>
      </div>
    )
  }

  const title = isConditionnement
    ? 'Commandes à préparer'
    : isAdmin
    ? 'Toutes les commandes'
    : 'Mes commandes'

  const subtitle = isConditionnement
    ? 'Préparation palette · Sans informations tarifaires'
    : isAdmin
    ? 'Suivi des commandes · Gestion'
    : `Suivi de vos commandes · ${BRAND.name}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1 uppercase tracking-[0.1em]">{subtitle}</p>
      </div>

      {!orders.length ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-16 text-center">
          <p className="font-serif text-2xl text-muted-foreground">
            {isConditionnement ? 'Aucune commande à préparer' : 'Aucune commande'}
          </p>
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
                {!isConditionnement && (
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal hidden md:table-cell">
                    Total
                  </th>
                )}
                <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal">
                  Statut
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal hidden lg:table-cell">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {orders.map((order) => {
                const company = order.company as { name: string } | null
                const companyName = (company?.name ?? order.company_name ?? '—') as string
                const qty = order.quantity as number
                const formatName = order.format_name as string

                return (
                  <Link key={order.id as string} href={`/commandes/${order.id}`} legacyBehavior>
                    <tr className="hover:bg-secondary/40 cursor-pointer transition-colors">
                      {isAdmin && (
                        <td className="px-4 py-3 text-foreground font-medium">{companyName}</td>
                      )}
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{order.product_name as string}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.variety_name as string} · {formatName}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {qty}
                        <span className="text-xs ml-1 text-muted-foreground/60">
                          {formatTonnage(qty, null).replace(/^\d+ /, '')}
                        </span>
                      </td>
                      {!isConditionnement && (
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="font-medium text-foreground">
                            {formatEuro(order.total_price as number)}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <OrderStatusBadge status={order.status as OrderStatus} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {format(new Date(order.created_at as string), 'd MMM yyyy', { locale: fr })}
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
