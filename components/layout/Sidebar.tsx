'use client'

import Link from 'next/link'
import {
  LayoutDashboard,
  Package,
  FileText,
  Users,
  BookOpen,
  Receipt,
  BellRing,
  ShieldCheck,
  Settings,
  User,
  Archive,
  Truck,
  Forklift,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SidebarLink } from './SidebarLink'
import { useAuth } from '@/context/AuthContext'
import type { Role } from '@/types'
import { BRAND } from '@/lib/brand'

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  roles: Role[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Tableau de bord',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'secretaire', 'super_admin', 'conditionnement', 'responsable_conditionnement', 'client_pro'],
  },
  {
    label: 'Offres',
    href: '/offres',
    icon: FileText,
    roles: ['admin', 'secretaire', 'super_admin', 'client_pro'],
  },
  {
    label: 'Commandes',
    href: '/commandes',
    icon: Package,
    roles: ['admin', 'secretaire', 'super_admin', 'conditionnement', 'responsable_conditionnement', 'client_pro'],
  },
  {
    label: 'Atelier',
    href: '/atelier',
    icon: Forklift,
    roles: ['admin', 'secretaire', 'super_admin', 'conditionnement', 'responsable_conditionnement'],
  },
  {
    label: 'Clients',
    href: '/clients',
    icon: Users,
    roles: ['admin', 'secretaire', 'super_admin'],
  },
  {
    label: 'Catalogue',
    href: '/catalogue',
    icon: BookOpen,
    roles: ['admin', 'secretaire', 'super_admin', 'conditionnement', 'responsable_conditionnement', 'client_pro'],
  },
  {
    label: 'Facturation',
    href: '/facturation',
    icon: Receipt,
    roles: ['admin', 'secretaire', 'super_admin'],
  },
  {
    label: 'Relances',
    href: '/relances',
    icon: BellRing,
    roles: ['admin', 'secretaire', 'super_admin'],
  },
  {
    label: 'Archives',
    href: '/archives',
    icon: Archive,
    roles: ['admin', 'secretaire', 'super_admin'],
  },
  {
    label: 'Transporteurs',
    href: '/transporteurs',
    icon: Truck,
    roles: ['admin', 'secretaire', 'super_admin'],
  },
  {
    label: 'Utilisateurs & rôles',
    href: '/utilisateurs',
    icon: ShieldCheck,
    roles: ['admin', 'super_admin'],
  },
  {
    label: 'Paramètres',
    href: '/parametres',
    icon: Settings,
    roles: ['admin', 'super_admin'],
  },
  {
    label: 'Mon compte',
    href: '/compte',
    icon: User,
    roles: ['admin', 'secretaire', 'conditionnement', 'responsable_conditionnement', 'client_pro', 'super_admin'],
  },
]

const MAIN_HREFS = ['/dashboard', '/offres', '/commandes', '/atelier', '/clients', '/catalogue']
const GESTION_HREFS = ['/facturation', '/relances', '/transporteurs', '/archives']
const COMPTE_HREFS = ['/utilisateurs', '/parametres', '/compte']

export function Sidebar() {
  const { role } = useAuth()
  const visible = NAV_ITEMS.filter(item => item.roles.includes(role))

  const mainItems = visible.filter(i => MAIN_HREFS.includes(i.href))
  const gestionItems = visible.filter(i => GESTION_HREFS.includes(i.href))
  const compteItems = visible.filter(i => COMPTE_HREFS.includes(i.href))

  return (
    <div className="flex flex-col h-full bg-night overflow-hidden">
      {/* Logo */}
      <div className="shrink-0 px-6 py-5 border-b border-white/10">
        <Link href="/dashboard" className="block group">
          <span className="block font-serif text-[1.15rem] uppercase leading-none text-primary-foreground">
            {BRAND.nameTop}
          </span>
          <span className="block font-serif text-[1.15rem] uppercase leading-none text-primary group-hover:text-primary/80 transition-colors">
            {BRAND.nameBottom}
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {mainItems.length > 0 && (
          <div className="space-y-0.5">
            {mainItems.map(item => (
              <SidebarLink key={item.href} {...item} />
            ))}
          </div>
        )}

        {gestionItems.length > 0 && (
          <div className="space-y-0.5">
            <p className="px-4 pb-1.5 text-[9px] uppercase tracking-[0.15em] text-primary-foreground/35 font-sans select-none">
              Gestion
            </p>
            {gestionItems.map(item => (
              <SidebarLink key={item.href} {...item} />
            ))}
          </div>
        )}

        {compteItems.length > 0 && (
          <div className="space-y-0.5">
            <p className="px-4 pb-1.5 text-[9px] uppercase tracking-[0.15em] text-primary-foreground/35 font-sans select-none">
              Compte
            </p>
            {compteItems.map(item => (
              <SidebarLink key={item.href} {...item} />
            ))}
          </div>
        )}
      </nav>

      {/* Pied de page */}
      <div className="shrink-0 px-4 py-3 border-t border-white/10">
        <p className="text-[9px] text-primary-foreground/25 text-center font-sans tracking-wide">
          {BRAND.legalName} · v0.1
        </p>
      </div>
    </div>
  )
}
