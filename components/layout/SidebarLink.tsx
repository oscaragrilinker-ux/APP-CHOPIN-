'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  href: string
  label: string
  icon: LucideIcon
}

export function SidebarLink({ href, label, icon: Icon }: Props) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-all duration-150',
        'border-l-2',
        isActive
          ? 'border-accent text-accent bg-white/10 font-medium'
          : 'border-transparent text-primary-foreground/65 hover:text-primary-foreground hover:bg-white/5'
      )}
    >
      <Icon size={17} strokeWidth={isActive ? 2 : 1.75} />
      <span className="tracking-wide">{label}</span>
    </Link>
  )
}
