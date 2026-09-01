import { redirect } from 'next/navigation'
import { Mail, MapPin, Phone, Truck, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CarrierDialog } from '@/components/transporteurs/CarrierDialog'
import { ToggleCarrierActive } from '@/components/transporteurs/ToggleCarrierActive'
import { hasPermission, type PermissionOverrides } from '@/lib/permissions'
import type { Carrier, Role } from '@/types'

export const metadata = { title: 'Transporteurs — Chopin' }
export const dynamic = 'force-dynamic'

export default async function TransporteursPage() {
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
  const overrides = (profile.permission_overrides ?? {}) as PermissionOverrides
  const canManage = hasPermission(role, 'carriers:manage', overrides)
  if (!canManage) redirect('/dashboard')

  const { data } = await supabase
    .from('carriers')
    .select('*')
    .order('is_active', { ascending: false })
    .order('name')

  const carriers = (data ?? []) as Carrier[]
  const activeCount = carriers.filter(c => c.is_active).length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Transporteurs</h1>
          <p className="text-sm text-muted-foreground mt-1 uppercase tracking-[0.1em]">
            {activeCount} transporteur{activeCount !== 1 ? 's' : ''} actif{activeCount !== 1 ? 's' : ''} · Carnet de contacts
          </p>
        </div>
        <CarrierDialog mode="create" />
      </div>

      {!carriers.length ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-16 text-center">
          <Truck size={24} className="text-muted-foreground mx-auto mb-3" />
          <p className="font-serif text-2xl text-muted-foreground mb-1">Aucun transporteur</p>
          <p className="text-sm text-muted-foreground">
            Ajoutez vos transporteurs pour organiser les enlèvements depuis les commandes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {carriers.map(c => (
            <div
              key={c.id}
              className={`rounded-2xl border bg-card p-5 ${
                c.is_active ? 'border-border/60' : 'border-border/40 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-serif text-xl text-foreground">{c.name}</h2>
                  {!c.is_active && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground border border-border rounded px-1.5 py-0.5 mt-1 inline-block">
                      Inactif
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-1.5 text-sm">
                {c.contact_name && (
                  <p className="flex items-center gap-2 text-foreground">
                    <User size={13} className="text-muted-foreground shrink-0" />
                    {c.contact_name}
                  </p>
                )}
                {c.phone && (
                  <p className="flex items-center gap-2">
                    <Phone size={13} className="text-muted-foreground shrink-0" />
                    <a href={`tel:${c.phone}`} className="text-foreground hover:underline">{c.phone}</a>
                  </p>
                )}
                {c.email && (
                  <p className="flex items-center gap-2 min-w-0">
                    <Mail size={13} className="text-muted-foreground shrink-0" />
                    <a href={`mailto:${c.email}`} className="text-foreground hover:underline truncate">
                      {c.email}
                    </a>
                  </p>
                )}
                {(c.address_line1 || c.city) && (
                  <p className="flex items-start gap-2 text-muted-foreground">
                    <MapPin size={13} className="shrink-0 mt-0.5" />
                    <span>
                      {c.address_line1}
                      {c.address_line1 && (c.postal_code || c.city) && ', '}
                      {[c.postal_code, c.city].filter(Boolean).join(' ')}
                    </span>
                  </p>
                )}
              </div>

              {c.notes && (
                <p className="mt-3 text-sm text-muted-foreground italic border-l-2 border-border pl-3">
                  {c.notes}
                </p>
              )}

              <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-1">
                <CarrierDialog
                  mode="edit"
                  carrier={{
                    id: c.id,
                    name: c.name,
                    contact_name: c.contact_name ?? '',
                    email: c.email ?? '',
                    phone: c.phone ?? '',
                    address_line1: c.address_line1 ?? '',
                    postal_code: c.postal_code ?? '',
                    city: c.city ?? '',
                    notes: c.notes ?? '',
                  }}
                />
                <ToggleCarrierActive id={c.id} isActive={c.is_active} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
