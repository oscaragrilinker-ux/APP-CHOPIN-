'use client'

import { useEffect, useRef, type ElementType, type ReactNode } from 'react'

type DriftProps = {
  children: ReactNode
  /**
   * Fraction de la hauteur d'écran parcourue à contre-sens du défilement.
   * Relevé sur les sites agricoles de référence : 0,08 pour un fond, 0,02 à
   * 0,05 pour un plan intermédiaire. Au-delà de 0,12 le mouvement se voit,
   * et dès qu'il se voit il fait gadget.
   */
  speed?: number
  /** Fait décroître l'opacité à mesure que le bloc quitte l'écran par le haut. */
  fadeOut?: boolean
  /** Inclinaison fixe, en degrés — l'objet posé à la main plutôt que calé. */
  tilt?: number
  as?: ElementType
  className?: string
}

/**
 * Mouvement lié à la position de défilement.
 *
 * À la différence d'une révélation déclenchée une fois, la transformation est
 * recalculée en continu : le bloc dérive tant qu'il traverse l'écran. C'est ce
 * qui donne la sensation de profondeur plutôt que celle d'un diaporama.
 *
 * Un seul écouteur par instance, cadencé sur `requestAnimationFrame`, et rien
 * du tout si l'utilisateur a demandé moins de mouvement.
 */
export function Drift({
  children,
  speed = 0.06,
  fadeOut = false,
  tilt = 0,
  as: Tag = 'div',
  className = '',
}: DriftProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    const update = () => {
      frame = 0
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight || 1

      // −1 quand le bloc vient de sortir par le haut, +1 quand il attend en bas.
      const centre = rect.top + rect.height / 2
      const t = (centre - vh / 2) / vh
      const borne = Math.max(-1.5, Math.min(1.5, t))

      const y = borne * speed * vh
      el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)${tilt ? ` rotate(${tilt}deg)` : ''}`

      if (fadeOut) {
        // Ne s'efface qu'en remontant : un bloc qui arrive reste net.
        const sortie = Math.max(0, -borne - 0.15) / 0.85
        el.style.opacity = `${Math.max(0, 1 - sortie).toFixed(3)}`
      }
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    el.style.willChange = 'transform'
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    update()

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
      el.style.willChange = ''
    }
  }, [speed, fadeOut, tilt])

  // Le style initial est rendu par le serveur : sans JavaScript, l'inclinaison
  // reste et rien ne disparaît.
  return (
    <Tag
      ref={ref}
      className={className}
      style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}
    >
      {children}
    </Tag>
  )
}
