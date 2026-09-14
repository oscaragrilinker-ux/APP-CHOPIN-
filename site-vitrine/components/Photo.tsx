'use client'

import { useEffect, useRef, useState } from 'react'

type PhotoProps = {
  src: string
  alt: string
  /** Ce que la photo doit montrer — affiché tant que le fichier n'est pas déposé. */
  brief: string
  className?: string
  imgClassName?: string
  priority?: boolean
}

/**
 * Photo avec emplacement de repli.
 *
 * Tant que le fichier n'est pas dans `public/images/photos/`, le cadre affiche
 * le nom attendu et le sujet demandé plutôt qu'une image cassée. La mise en
 * page est donc jugeable avant que les photos ne soient livrées.
 */
export function Photo({
  src,
  alt,
  brief,
  className = '',
  imgClassName = '',
  priority = false,
}: PhotoProps) {
  const [missing, setMissing] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Le HTML est rendu par le serveur : le navigateur tente déjà le chargement
  // avant l'hydratation, et l'événement `error` est alors perdu. On rattrape
  // le cas au montage — une image terminée dont la largeur est nulle a échoué.
  useEffect(() => {
    const img = imgRef.current
    if (img?.complete && img.naturalWidth === 0) setMissing(true)
  }, [])

  if (missing) {
    return (
      <div
        className={`flex flex-col justify-end bg-bone p-5 ${className}`}
        role="img"
        aria-label={`Emplacement photo : ${brief}`}
      >
        <span className="font-mono text-[10px] uppercase tracking-label text-soil">
          {src.split('/').pop()}
        </span>
        <span className="mt-1 max-w-[34ch] text-[13px] leading-snug text-ink/55">{brief}</span>
      </div>
    )
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setMissing(true)}
        className={`size-full object-cover ${imgClassName}`}
      />
    </div>
  )
}
