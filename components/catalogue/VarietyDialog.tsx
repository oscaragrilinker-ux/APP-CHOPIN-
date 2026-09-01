'use client'

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createVariety, updateVariety, setVarietyFormats } from '@/lib/actions/catalogue'
import type { FormatFull, VarietyWithFormats } from '@/types'

type Props =
  | { mode: 'create'; productId: string; allFormats: FormatFull[] }
  | {
      mode: 'edit'
      variety: Pick<VarietyWithFormats, 'id' | 'name' | 'description' | 'caliber' | 'quality_grade' | 'tva_rate' | 'variety_formats'>
      allFormats: FormatFull[]
    }

export function VarietyDialog(props: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const isEdit = props.mode === 'edit'
  const activeFormats = props.allFormats.filter(f => f.is_active)

  const initChecked = isEdit
    ? new Set(props.variety.variety_formats.map(vf => vf.format_id))
    : new Set<string>()

  const [checkedIds, setCheckedIds] = useState<Set<string>>(initChecked)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setCheckedIds(
        isEdit
          ? new Set(props.variety.variety_formats.map(vf => vf.format_id))
          : new Set<string>(),
      )
    }
  }

  function toggleFormat(id: string) {
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const formatIds = Array.from(checkedIds)

      if (isEdit) {
        const [res1, res2] = await Promise.all([
          updateVariety(props.variety.id, formData),
          setVarietyFormats(props.variety.id, formatIds),
        ])
        if ('error' in res1) { toast.error(res1.error); return }
        if ('error' in res2) { toast.error(res2.error); return }
        toast.success('Variété modifiée.')
      } else {
        const created = await createVariety(props.productId, formData)
        if ('error' in created) { toast.error(created.error); return }
        if (formatIds.length > 0) {
          const res2 = await setVarietyFormats(created.id, formatIds)
          if ('error' in res2) { toast.error(res2.error); return }
        }
        toast.success('Variété créée.')
      }

      formRef.current?.reset()
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
            <Pencil size={12} />
            Modifier
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
            <Plus size={12} />
            Variété
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {isEdit ? 'Modifier la variété' : 'Nouvelle variété'}
          </DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="vd-name">Nom *</Label>
            <Input
              id="vd-name"
              name="name"
              required
              placeholder="ex : Bintje"
              defaultValue={isEdit ? props.variety.name : ''}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vd-desc">Description</Label>
            <Textarea
              id="vd-desc"
              name="description"
              rows={2}
              placeholder="Optionnelle"
              defaultValue={isEdit ? (props.variety.description ?? '') : ''}
              disabled={pending}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="vd-caliber">Calibre</Label>
              <Input
                id="vd-caliber"
                name="caliber"
                placeholder="ex : 40/70 mm"
                defaultValue={isEdit ? (props.variety.caliber ?? '') : ''}
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vd-grade">Catégorie qualité</Label>
              <Input
                id="vd-grade"
                name="quality_grade"
                placeholder="ex : Cat I"
                defaultValue={isEdit ? (props.variety.quality_grade ?? '') : ''}
                disabled={pending}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vd-tva">
              Taux TVA (%)
              <span className="ml-1.5 text-muted-foreground font-normal text-xs">
                — hérite du produit si vide
              </span>
            </Label>
            <Input
              id="vd-tva"
              name="tva_rate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="Hérite du produit si vide"
              defaultValue={isEdit ? (props.variety.tva_rate ?? '') : ''}
              disabled={pending}
            />
          </div>

          {/* Contenants du parc */}
          <div className="space-y-2">
            <Label>
              Commercialisé en{' '}
              <span className="text-muted-foreground text-xs font-normal">(contenants du parc)</span>
            </Label>
            {activeFormats.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 px-3 rounded-md bg-muted/50 border border-border/40">
                Aucun contenant dans le parc — créez-en depuis la section Parc de formats.
              </p>
            ) : (
              <div className="rounded-md border border-border p-3 space-y-2">
                {activeFormats.map(f => (
                  <label key={f.id} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border accent-primary shrink-0"
                      checked={checkedIds.has(f.id)}
                      onChange={() => toggleFormat(f.id)}
                      disabled={pending}
                    />
                    <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">
                      {f.name}
                      {f.weight_kg != null && (
                        <span className="text-muted-foreground ml-1.5 text-xs">· {f.weight_kg} kg</span>
                      )}
                      {f.packaging_type && (
                        <span className="text-muted-foreground ml-1.5 text-xs">· {f.packaging_type}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 size={14} className="mr-1.5 animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
