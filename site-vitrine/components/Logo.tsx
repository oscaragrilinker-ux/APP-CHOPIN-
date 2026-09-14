import Link from 'next/link'
import { siteConfig } from '@/site.config'

type LogoVariant = 'header' | 'hero' | 'footer'
type LogoScheme = 'light' | 'dark'

interface LogoProps {
  variant?: LogoVariant
  scheme?: LogoScheme
  asLink?: boolean
}

// Le nom se lit en deux lignes serrées, pas en capitales étalées :
// c'est une enseigne d'exploitation, pas un monogramme de parfumerie.
const sizes: Record<LogoVariant, string> = {
  header: 'text-[13px] leading-[0.95]',
  hero:   'text-5xl sm:text-7xl leading-[0.86]',
  footer: 'text-base leading-[0.95]',
}

export function Logo({ variant = 'header', scheme = 'dark', asLink = false }: LogoProps) {
  const primary = scheme === 'light' ? 'text-paper' : 'text-current'
  const accent  = scheme === 'light' ? 'text-field' : 'text-field'

  const content = (
    <span className={`flex select-none flex-col font-display font-black uppercase tracking-tightest ${sizes[variant]}`}>
      <span className={primary}>{siteConfig.brandName}</span>
      <span className={accent}>{siteConfig.brandSubtitle}</span>
    </span>
  )

  if (asLink) {
    return (
      <Link href="/" aria-label={`${siteConfig.brandName} ${siteConfig.brandSubtitle} — Accueil`}>
        {content}
      </Link>
    )
  }
  return content
}
