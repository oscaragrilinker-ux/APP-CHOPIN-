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
import { createProduct, updateProduct } from '@/lib/actions/catalogue'
import type { ProductWithTree } from '@/types'

type Props =
  | { mode: 'create' }
  | { mode: 'edit'; product: Pick<ProductWithTree, 'id' | 'name' | 'description' | 'image_url' | 'season' | 'tva_rate'> }

export function ProductDialog(props: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const isEdit = props.mode === 'edit'

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEdit
        ? await updateProduct(props.product.id, formData)
        : await createProduct(formData)

      if ('error' in result) {
        toast.error(result.error)
        return
      }

      toast.success(isEdit ? 'Produit modifié.' : 'Produit créé.')
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
          <Button size="sm" className="h-8 gap-1.5">
            <Plus size={14} />
            Nouveau produit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {isEdit ? 'Modifier le produit' : 'Nouveau produit'}
          </DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="pd-name">Nom *</Label>
            <Input
              id="pd-name"
              name="name"
              required
              placeholder="ex : Pomme de terre"
              defaultValue={isEdit ? props.product.name : ''}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pd-desc">Description</Label>
            <Textarea
              id="pd-desc"
              name="description"
              rows={2}
              placeholder="Optionnelle"
              defaultValue={isEdit ? (props.product.description ?? '') : ''}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pd-img">URL image</Label>
            <Input
              id="pd-img"
              name="image_url"
              type="url"
              placeholder="https://…"
              defaultValue={isEdit ? (props.product.image_url ?? '') : ''}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pd-season">Saisonnalité</Label>
            <Input
              id="pd-season"
              name="season"
              placeholder="ex : Juin – Octobre"
              defaultValue={isEdit ? (props.product.season ?? '') : ''}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pd-tva">Taux TVA (%) *</Label>
            <Input
              id="pd-tva"
              name="tva_rate"
              type="number"
              required
              min="0"
              max="100"
              step="0.1"
              placeholder="ex : 5.5"
              defaultValue={isEdit ? props.product.tva_rate : ''}
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
