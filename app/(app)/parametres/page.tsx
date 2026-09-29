import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Users, Settings, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'
import { BRAND } from '@/lib/brand'
import { getDocumentSettings } from '@/lib/documents/settings'
import { DocumentSettingsForm } from '@/components/parametres/DocumentSettingsForm'

export const metadata = { title: `Paramètres — ${BRAND.name}` }

export default async function ParametresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const role = profile.role as Role
  if (!['admin', 'super_admin'].includes(role)) redirect('/dashboard')

  const documentSettings = await getDocumentSettings()

  // Stats générales
  const [
    { count: nbProduits },
    { count: nbFormats },
    { count: nbClients },
    { count: nbUtilisateurs },
  ] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('formats').select('id', { count: 'exact', head: true }),
    supabase.from('companies').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ])

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Paramètres</h1>
        <p className="text-sm text-muted-foreground mt-1 uppercase tracking-[0.1em]">
          Configuration de l&apos;application · {BRAND.legalName}
        </p>
      </div>

      {/* Identité */}
      <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/50">
        <div className="px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Entreprise</p>
          <p className="text-sm font-medium text-foreground mt-0.5">{BRAND.legalName}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Préfixe factures</p>
          <p className="font-mono text-sm text-foreground mt-0.5">CHOP-AAAA-NNNN</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Délai paiement par défaut</p>
          <p className="text-sm font-medium text-foreground mt-0.5">30 jours (configurable par client)</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Version application</p>
          <p className="text-sm font-mono text-muted-foreground mt-0.5">v0.1 — APP CHOPIN</p>
        </div>
      </div>

      {/* Mentions des documents — devis, factures, bons */}
      <div>
        <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-1">Mentions des documents</p>
        <p className="text-sm text-muted-foreground mb-4">
          Reprises sur chaque devis, facture, bon de livraison et bon de transport dès l&apos;enregistrement.
        </p>
        <DocumentSettingsForm initial={documentSettings} />
      </div>

      {/* Stats catalogue */}
      <div>
        <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-3">Données de référence</p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Produits actifs"
            value={String(nbProduits ?? 0)}
            icon={BookOpen}
            href="/catalogue"
          />
          <StatCard
            label="Formats de conditionnement"
            value={String(nbFormats ?? 0)}
            icon={Settings}
            href="/catalogue"
          />
          <StatCard
            label="Entreprises clientes"
            value={String(nbClients ?? 0)}
            icon={Users}
            href="/clients"
          />
          <StatCard
            label="Comptes utilisateurs"
            value={String(nbUtilisateurs ?? 0)}
            icon={FileText}
            href={role === 'super_admin' ? '/utilisateurs' : undefined}
          />
        </div>
      </div>

      {/* Liens de configuration */}
      <div>
        <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-3">Gestion</p>
        <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/50">
          <ConfigLink href="/catalogue" label="Catalogue produits" sub="Produits, variétés, formats" />
          <ConfigLink href="/clients" label="Clients" sub="Entreprises et contacts" />
          {role === 'super_admin' && (
            <ConfigLink href="/utilisateurs" label="Utilisateurs & rôles" sub="Comptes et permissions" />
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string
  value: string
  icon: React.ElementType
  href?: string
}) {
  const inner = (
    <div className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-secondary">
        <Icon size={16} className="text-primary" />
      </div>
      <div>
        <p className="font-serif text-xl text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
  if (href) return <Link href={href} className="block hover:opacity-80 transition-opacity">{inner}</Link>
  return inner
}

function ConfigLink({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors"
    >
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
      <span className="text-muted-foreground text-xs">→</span>
    </Link>
  )
}
