'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Package, ArchiveRestore, Archive } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { FormatDialog } from './FormatDialog'
import { archiveFormat, restoreFormat } from '@/lib/actions/catalogue'
import type { FormatFull, Role } from '@/types'

type Props = {
  format: FormatFull
  role: Role
}

export function FormatRow({ format, role }: Props) {
  const [pending, startTransition] = useTransition()
  const isAdmin = role === 'admin' || role === 'super_admin'

  const meta = [
    format.packaging_type,
    format.weight_kg ? `${format.weight_kg} kg` : null,
  ].filter(Boolean).join(' · ')

  const tooltip = [
    format.material ? `Matière : ${format.material}` : null,
    format.dimensions ? `Dimensions : ${format.dimensions}` : null,
    format.description ?? null,
  ].filter(Boolean).join('\n')

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveFormat(format.id)
      if ('error' in result) toast.error(result.error)
      else toast.success('Format archivé.')
    })
  }

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreFormat(format.id)
      if ('error' in result) toast.error(result.error)
      else toast.success('Format réactivé.')
    })
  }

  const row = (
    <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/40 group">
      <Package size={13} className="shrink-0 text-muted-foreground/50" />

      <div className="flex-1 min-w-0">
        <span className="text-sm text-foreground/80">{format.name}</span>
        {meta && (
          <span className="ml-2 text-xs text-muted-foreground">{meta}</span>
        )}
        {format.sku && (
          <span className="ml-2 font-mono text-[11px] text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded">
            {format.sku}
          </span>
        )}
      </div>

      {!format.is_active && (
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground shrink-0"
        >
          Archivé
        </Badge>
      )}

      {isAdmin && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <FormatDialog mode="edit" format={format} />
          {format.is_active ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
              onClick={handleArchive}
              disabled={pending}
            >
              <Archive size={12} />
              Archiver
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
              Réactiver
            </Button>
          )}
        </div>
      )}
    </div>
  )

  if (!tooltip) return row

  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs text-xs whitespace-pre-line">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}
