'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Role } from '@/types'

// super_admin est absent : c'est un rôle de développement, il ne s'attribue
// jamais depuis l'interface (docs/permissions.md).
const ROLES: { value: Role; label: string }[] = [
  { value: 'admin',           label: 'Admin' },
  { value: 'secretaire',      label: 'Secrétaire' },
  { value: 'conditionnement', label: 'Conditionnement' },
  { value: 'client_pro',      label: 'Client pro' },
]

export function ChangeRoleSelect({
  userId,
  currentRole,
}: {
  userId: string
  currentRole: Role
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Un compte super_admin ne se rétrograde pas depuis l'UI.
  if (currentRole === 'super_admin') {
    return <span className="text-xs text-muted-foreground">Super Admin</span>
  }

  function handleChange(newRole: string) {
    if (newRole === currentRole) return

    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) {
        toast.error('Erreur lors du changement de rôle.')
      } else {
        toast.success('Rôle mis à jour.')
        router.refresh()
      }
    })
  }

  return (
    <Select value={currentRole} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="h-8 w-40 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map(r => (
          <SelectItem key={r.value} value={r.value} className="text-xs">
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
