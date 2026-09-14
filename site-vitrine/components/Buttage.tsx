'use client'

import { useEffect, useRef } from 'react'

/**
 * Le buttage — effet de fond permanent.
 *
 * Trois nappes de billons parallèles, très pâles, qui glissent à des vitesses
 * différentes : on retrouve la profondeur du champ labouré de la photo
 * d'ouverture, sans jamais concurrencer le contenu.
 *
 * Les lignes sont légèrement hors de l'horizontale (1 à 2 degrés) parce qu'un
 * vrai billon ne l'est jamais. C'est ce défaut qui empêche l'effet de ressembler
 * à une trame d'écran.
 */
const NAPPES = [
  { periode: 26, angle: 178.6, opacite: 0.055, vitesse: 0.035 },
  { periode: 44, angle: 179.3, opacite: 0.042, vitesse: 0.075 },
  { periode: 76, angle: 177.8, opacite: 0.032, vitesse: 0.13 },
]

export function Buttage() {
  const refs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY
      NAPPES.forEach((nappe, i) => {
        const el = refs.current[i]
        if (el) el.style.transform = `translate3d(0, ${(-y * nappe.vitesse).toFixed(2)}px, 0)`
      })
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {NAPPES.map((nappe, i) => (
        <div
          key={nappe.periode}
          ref={el => { refs.current[i] = el }}
          className="absolute inset-x-0 -top-1/2 h-[200%] will-change-transform"
          style={{
            opacity: nappe.opacite,
            backgroundImage: `repeating-linear-gradient(${nappe.angle}deg, #8A6A44 0px, #8A6A44 1px, transparent 1px, transparent ${nappe.periode}px)`,
          }}
        />
      ))}
    </div>
  )
}
