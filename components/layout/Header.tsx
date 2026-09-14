'use client'

import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Sidebar } from './Sidebar'
import { NotificationBell } from './NotificationBell'
import { UserMenu } from './UserMenu'
import { BRAND } from '@/lib/brand'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Tableau de bord',
  '/offres': 'Offres',
  '/offres/nouvelle': 'Nouvelle offre',
  '/commandes': 'Commandes',
  '/clients': 'Clients',
  '/catalogue': 'Catalogue',
  '/facturation': 'Facturation',
  '/relances': 'Relances',
  '/archives': 'Archives',
  '/utilisateurs': 'Utilisateurs & rôles',
  '/parametres': 'Paramètres',
  '/compte': 'Mon compte',
}

function resolveTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  for (const [prefix, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(prefix + '/')) return title
  }
  return BRAND.name
}

export function Header() {
  const pathname = usePathname()
  const title = resolveTitle(pathname)

  return (
    <header className="h-14 shrink-0 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10 flex items-center gap-3 px-4 sm:px-6">
      {/* Hamburger mobile — caché sur lg+ */}
      <Sheet>
        <SheetTrigger asChild>
          <button
            className="lg:hidden p-1.5 rounded-md hover:bg-secondary transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Ouvrir la navigation"
          >
            <Menu size={20} />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64 border-r-0">
          <SheetTitle className="sr-only">Navigation principale</SheetTitle>
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Titre de page */}
      <h1 className="flex-1 font-serif text-xl font-semibold text-foreground truncate">
        {title}
      </h1>

      {/* Actions droite */}
      <div className="flex items-center gap-0.5">
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  )
}
