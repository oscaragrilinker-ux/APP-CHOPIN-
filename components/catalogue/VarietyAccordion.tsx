'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ChevronRight, Layers, Package, ArchiveRestore, Archive } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VarietyDialog } from './VarietyDialog'
import { archiveVariety, restoreVariety } from '@/lib/actions/catalogue'
import type { VarietyWithFormats, FormatFull, Role } from '@/types'

type Props = {
  variety: VarietyWithFormats
  role: Role
  allFormats: FormatFull[]
  defaultOpen?: boolean
}

export function VarietyAccordion({ variety, role, allFormats, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [pending, startTransition] = useTransition()
  const isAdmin = role === 'admin' || role === 'super_admin'

  const linkedFormats = variety.variety_formats
    .filter(vf => vf.format !== null && vf.format.is_active)
    .map(vf => vf.format!)
    .sort((a, b) => {
      const wA = a.weight_kg ?? Infinity
      const wB = b.weight_kg ?? Infinity
      return wA !== wB ? wA - wB : a.name.localeCompare(b.name)
    })

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveVariety(variety.id)
      if ('error' in result) toast.error(result.error)
      else toast.success('Variété retirée du service.')
    })
  }

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreVariety(variety.id)
      if ('error' in result) toast.error(result.error)
      else toast.success('Variété remise en service.')
    })
  }

  return (
    <div className="border border-border/60 rounded-lg overflow-hidden">
      {/* En-tête variété */}
      <div
        className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none transition-colors group
          ${open ? 'bg-secondary/60' : 'bg-card hover:bg-secondary/40'}
          ${!variety.is_active ? 'opacity-60' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <ChevronRight
          size={14}
          className={`shrink-0 text-muted-foreground transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
        />
        <Layers size={14} className="shrink-0 text-accent/70" />
        <span className="flex-1 text-sm font-medium text-foreground/90">{variety.name}</span>

        {variety.caliber && (
          <span className="text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded bg-accent/10 text-accent/80 border border-accent/20 shrink-0">
            {variety.caliber}
          </span>
        )}
        {variety.quality_grade && (
          <span className="text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded bg-accent/10 text-accent/80 border border-accent/20 shrink-0">
            {variety.quality_grade}
          </span>
        )}

        {!variety.is_active && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground shrink-0">
            Hors service
          </Badge>
        )}

        <span className="text-xs text-muted-foreground shrink-0">
          {linkedFormats.length} contenant{linkedFormats.length !== 1 ? 's' : ''}
        </span>

        {isAdmin && (
          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}
          >
            <VarietyDialog mode="edit" variety={variety} allFormats={allFormats} />
            {variety.is_active ? (
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

      {/* Formats liés — lecture seule */}
      {open && (
        <div className="bg-background/50 px-3 py-2">
          {linkedFormats.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">
              Aucun contenant associé
              {isAdmin ? ' — modifiez la variété pour en cocher.' : '.'}
            </p>
          ) : (
            <div className="space-y-0.5">
              {linkedFormats.map(f => (
                <div key={f.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md">
                  <Package size={12} className="shrink-0 text-muted-foreground/50" />
                  <span className="text-sm text-foreground/80">{f.name}</span>
                  {f.weight_kg != null && (
                    <span className="text-xs text-muted-foreground">· {f.weight_kg} kg</span>
                  )}
                  {f.packaging_type && (
                    <span className="text-xs text-muted-foreground">· {f.packaging_type}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
