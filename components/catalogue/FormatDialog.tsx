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
import { createFormat, updateFormat } from '@/lib/actions/catalogue'
import type { FormatFull } from '@/types'

type Props =
  | { mode: 'create' }
  | { mode: 'edit'; format: Pick<FormatFull, 'id' | 'name' | 'description' | 'weight_kg' | 'packaging_type' | 'material' | 'dimensions' | 'sku'> }

export function FormatDialog(props: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const isEdit = props.mode === 'edit'

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEdit
        ? await updateFormat(props.format.id, formData)
        : await createFormat(formData)

      if ('error' in result) {
        toast.error(result.error)
        return
      }

      toast.success(isEdit ? 'Format modifié.' : 'Format créé.')
      formRef.current?.reset()
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
            <Pencil size={12} />
            Modifier
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
            <Plus size={12} />
            Format
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {isEdit ? 'Modifier le format' : 'Nouveau format'}
          </DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="fd-name">Nom *</Label>
            <Input
              id="fd-name"
              name="name"
              required
              placeholder="ex : Carton 2,5 kg"
              defaultValue={isEdit ? props.format.name : ''}
              disabled={pending}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fd-weight">Poids (kg)</Label>
              <Input
                id="fd-weight"
                name="weight_kg"
                type="number"
                step="0.001"
                min="0.001"
                placeholder="2.5"
                defaultValue={isEdit ? (props.format.weight_kg ?? '') : ''}
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fd-sku">SKU / Référence</Label>
              <Input
                id="fd-sku"
                name="sku"
                placeholder="ex : PDT-BNT-025"
                defaultValue={isEdit ? (props.format.sku ?? '') : ''}
                disabled={pending}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fd-pack">Conditionnement</Label>
              <Input
                id="fd-pack"
                name="packaging_type"
                placeholder="ex : Carton"
                defaultValue={isEdit ? (props.format.packaging_type ?? '') : ''}
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fd-material">Matière</Label>
              <Input
                id="fd-material"
                name="material"
                placeholder="ex : Carton ondulé"
                defaultValue={isEdit ? (props.format.material ?? '') : ''}
                disabled={pending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fd-dims">Dimensions</Label>
            <Input
              id="fd-dims"
              name="dimensions"
              placeholder="ex : 30×20×15 cm"
              defaultValue={isEdit ? (props.format.dimensions ?? '') : ''}
              disabled={pending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fd-desc">Description</Label>
            <Textarea
              id="fd-desc"
              name="description"
              rows={2}
              placeholder="Optionnelle"
              defaultValue={isEdit ? (props.format.description ?? '') : ''}
              disabled={pending}
            />
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
