import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ChangeRoleSelect } from './ChangeRoleSelect'
import { RevokeInviteButton } from './RevokeInviteButton'
import { InviteDialog } from '@/components/invitations/InviteDialog'
import type { Role } from '@/types'

export const metadata = { title: 'Utilisateurs — Chopin' }
export const dynamic = 'force-dynamic'

const ROLE_LABELS: Record<string, string> = {
  super_admin:     'Super Admin',
  admin:           'Admin',
  secretaire:      'Secrétaire',
  conditionnement: 'Conditionnement',
  client_pro:      'Client pro',
}

export default async function UtilisateursPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  // docs/permissions.md : « Utilisateurs internes · Créer / modifier rôle » = Admin.
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) redirect('/dashboard')

  // Récupérer tous les profils
  const service = createServiceClient()
  const { data: profiles } = await service
    .from('profiles')
    .select('id, role, first_name, last_name, phone, created_at')
    .order('created_at', { ascending: true })

  // Récupérer les emails via auth.users
  let emailMap: Record<string, string> = {}
  try {
    const { data: authUsers } = await service.auth.admin.listUsers({ perPage: 200 })
    emailMap = Object.fromEntries(
      (authUsers?.users ?? []).map(u => [u.id, u.email ?? ''])
    )
  } catch {
    // Auth admin API peut ne pas être disponible selon la config
  }

  const grouped: Record<string, typeof profiles> = {}
  for (const p of profiles ?? []) {
    const r = p.role as string
    if (!grouped[r]) grouped[r] = []
    grouped[r].push(p)
  }

  const roleOrder: Role[] = ['super_admin', 'admin', 'secretaire', 'conditionnement', 'client_pro']

  // Invitations encore ouvertes, pour que l'admin voie qui n'a pas activé.
  const { data: pendingInvites } = await service
    .from('invitations')
    .select('id, email, role, first_name, last_name, expires_at, created_at')
    .is('accepted_at', null)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  // Entreprises auxquelles rattacher un contact client invité depuis cet écran.
  const { data: companies } = await service
    .from('companies')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Utilisateurs & rôles</h1>
          <p className="text-sm text-muted-foreground mt-1 uppercase tracking-[0.1em]">
            {(profiles ?? []).length} compte{(profiles ?? []).length > 1 ? 's' : ''} actif
            {(profiles ?? []).length > 1 ? 's' : ''}
          </p>
        </div>
        <InviteDialog companies={(companies ?? []) as { id: string; name: string }[]} />
      </div>

      {!!pendingInvites?.length && (
        <section>
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-3">
            Invitations en attente · {pendingInvites.length}
          </p>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 divide-y divide-amber-200/60">
            {pendingInvites.map(inv => {
              const name = [inv.first_name, inv.last_name].filter(Boolean).join(' ')
              return (
                <div key={inv.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {name ? `${name} · ` : ''}{inv.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[inv.role as string] ?? inv.role} · expire le{' '}
                      {format(new Date(inv.expires_at as string), 'd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <RevokeInviteButton id={inv.id as string} />
                </div>
              )
            })}
          </div>
        </section>
      )}

      {roleOrder.map(r => {
        const users = grouped[r] ?? []
        if (!users.length) return null
        return (
          <section key={r}>
            <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-3">
              {ROLE_LABELS[r]} · {users.length}
            </p>
            <div className="rounded-2xl border border-border/60 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-secondary/30">
                    <th className="text-left px-4 py-3 text-xs font-normal uppercase tracking-[0.08em] text-muted-foreground">Nom</th>
                    <th className="text-left px-4 py-3 text-xs font-normal uppercase tracking-[0.08em] text-muted-foreground hidden md:table-cell">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-normal uppercase tracking-[0.08em] text-muted-foreground hidden lg:table-cell">Tél.</th>
                    <th className="text-left px-4 py-3 text-xs font-normal uppercase tracking-[0.08em] text-muted-foreground hidden lg:table-cell">Créé le</th>
                    <th className="text-left px-4 py-3 text-xs font-normal uppercase tracking-[0.08em] text-muted-foreground">Rôle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {users.map(u => {
                    const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || '—'
                    const email = emailMap[u.id] ?? '—'
                    const isSelf = u.id === user.id
                    return (
                      <tr key={u.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{fullName}</p>
                          {isSelf && (
                            <p className="text-[10px] text-muted-foreground">(vous)</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          {email}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                          {u.phone ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                          {format(new Date(u.created_at), 'd MMM yyyy', { locale: fr })}
                        </td>
                        <td className="px-4 py-3">
                          {isSelf ? (
                            <span className="text-muted-foreground text-xs">{ROLE_LABELS[u.role] ?? u.role}</span>
                          ) : (
                            <ChangeRoleSelect userId={u.id} currentRole={u.role as Role} />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </div>
  )
}
