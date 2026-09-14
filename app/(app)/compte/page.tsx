import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AccountForm } from './AccountForm'
import type { Role } from '@/types'
import { BRAND } from '@/lib/brand'

export const metadata = { title: `Mon compte — ${BRAND.name}` }

export default async function ComptePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, first_name, last_name, phone')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Mon compte</h1>
        <p className="text-sm text-muted-foreground mt-1 uppercase tracking-[0.1em]">
          Profil · {profile.role as Role}
        </p>
      </div>

      {/* Infos non modifiables */}
      <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/50">
        <div className="px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Email</p>
          <p className="text-sm font-medium text-foreground mt-0.5">{user.email}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Rôle</p>
          <p className="text-sm font-medium text-foreground mt-0.5 capitalize">{profile.role}</p>
        </div>
      </div>

      {/* Formulaire éditable */}
      <AccountForm
        userId={profile.id}
        initialValues={{
          first_name: profile.first_name ?? '',
          last_name: profile.last_name ?? '',
          phone: profile.phone ?? '',
        }}
      />
    </div>
  )
}
