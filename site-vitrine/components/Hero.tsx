'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Photo } from './Photo'
import { siteConfig } from '@/site.config'

/**
 * Ouverture : la terre labourée plein cadre, le nom posé dessus.
 *
 * La photo glisse plus lentement que la page — le regard décolle du sol au
 * lieu de le suivre. L'effet est coupé net si l'utilisateur a demandé moins
 * de mouvement.
 */
export function Hero() {
  const plateRef = useRef<HTMLDivElement>(null)
  const texteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const plate = plateRef.current
    const texte = texteRef.current
    if (!plate) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const y = window.scrollY
        const vh = window.innerHeight || 1
        // 0,08 : la valeur relevée sur les sites agricoles de référence.
        // Le fond monte doucement, il ne suit pas la page.
        plate.style.transform = `translate3d(0, ${(y * 0.08).toFixed(2)}px, 0)`
        // Le texte descend légèrement et s'efface : deuxième plan.
        if (texte) {
          const t = Math.min(y / vh, 1)
          texte.style.transform = `translate3d(0, ${(t * 40).toFixed(2)}px, 0)`
          texte.style.opacity = `${Math.max(0, 1 - t * 1.25).toFixed(3)}`
        }
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <section className="relative isolate flex min-h-[86svh] flex-col justify-end overflow-hidden bg-night">
      <div ref={plateRef} className="absolute inset-0 -z-10 will-change-transform">
        <Photo
          src="/images/photos/hero-couchant.jpg"
          alt="Arrachage de pommes de terre au soleil couchant, Hauts-de-France"
          brief="L'arrachage au soleil couchant, arracheuse et tracteur en silhouette"
          className="size-full scale-[1.12]"
          imgClassName="brightness-[0.82]"
          priority
        />
      </div>

      {/* Le texte doit rester lisible quelle que soit la photo déposée. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-night via-night/55 to-transparent"
      />

      <div ref={texteRef} className="mx-auto w-full max-w-7xl px-4 pb-16 pt-40 will-change-transform sm:px-6 lg:px-8 lg:pb-24">
        <p className="text-[11px] font-medium uppercase tracking-label text-paper/60">
          Beaumetz-lès-Cambrai · Hauts-de-France
        </p>

        <h1 className="mt-4 font-display text-[clamp(3rem,10vw,8.5rem)] uppercase text-paper">
          {siteConfig.brandName}
          <br />
          <span className="text-field">{siteConfig.brandSubtitle}</span>
        </h1>

        {/* Le manuscrit de contrepoint : une seule phrase, jamais deux. */}
        <p className="-mt-1 font-script text-[clamp(1.75rem,4vw,3rem)] leading-none text-field">
          Tout se fait ici
        </p>

        <div className="mt-7 flex flex-col gap-8 border-t border-paper/20 pt-6 md:flex-row md:items-end md:justify-between">
          <p className="max-w-measure text-[15px] leading-relaxed text-paper/80">
            Née d&apos;une ferme d&apos;endives du Cambrésis, la maison trie, calibre et
            conditionne aujourd&apos;hui pommes de terre et oignons pour les
            professionnels. Du champ voisin à la caisse prête en rayon.
          </p>

          <div className="flex shrink-0 flex-wrap gap-3">
            <Link
              href="/usine"
              className="inline-flex h-12 items-center bg-field px-7 text-[11px] font-semibold uppercase tracking-label text-paper transition-colors hover:bg-field/85"
            >
              Voir l&apos;atelier
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center border border-paper/35 px-7 text-[11px] font-semibold uppercase tracking-label text-paper transition-colors hover:border-paper"
            >
              Nous contacter
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
