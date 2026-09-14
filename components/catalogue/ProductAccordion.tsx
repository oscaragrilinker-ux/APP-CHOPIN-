'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ChevronRight, Leaf, ArchiveRestore, Archive } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VarietyAccordion } from './VarietyAccordion'
import { VarietyDialog } from './VarietyDialog'
import { ProductDialog } from './ProductDialog'
import { archiveProduct, restoreProduct } from '@/lib/actions/catalogue'
import type { ProductWithTree, FormatFull, Role } from '@/types'

type Props = {
  product: ProductWithTree
  role: Role
  allFormats: FormatFull[]
  defaultOpen?: boolean
}

export function ProductAccordion({ product, role, allFormats, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [pending, startTransition] = useTransition()
  const [imgError, setImgError] = useState(false)
  const isAdmin = role === 'admin' || role === 'super_admin'

  const visibleVarieties = isAdmin
    ? product.varieties
    : product.varieties.filter(v => v.is_active)

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveProduct(product.id)
      if ('error' in result) toast.error(result.error)
      else toast.success('Produit retiré du service.')
    })
  }

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreProduct(product.id)
      if ('error' in result) toast.error(result.error)
      else toast.success('Produit remis en service.')
    })
  }

  return (
    <div
      className={`rounded-md border transition-shadow hover:shadow-sm
        ${product.is_active ? 'border-border bg-card' : 'border-border/40 bg-muted/30'}`}
    >
      {/* En-tête produit */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none group"
        onClick={() => setOpen(o => !o)}
      >
        <ChevronRight
          size={16}
          className={`shrink-0 text-muted-foreground transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
        />

        {/* Vignette image ou icône fallback */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg overflow-hidden bg-primary/8 border border-border/40">
          {product.image_url && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="object-cover w-full h-full"
              onError={() => setImgError(true)}
            />
          ) : (
            <Leaf size={16} className="text-primary/60" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`font-serif text-base leading-tight ${product.is_active ? 'text-foreground' : 'text-muted-foreground'}`}>
            {product.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {product.description && (
              <p className="text-xs text-muted-foreground truncate">{product.description}</p>
            )}
            {product.season && (
              <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70 shrink-0">
                {product.season}
              </span>
            )}
          </div>
        </div>

        {!product.is_active && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground shrink-0">
            Hors service
          </Badge>
        )}

        <span className="text-xs text-muted-foreground shrink-0">
          {visibleVarieties.length} variété{visibleVarieties.length !== 1 ? 's' : ''}
        </span>

        {isAdmin && (
          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <ProductDialog mode="edit" product={product} />
            {product.is_active ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
                onClick={handleArchive}
                disabled={pending}
              >
                <Archive size={12} />
                Retirer du service
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1 text-accent hover:text-accent"
                onClick={handleRestore}
                disabled={pending}
              >
                <ArchiveRestore size={12} />
                Remettre en service
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Contenu variétés */}
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-2">
          {visibleVarieties.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
              Aucune variété pour ce produit
              {isAdmin ? ' — ajoutez-en une.' : '.'}
            </p>
          ) : (
            visibleVarieties.map(variety => (
              <VarietyAccordion key={variety.id} variety={variety} role={role} allFormats={allFormats} />
            ))
          )}
          {isAdmin && (
            <div className="pt-1">
              <VarietyDialog mode="create" productId={product.id} allFormats={allFormats} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
