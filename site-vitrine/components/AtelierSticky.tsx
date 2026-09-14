'use client'

import { useEffect, useRef, useState } from 'react'
import { Photo } from './Photo'

const PHASES = [
  {
    n: '01',
    title: 'Réception',
    body:
      "Les bennes arrivent du champ voisin. Le lot est pesé, identifié, et part directement sur la ligne — pas de stockage inutile entre la terre et le tri.",
    src: '/images/photos/reception.jpg',
    alt: "Réception des oignons sur la trémie d'alimentation",
    brief: "La réception des oignons, machine rouge CASA à l'intérieur",
  },
  {
    n: '02',
    title: 'Tri et calibrage',
    body:
      "Chaque pièce passe au calibre. Ce qui ne tient pas le standard sort de la ligne. L'œil de l'opérateur reste le dernier filtre, après la machine.",
    src: '/images/photos/calibrage.jpg',
    alt: 'Oignons en cascade sur le tapis de calibrage',
    brief: 'La ligne de calibrage, oignons en cascade, opérateur en bonnet',
  },
  {
    n: '03',
    title: 'Froid et expédition',
    body:
      "Mise au froid immédiate, puis palettisation. Le lot part avec son numéro, sa variété et son bon de livraison — traçable de la parcelle au quai.",
    src: '/images/photos/stockage.jpg',
    alt: 'Halle de stockage, caisses palettes en bois et chariot élévateur',
    brief: 'La halle de stockage, caisses bois empilées et chariot',
  },
]

/**
 * Les trois temps de l'atelier, en scène épinglée.
 *
 * Une seule phase est visible à la fois. L'index actif est une fonction pure de
 * la position de défilement dans la section : remonter rejoue donc la séquence
 * à l'envers, sans code supplémentaire.
 *
 * Les phases déjà passées sortent par le haut, celles à venir attendent en bas.
 * Ce sens de circulation est ce qui fait lire une progression plutôt qu'une
 * succession de fondus.
 */
export function AtelierSticky() {
  const sectionRef = useRef<HTMLElement>(null)
  const [actif, setActif] = useState(0)
  const [avance, setAvance] = useState(0)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    let frame = 0
    const update = () => {
      frame = 0
      const rect = section.getBoundingClientRect()
      const parcourable = section.offsetHeight - window.innerHeight
      if (parcourable <= 0) return

      const t = Math.min(Math.max(-rect.top / parcourable, 0), 1)
      setAvance(t)
      // Les bornes sont réparties également : chaque phase occupe le même
      // tiers de la course.
      setActif(Math.min(PHASES.length - 1, Math.floor(t * PHASES.length)))
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
  }, [])

  return (
    <section
      ref={sectionRef}
      aria-label="Les trois temps de l'atelier"
      style={{ height: `${PHASES.length * 100}vh` }}
      className="relative bg-night text-paper"
    >
      <div className="sticky top-0 flex h-svh flex-col overflow-hidden">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10 pt-24 sm:px-6 lg:px-8 lg:pb-14 lg:pt-28">

          {/* Titre fixe — il ne bouge pas d'une phase à l'autre. */}
          <div className="shrink-0">
            <p className="text-[11px] font-medium uppercase tracking-label text-field">
              L&apos;atelier
            </p>
            <h2 className="mt-3 max-w-[16ch] font-display text-[clamp(1.75rem,4vw,3rem)] font-black uppercase leading-[0.92] tracking-tightest">
              Du champ à la caisse en trois temps
            </h2>
          </div>

          {/* La scène : les trois phases superposées, une seule visible. */}
          <div className="relative mt-8 flex-1 lg:mt-10">
            {PHASES.map((phase, i) => {
              const passee = i < actif
              const venir = i > actif
              return (
                <div
                  key={phase.n}
                  aria-hidden={i !== actif}
                  className="absolute inset-0 grid gap-6 transition-[opacity,transform] duration-[600ms] ease-out lg:grid-cols-2 lg:gap-14"
                  style={{
                    opacity: i === actif ? 1 : 0,
                    // Ce qui est passé s'échappe par le haut, ce qui vient
                    // attend en bas : le sens de circulation fait la lecture.
                    transform: passee
                      ? 'translate3d(0,-6%,0)'
                      : venir
                        ? 'translate3d(0,6%,0)'
                        : 'translate3d(0,0,0)',
                    pointerEvents: i === actif ? 'auto' : 'none',
                  }}
                >
                  <div className="relative min-h-0 overflow-hidden">
                    <Photo
                      src={phase.src}
                      alt={phase.alt}
                      brief={phase.brief}
                      className="size-full"
                    />
                  </div>

                  <div className="flex flex-col justify-center gap-4">
                    <span className="font-display text-[13px] font-bold tabular-nums text-field">
                      {phase.n} / {String(PHASES.length).padStart(2, '0')}
                    </span>
                    <h3 className="font-display text-[clamp(1.6rem,3.4vw,2.6rem)] font-black uppercase leading-[0.95] tracking-tightest">
                      {phase.title}
                    </h3>
                    <p className="max-w-measure text-[15px] leading-relaxed text-paper/70">
                      {phase.body}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Avancement dans la séquence. */}
          <div className="mt-6 flex shrink-0 items-center gap-3">
            <div className="flex flex-1 gap-1.5">
              {PHASES.map((phase, i) => (
                <span key={phase.n} className="h-0.5 flex-1 bg-paper/15">
                  <span
                    className="block h-full origin-left bg-field transition-transform duration-500 ease-out"
                    style={{
                      transform: `scaleX(${
                        i < actif ? 1 : i > actif ? 0 : Math.min(1, (avance * PHASES.length) % 1 || (actif === PHASES.length - 1 && avance >= 1 ? 1 : 0))
                      })`,
                    }}
                  />
                </span>
              ))}
            </div>
            <span className="shrink-0 font-display text-[12px] font-bold tabular-nums text-paper/45">
              {PHASES[actif].n}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
