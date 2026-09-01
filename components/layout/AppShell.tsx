'use client'

import type { ReactNode } from 'react'
import { AuthProvider } from '@/context/AuthContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import type { Profile } from '@/types'

type Props = {
  profile: Profile
  children: ReactNode
}

export function AppShell({ profile, children }: Props) {
  return (
    <AuthProvider profile={profile}>
      <TooltipProvider delayDuration={300}>
      <div className="flex min-h-screen bg-background">
        {/* Sidebar fixe — desktop uniquement */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-20 shadow-[1px_0_0_0_hsl(var(--border))]">
          <Sidebar />
        </aside>

        {/* Zone principale */}
        <div className="flex flex-1 flex-col lg:pl-64 min-w-0">
          <Header />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
      </TooltipProvider>
    </AuthProvider>
  )
}
