'use client'

import { useEffect, useRef, useState } from 'react'

type CounterProps = {
  to: number
  /** Une année se lit d'un bloc ; un compte se déroule. */
  format?: 'plain' | 'year'
  className?: string
}

/**
 * Chiffre qui se déroule lorsqu'il entre dans le champ de vision.
 *
 * La valeur finale est rendue par le serveur : sans JavaScript, le chiffre est
 * simplement là, déjà juste.
 */
export function Counter({ to, format = 'plain', className = '' }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState(to)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!('IntersectionObserver' in window)) return

    // Une année part de 40 ans avant ; un petit nombre part de zéro.
    const from = format === 'year' ? to - 40 : 0
    setValue(from)

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          observer.unobserve(el)

          const duration = 1100
          const start = performance.now()
          const tick = (now: number) => {
            const t = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - t, 3)
            setValue(Math.round(from + (to - from) * eased))
            if (t < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.4 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [to, format])

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {value}
    </span>
  )
}
