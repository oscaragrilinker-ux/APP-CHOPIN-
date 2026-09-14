'use client'

import { useEffect, useRef, type ElementType, type ReactNode } from 'react'

type RevealProps = {
  children: ReactNode
  /** Retard avant l'entrée, pour échelonner une série de blocs. */
  delay?: number
  /** `image` déclenche le volet montant plutôt que la simple montée. */
  variant?: 'block' | 'image' | 'rise'
  as?: ElementType
  className?: string
}

/**
 * Révèle son contenu à l'approche du viewport.
 *
 * Le serveur rend le bloc visible ; l'état de départ n'est posé qu'une fois
 * le composant monté. Une page sans JavaScript reste donc entièrement lisible,
 * et rien ne peut rester bloqué à `opacity: 0`.
 */
export function Reveal({
  children,
  delay = 0,
  variant = 'block',
  as: Tag = 'div',
  className = '',
}: RevealProps) {
  const ref = useRef<HTMLElement>(null)
  const attribute =
    variant === 'image' ? 'data-reveal-image' : variant === 'rise' ? 'data-rise' : 'data-reveal'

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || !('IntersectionObserver' in window)) return

    el.setAttribute(attribute, 'armed')
    el.style.setProperty('--reveal-delay', `${delay}ms`)

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          el.setAttribute(attribute, 'in')
          observer.unobserve(el)
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.15 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [attribute, delay])

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}
