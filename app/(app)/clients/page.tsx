import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { ClientSearch } from '@/components/clients/ClientSearch'
import { CompanyDialog } from '@/components/clients/CompanyDialog'
import { formatEuro, computeTTC } from '@/lib/utils/price'
import { hasPermission, type PermissionOverrides } from '@/lib/permissions'
import type { Role } from '@/types'

export const metadata = { title: 'Clients — Chopin' }

type CompanyStats = {
  id: string
  name: string
  siren: string | null
  city: string | null
  is_active: boolean
  orderCount: number
  caTtc: number
  lastActivity: string | null
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { q?: string; sort?: string }
}) {
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
  const canCreate = hasPermission(role, 'clients:create', overrides)

  const [{ data: companies }, { data: orders }] = await Promise.all([
    supabase
      .from('companies')
      .select('id, name, siren, city, is_active')
      .order('name'),
    supabase
      .from('orders')
      .select('id, company_id, total_price, tva_rate, status, updated_at'),
  ])

  // Agrégation CA TTC + stats par entreprise
  const orderMap = new Map<string, typeof orders>()
  for (const o of (orders ?? [])) {
    const list = orderMap.get(o.company_id) ?? []
    list.push(o)
    orderMap.set(o.company_id, list)
  }

  let rows: CompanyStats[] = (companies ?? []).map(c => {
    const co = orderMap.get(c.id) ?? []
    const delivered = co.filter(o => o.status === 'delivered')
    const caTtc = delivered.reduce(
      (sum, o) => sum + computeTTC(o.total_price ?? 0, o.tva_rate),
      0,
    )
    const dates = co.map(o => o.updated_at).filter(Boolean) as string[]
    const lastActivity = dates.length ? dates.sort().at(-1)! : null

    return {
      ...c,
      orderCount: co.filter(o => o.status !== 'cancelled').length,
      caTtc,
      lastActivity,
    }
  })

  // Filtre texte
  const q = (searchParams.q ?? '').trim().toLowerCase()
  if (q) {
    rows = rows.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.city ?? '').toLowerCase().includes(q),
    )
  }

  // Tri
  const sort = searchParams.sort ?? 'activity'
  if (sort === 'name') {
    rows.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  } else if (sort === 'ca') {
    rows.sort((a, b) => b.caTtc - a.caTtc)
  } else if (sort === 'orders') {
    rows.sort((a, b) => b.orderCount - a.orderCount)
  } else {
    rows.sort((a, b) => {
      if (!a.lastActivity && !b.lastActivity) return 0
      if (!a.lastActivity) return 1
      if (!b.lastActivity) return -1
      return b.lastActivity.localeCompare(a.lastActivity)
    })
  }

  const activeCount = rows.filter(r => r.is_active).length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Clients professionnels</h1>
          <p className="text-sm text-muted-foreground mt-1 uppercase tracking-[0.1em]">
            {activeCount} client{activeCount !== 1 ? 's' : ''} actif{activeCount !== 1 ? 's' : ''} · Gestion relation client
          </p>
        </div>
        {canCreate && <CompanyDialog mode="create" />}
      </div>

      <ClientSearch q={searchParams.q} sort={searchParams.sort} />

      {!rows.length ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-16 text-center">
          <p className="font-serif text-2xl text-muted-foreground">
            {q ? 'Aucun client ne correspond à cette recherche' : 'Aucune entreprise cliente'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/30">
                <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal">
                  Entreprise
                </th>
                <th className="text-right px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal hidden sm:table-cell">
                  Commandes
                </th>
                <th className="text-right px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal hidden md:table-cell">
                  CA TTC livré
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground font-normal hidden lg:table-cell">
                  Dernière activité
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {rows.map(c => (
                <Link key={c.id} href={`/clients/${c.id}`} legacyBehavior>
                  <tr className="hover:bg-secondary/40 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{c.name}</p>
                        {!c.is_active && (
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground border border-border rounded px-1.5 py-0.5">
                            Inactif
                          </span>
                        )}
                      </div>
                      {c.siren && (
                        <p className="text-xs text-muted-foreground mt-0.5">SIREN {c.siren}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
                      {c.orderCount > 0 ? c.orderCount : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      {c.caTtc > 0 ? (
                        <span className="font-medium text-foreground">{formatEuro(c.caTtc)}</span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {c.lastActivity
                        ? format(new Date(c.lastActivity), 'd MMM yyyy', { locale: fr })
                        : <span className="text-muted-foreground/50">—</span>}
                    </td>
                  </tr>
                </Link>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
