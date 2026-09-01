'use client'

import { useState } from 'react'
import { ChevronRight, Eye } from 'lucide-react'
import { ProductDialog } from './ProductDialog'
import { ProductAccordion } from './ProductAccordion'
import { FormatRow } from './FormatRow'
import { FormatDialog } from './FormatDialog'
import { VarietyVitrineCard } from './VarietyVitrineCard'
import type { ProductWithTree, FormatFull, Role } from '@/types'

type Props = {
  products: ProductWithTree[]
  allFormats: FormatFull[]
  role: Role
}

export function CatalogueShell({ products, allFormats, role }: Props) {
  const isAdmin = role === 'admin' || role === 'super_admin'
  const [archivesOpen, setArchivesOpen] = useState(false)

  // ── Vue ADMIN ──────────────────────────────────────────────────────────────
  if (isAdmin) {
    const activeProducts  = products.filter(p => p.is_active)
    const archivedProducts = products.filter(p => !p.is_active)
    const visibleFormats   = allFormats

    return (
      <div className="space-y-8">
        {/* ── Parc de formats ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl text-foreground">Parc de formats</h2>
              <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-[0.08em]">
                {allFormats.filter(f => f.is_active).length} contenant{allFormats.filter(f => f.is_active).length !== 1 ? 's' : ''} actif{allFormats.filter(f => f.is_active).length !== 1 ? 's' : ''}
                {allFormats.filter(f => !f.is_active).length > 0 && (
                  <span className="ml-1.5 text-muted-foreground/60">
                    · {allFormats.filter(f => !f.is_active).length} hors service
                  </span>
                )}
              </p>
            </div>
            <FormatDialog mode="create" />
          </div>

          {visibleFormats.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Aucun format dans le parc — créez votre premier contenant.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card divide-y divide-border/50">
              {visibleFormats.map(format => (
                <div key={format.id} className="px-2 first:pt-1 last:pb-1">
                  <FormatRow format={format} role={role} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Produits en service ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl text-foreground">En service</h2>
              <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-[0.08em] flex items-center gap-1.5">
                <Eye size={11} className="text-primary/50" />
                Visible par les clients · {activeProducts.length} produit{activeProducts.length !== 1 ? 's' : ''}
              </p>
            </div>
            <ProductDialog mode="create" />
          </div>

          {activeProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-16 text-center">
              <p className="font-serif text-2xl text-muted-foreground mb-2">Catalogue vide</p>
              <p className="text-sm text-muted-foreground">
                Commencez par créer un premier produit.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeProducts.map(product => (
                <ProductAccordion key={product.id} product={product} role={role} allFormats={allFormats} />
              ))}
            </div>
          )}
        </div>

        {/* ── Catalogue interne — archives ── */}
        {archivedProducts.length > 0 && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setArchivesOpen(o => !o)}
              className="flex items-center gap-2 group w-full text-left"
            >
              <ChevronRight
                size={15}
                className={`shrink-0 text-muted-foreground/60 transition-transform duration-150 ${archivesOpen ? 'rotate-90' : ''}`}
              />
              <div>
                <h2 className="font-serif text-lg text-muted-foreground group-hover:text-foreground transition-colors">
                  Catalogue interne — archives
                </h2>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  {archivedProducts.length} produit{archivedProducts.length !== 1 ? 's' : ''} hors service · Réactivables sans ressaisie
                </p>
              </div>
            </button>

            {archivesOpen && (
              <div className="space-y-3 pl-1 border-l-2 border-border/40 ml-1.5">
                {archivedProducts.map(product => (
                  <ProductAccordion key={product.id} product={product} role={role} allFormats={allFormats} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Vue VITRINE (client_pro, secrétaire, conditionnement) ──────────────────
  const vitrineItems = products.flatMap(p =>
    p.varieties
      .filter(v => v.is_active)
      .map(v => ({ product: p, variety: v })),
  )

  if (vitrineItems.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 p-16 text-center">
        <p className="font-serif text-2xl text-muted-foreground mb-2">
          Aucune variété disponible
        </p>
        <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto">
          Chopin Conditionnement n&apos;a pas encore mis de variétés en service.
          Revenez prochainement.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {vitrineItems.map(({ product, variety }) => (
        <VarietyVitrineCard
          key={variety.id}
          product={product}
          variety={variety}
          role={role}
        />
      ))}
    </div>
  )
}
