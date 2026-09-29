'use client'

import { useState, useTransition } from 'react'
import { Loader2, UserRoundCog } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { DEMO_ACCOUNTS } from '@/lib/demo-accounts'
import { getDemoSwitchToken } from '@/lib/actions/demo'

const GROUPS = ['Exploitation', 'Atelier', 'Clients'] as const

/**
 * Sélecteur de profil de démonstration — affiché hors production seulement.
 *
 * La bascule passe par un rechargement complet de la page : les abonnements
 * temps réel et le contexte d'authentification repartent de zéro avec le
 * nouvel utilisateur, sans état résiduel du précédent.
 */
export function DemoSwitcher() {
  const [pending, startTransition] = useTransition()
  const [target, setTarget] = useState<string | null>(null)

  const switchTo = (email: string) => {
    setTarget(email)
    startTransition(async () => {
      const result = await getDemoSwitchToken(email)
      if ('error' in result) {
        toast.error('Changement de profil impossible', { description: result.error })
        setTarget(null)
        return
      }
      const supabase = createClient()
      await supabase.auth.signOut({ scope: 'local' })
      const { error } = await supabase.auth.verifyOtp({
        token_hash: result.tokenHash,
        type: 'magiclink',
      })
      if (error) {
        toast.error('Session refusée', { description: error.message })
        setTarget(null)
        return
      }
      window.location.assign('/')
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-10 items-center gap-2 rounded-md bg-accent px-3.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-foreground shadow-sm hover:opacity-90 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Changer de profil de démonstration"
          disabled={pending}
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <UserRoundCog size={14} />}
          <span className="hidden sm:inline">Changer de profil</span>
          <span className="sm:hidden">Démo</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Changer de profil
        </DropdownMenuLabel>
        {GROUPS.map(group => (
          <div key={group}>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
              {group}
            </DropdownMenuLabel>
            {DEMO_ACCOUNTS.filter(a => a.group === group).map(a => {
              return (
                <DropdownMenuItem
                  key={a.email}
                  disabled={pending}
                  onSelect={() => switchTo(a.email)}
                  className="flex flex-col items-start gap-0"
                >
                  <span className="text-sm">
                    {target === a.email ? 'Connexion…' : a.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{a.email}</span>
                </DropdownMenuItem>
              )
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
