'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createCarrier, updateCarrier, type CarrierInput } from '@/lib/actions/carriers'

type Props =
  | { mode: 'create' }
  | { mode: 'edit'; carrier: CarrierInput & { id: string } }

const EMPTY: CarrierInput = {
  name: '', contact_name: '', email: '', phone: '',
  address_line1: '', postal_code: '', city: '', notes: '',
}

export function CarrierDialog(props: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const isEdit = props.mode === 'edit'
  const [values, setValues] = useState<CarrierInput>(
    isEdit ? { ...EMPTY, ...props.carrier } : EMPTY,
  )

  function set<K extends keyof CarrierInput>(key: K, value: CarrierInput[K]) {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = isEdit
        ? await updateCarrier({ ...values, id: props.carrier.id })
        : await createCarrier(values)

      if ('error' in res) {
        toast.error(isEdit ? 'Modification impossible' : 'Création impossible', { description: res.error })
        return
      }
      toast.success(isEdit ? 'Transporteur mis à jour.' : 'Transporteur ajouté.')
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <Pencil size={13} />
            Modifier
          </Button>
        ) : (
          <Button size="sm" className="gap-2">
            <Plus size={15} />
            Nouveau transporteur
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le transporteur' : 'Nouveau transporteur'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="t-name">Raison sociale</Label>
            <Input
              id="t-name" required value={values.name} disabled={pending}
              onChange={e => set('name', e.target.value)} placeholder="Transports Delvaux"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-contact">Interlocuteur</Label>
              <Input
                id="t-contact" value={values.contact_name ?? ''} disabled={pending}
                onChange={e => set('contact_name', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-phone">Téléphone</Label>
              <Input
                id="t-phone" type="tel" value={values.phone ?? ''} disabled={pending}
                onChange={e => set('phone', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-email">E-mail</Label>
            <Input
              id="t-email" type="email" value={values.email ?? ''} disabled={pending}
              onChange={e => set('email', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Sert à lui envoyer le récapitulatif de chargement.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-addr">Adresse</Label>
            <Input
              id="t-addr" value={values.address_line1 ?? ''} disabled={pending}
              onChange={e => set('address_line1', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-cp">Code postal</Label>
              <Input
                id="t-cp" value={values.postal_code ?? ''} disabled={pending}
                onChange={e => set('postal_code', e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="t-city">Ville</Label>
              <Input
                id="t-city" value={values.city ?? ''} disabled={pending}
                onChange={e => set('city', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-notes">Notes (optionnel)</Label>
            <Textarea
              id="t-notes" rows={2} value={values.notes ?? ''} disabled={pending}
              onChange={e => set('notes', e.target.value)} className="resize-none text-sm"
              placeholder="Créneaux, type de véhicule, contraintes de quai…"
            />
          </div>

          <Button type="submit" className="w-full" disabled={pending || !values.name}>
            {pending && <Loader2 size={15} className="mr-2 animate-spin" />}
            {isEdit ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
