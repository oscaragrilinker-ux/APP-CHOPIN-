'use client'

import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import type { Role } from '@/types'

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  secretaire: 'Secrétaire',
  responsable_conditionnement: 'Responsable conditionnement',
  conditionnement: 'Conditionnement',
  client_pro: 'Client professionnel',
  super_admin: 'Super Admin',
}

function getInitials(firstName: string | null, lastName: string | null): string {
  return ((firstName?.[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase() || '?'
}

export function UserMenu() {
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const initials = getInitials(profile.first_name, profile.last_name)
  const fullName =
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Utilisateur'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-secondary transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Menu utilisateur"
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary text-accent text-xs font-semibold font-sans">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block text-left max-w-[140px]">
            <p className="text-sm font-medium text-foreground leading-tight truncate">{fullName}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.08em] leading-tight">
              {ROLE_LABELS[profile.role]}
            </p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium truncate">{fullName}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABELS[profile.role]}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/compte')}>
          Mon compte
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
