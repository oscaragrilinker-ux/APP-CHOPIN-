'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Menu, X, ExternalLink } from 'lucide-react'
import { Logo } from './Logo'
import { siteConfig } from '@/site.config'

const navLinks = [
  { href: '/',         label: 'Accueil' },
  { href: '/usine',    label: "L'atelier" },
  { href: '/histoire', label: 'Histoire' },
  { href: '/produits', label: 'Produits' },
  { href: '/contact',  label: 'Contact' },
  { href: '/acces',    label: 'Demander un accès' },
]

export function Header() {
  const [open, setOpen] = useState(false)
  const barreRef = useRef<HTMLElement>(null)
  const filRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const barre = barreRef.current
    const fil = filRef.current
    if (!barre) return

    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let dernier = window.scrollY
    let frame = 0

    const update = () => {
      frame = 0
      const y = window.scrollY

      // Le fil de labour : il se remplit à mesure qu'on avance dans la page.
      if (fil) {
        const parcourable = document.body.scrollHeight - window.innerHeight
        const t = parcourable > 0 ? Math.min(Math.max(y / parcourable, 0), 1) : 0
        fil.style.transform = `scaleX(${t.toFixed(4)})`
      }

      // On relève le soc en bout de champ : la barre s'efface en descendant,
      // revient dès qu'on remonte. Jamais dans les cent premiers pixels, sinon
      // elle clignote au moindre soubresaut en haut de page.
      if (!reduit && !open) {
        const descend = y > dernier
        const franchi = Math.abs(y - dernier) > 6
        if (franchi) {
          barre.style.transform = descend && y > 120 ? 'translate3d(0,-100%,0)' : 'translate3d(0,0,0)'
        }
      }

      // Le fond ne s'opacifie qu'une fois décollé du haut.
      barre.dataset.pose = y > 24 ? 'oui' : 'non'
      dernier = y
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [open])

  return (
    <header
      ref={barreRef}
      data-pose="non"
      className="group fixed inset-x-0 top-0 z-50 text-paper border-b border-transparent data-[pose=oui]:text-ink transition-[transform,background-color,border-color] duration-500 ease-out data-[pose=oui]:border-bone data-[pose=oui]:bg-paper-veil data-[pose=oui]:backdrop-blur"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Logo variant="header" scheme="dark" asLink />

          <nav className="hidden items-center gap-7 md:flex" aria-label="Navigation principale">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[11px] font-semibold uppercase tracking-label text-paper/85 transition-colors hover:text-field group-data-[pose=oui]:text-ink/70"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={siteConfig.orderAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-10 items-center gap-1.5 border border-paper/40 px-5 text-[10px] font-semibold uppercase tracking-label text-paper transition-colors hover:bg-field hover:border-field group-data-[pose=oui]:border-ink group-data-[pose=oui]:bg-ink sm:inline-flex"
            >
              Espace commande
              <ExternalLink size={11} />
            </Link>

            <button
              onClick={() => setOpen(!open)}
              className="p-2 md:hidden"
              aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={open}
              aria-controls="mobile-nav"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Le fil de labour — trace de la progression dans la page. */}
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px origin-left bg-soil"
        ref={filRef}
        style={{ transform: 'scaleX(0)' }}
      />

      {open && (
        <nav
          id="mobile-nav"
          className="border-t border-bone bg-paper md:hidden"
          aria-label="Navigation mobile"
        >
          <ul className="divide-y divide-bone">
            {navLinks.map(link => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block px-6 py-4 text-[11px] font-semibold uppercase tracking-label text-ink/80 hover:bg-bone/50 hover:text-field"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={siteConfig.orderAppUrl}
              target="_blank"
              rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-6 py-4 text-[11px] font-semibold uppercase tracking-label text-field hover:bg-bone/50"
              >
                Espace commande
                <ExternalLink size={11} />
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  )
}
