'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Leaf, ShoppingCart } from 'lucide-react'
import type { ProductWithTree, VarietyWithFormats, Role } from '@/types'

type Props = {
  product: Pick<ProductWithTree, 'name' | 'image_url' | 'season'>
  variety: VarietyWithFormats
  role: Role
}

export function VarietyVitrineCard({ product, variety, role }: Props) {
  const [imgError, setImgError] = useState(false)
  const router = useRouter()

  const sortedFormats = variety.variety_formats
    .filter(vf => vf.format !== null && vf.format.is_active)
    .map(vf => vf.format!)
    .sort((a, b) => {
      const wA = a.weight_kg ?? Infinity
      const wB = b.weight_kg ?? Infinity
      if (wA !== wB) return wA - wB
      return a.name.localeCompare(b.name)
    })

  function handleOfferClick() {
    router.push(`/offres/nouvelle?v=${variety.id}`)
  }

  return (
    <div className="flex flex-col rounded-lg border border-border/70 bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* En-tête : image + identité */}
      <div className="flex items-start gap-3 p-5 pb-4">
        <div className="shrink-0 w-14 h-14 rounded-md overflow-hidden bg-primary/8 border border-border/40 flex items-center justify-center">
          {product.image_url && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <Leaf size={22} className="text-primary/50" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-lg leading-tight text-foreground">{product.name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{variety.name}</p>

          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {variety.caliber && (
              <span className="text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded bg-accent/10 text-accent/80 border border-accent/20">
                {variety.caliber}
              </span>
            )}
            {variety.quality_grade && (
              <span className="text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded bg-accent/10 text-accent/80 border border-accent/20">
                {variety.quality_grade}
              </span>
            )}
            {product.season && (
              <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/60">
                {product.season}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contenants disponibles */}
      {sortedFormats.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 mb-2">
            Contenants disponibles
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sortedFormats.map(f => (
              <span
                key={f.id}
                className="text-xs px-2.5 py-0.5 rounded-full border border-border/70 bg-secondary/60 text-foreground/70"
              >
                {f.name}
                {f.weight_kg != null && (
                  <span className="text-muted-foreground/60"> · {f.weight_kg} kg</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CTA — uniquement client_pro, étape 4 */}
      {role === 'client_pro' && (
        <div className="mt-auto px-5 pb-5">
          <button
            type="button"
            onClick={handleOfferClick}
            className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingCart size={14} className="shrink-0" />
            Faire une offre
          </button>
        </div>
      )}
    </div>
  )
}
