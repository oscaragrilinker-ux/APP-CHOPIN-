import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Package,
  FileText,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { OrderStatusBadge } from '@/components/commandes/OrderStatusBadge'
import { OfferStatusBadge } from '@/components/offres/OfferStatusBadge'
import { formatEuro, computeTTC } from '@/lib/utils/price'
import type { Role, OrderStatus, OfferStatus } from '@/types'

export const metadata = { title: 'Tableau de bord — Chopin' }
export const dynamic = 'force-dynamic'

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  accent?: 'green' | 'amber' | 'red' | 'default'
}) {
  const colors = {
    green: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
    default: 'text-primary bg-secondary',
  }
  const cls = colors[accent ?? 'default']
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 flex items-start gap-4">
      <div className={`rounded-xl p-2.5 shrink-0 ${cls}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        <p className="font-serif text-2xl text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  const role = profile.role as Role
  const isAdmin = ['admin', 'secretaire', 'super_admin'].includes(role)
  const isConditionnement = role === 'conditionnement'

  // ── Mois en cours ────────────────────────────────────────────────────────
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // ── Requêtes parallèles ──────────────────────────────────────────────────
  const [
    commandesActivesRes,
    offresPendingRes,
    caLivreRes,
    facturesRetardRes,
    recentCommandesRes,
    recentOffresRes,
  ] = await Promise.all([
    // Commandes actives (hors delivered/cancelled)
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['accepted', 'in_preparation', 'ready', 'shipped']),

    // Offres en attente de réponse admin
    isAdmin
      ? supabase.from('offers').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      : Promise.resolve({ count: 0, error: null }),

    // CA livré ce mois (total_price HT des commandes livrées)
    isAdmin
      ? supabase
          .from('orders')
          .select('total_price, tva_rate')
          .eq('status', 'delivered')
          .gte('updated_at', monthStart)
      : Promise.resolve({ data: [], error: null }),

    // Factures en retard (admin) · négociations ouvertes (client)
    isAdmin
      ? supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'overdue')
      : supabase
          .from('offers')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'counter_proposed']),

    // 5 dernières commandes
    supabase
      .from('orders')
      .select(`id, product_name, variety_name, status, created_at, company:companies(name)`)
      .order('created_at', { ascending: false })
      .limit(5),

    // 3 dernières offres (admin : en attente ; client : les siennes)
    isAdmin
      ? supabase
          .from('offers')
          .select(`id, status, created_at, company:companies(name), product:products(name)`)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(3)
      : supabase
          .from('offers')
          .select(`id, status, created_at, product:products(name)`)
          .order('created_at', { ascending: false })
          .limit(3),
  ])

  const commandesActives = commandesActivesRes.count ?? 0
  const offresPending = offresPendingRes.count ?? 0
  const caData = (caLivreRes.data ?? []) as { total_price: number; tva_rate: number | null }[]
  const caMois = caData.reduce((s, o) => s + computeTTC(Number(o.total_price), o.tva_rate), 0)
  // Même requête, deux lectures : compteur de retards côté Chopin,
  // compteur de négociations ouvertes côté client (RLS restreint aux siennes).
  const facturesRetard = isAdmin ? (facturesRetardRes.count ?? 0) : 0
  const offresEnCours = isAdmin ? 0 : (facturesRetardRes.count ?? 0)
  const recentCommandes = (recentCommandesRes.data ?? [])
  const recentOffres = (recentOffresRes.data ?? [])

  // ── Vue conditionnement simplifiée ───────────────────────────────────────
  if (isConditionnement) {
    // Le rôle conditionnement n'a aucune policy SELECT sur `orders` (volontaire,
    // migration 00004) : ses compteurs passent obligatoirement par la vue sans prix,
    // sinon ils restent bloqués à zéro.
    const countByStatus = (status: string) =>
      supabase
        .from('orders_for_conditionnement' as 'orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', status)

    const [aFaireRes, prepRes, pretsRes] = await Promise.all([
      countByStatus('accepted'),
      countByStatus('in_preparation'),
      countByStatus('ready'),
    ])

    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground mt-1 uppercase tracking-[0.1em]">
            Bonjour{profile.first_name ? `, ${profile.first_name}` : ''} · Suivi préparation
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            label="À préparer"
            value={String(aFaireRes.count ?? 0)}
            icon={FileText}
          />
          <KpiCard
            label="En préparation"
            value={String(prepRes.count ?? 0)}
            icon={Package}
            accent="amber"
          />
          <KpiCard
            label="Prêtes à expédier"
            value={String(pretsRes.count ?? 0)}
            icon={CheckCircle2}
            accent="green"
          />
        </div>

        <div>
          <Link
            href="/commandes"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
          >
            Voir toutes les commandes
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    )
  }

  // ── Vue client_pro ───────────────────────────────────────────────────────
  if (role === 'client_pro') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground mt-1 uppercase tracking-[0.1em]">
            Bonjour{profile.first_name ? `, ${profile.first_name}` : ''} · Votre espace Chopin
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KpiCard label="Commandes en cours" value={String(commandesActives)} icon={Package} />
          <KpiCard label="Offres en négociation" value={String(offresEnCours)} icon={FileText} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentList
            title="Mes commandes récentes"
            href="/commandes"
            items={recentCommandes.map(o => ({
              id: o.id as string,
              href: `/commandes/${o.id}`,
              label: o.product_name as string,
              sub: o.variety_name as string ?? '',
              badge: <OrderStatusBadge status={o.status as OrderStatus} />,
              date: o.created_at as string,
            }))}
          />
          <RecentList
            title="Mes offres récentes"
            href="/offres"
            items={recentOffres.map(o => ({
              id: o.id as string,
              href: `/offres/${o.id}`,
              label: (o.product as unknown as { name: string } | null)?.name ?? '—',
              sub: '',
              badge: <OfferStatusBadge status={o.status as OfferStatus} />,
              date: o.created_at as string,
            }))}
          />
        </div>
      </div>
    )
  }

  // ── Vue admin / secretaire / super_admin ─────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground mt-1 uppercase tracking-[0.1em]">
          Bonjour{profile.first_name ? `, ${profile.first_name}` : ''} · Vue d&apos;ensemble
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Commandes actives"
          value={String(commandesActives)}
          sub="en cours de traitement"
          icon={Package}
        />
        <KpiCard
          label="Offres en attente"
          value={String(offresPending)}
          sub="à traiter"
          icon={Clock}
          accent={offresPending > 0 ? 'amber' : 'default'}
        />
        <KpiCard
          label={`CA livré — ${format(now, 'MMMM yyyy', { locale: fr })}`}
          value={formatEuro(caMois)}
          sub="commandes livrées TTC"
          icon={TrendingUp}
          accent="green"
        />
        <KpiCard
          label="Factures en retard"
          value={String(facturesRetard)}
          sub="à relancer"
          icon={AlertCircle}
          accent={facturesRetard > 0 ? 'red' : 'default'}
        />
      </div>

      {/* Listes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentList
          title="Dernières commandes"
          href="/commandes"
          items={recentCommandes.map(o => {
            const company = o.company as unknown as { name: string } | null
            return {
              id: o.id as string,
              href: `/commandes/${o.id}`,
              label: o.product_name as string,
              sub: company?.name ?? '',
              badge: <OrderStatusBadge status={o.status as OrderStatus} />,
              date: o.created_at as string,
            }
          })}
        />
        <RecentList
          title="Offres en attente"
          href="/offres"
          items={recentOffres.map(o => {
            const company = (o as unknown as { company?: { name: string } | null }).company
            const product = o.product as unknown as { name: string } | null
            return {
              id: o.id as string,
              href: `/offres/${o.id}`,
              label: product?.name ?? '—',
              sub: company?.name ?? '',
              badge: <OfferStatusBadge status={o.status as OfferStatus} />,
              date: o.created_at as string,
            }
          })}
        />
      </div>

      {/* Liens rapides */}
      <div className="flex flex-wrap gap-3">
        <QuickLink href="/commandes" label="Toutes les commandes" />
        <QuickLink href="/offres" label="Toutes les offres" />
        <QuickLink href="/facturation" label="Facturation" />
        <QuickLink href="/clients" label="Clients" />
      </div>
    </div>
  )
}

// ── Sous-composants ────────────────────────────────────────────────────────

function RecentList({
  title,
  href,
  items,
}: {
  title: string
  href: string
  items: {
    id: string
    href: string
    label: string
    sub: string
    badge: React.ReactNode
    date: string
  }[]
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <p className="font-serif text-lg text-foreground">{title}</p>
        <Link href={href} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          Voir tout <ChevronRight size={12} />
        </Link>
      </div>
      {!items.length ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">Aucun élément</div>
      ) : (
        <ul className="divide-y divide-border/40">
          {items.map(item => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                  {item.sub && (
                    <p className="text-xs text-muted-foreground truncate">{item.sub}</p>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  {item.badge}
                  <span className="text-xs text-muted-foreground hidden sm:block whitespace-nowrap">
                    {format(new Date(item.date), 'd MMM', { locale: fr })}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border bg-card text-sm text-foreground hover:bg-secondary/50 transition-colors"
    >
      {label}
      <ChevronRight size={13} />
    </Link>
  )
}
