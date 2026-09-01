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
import { createCompany, updateCompany, type CompanyInput } from '@/lib/actions/clients'

type Company = CompanyInput & { id: string }

type Props =
  | { mode: 'create' }
  | { mode: 'edit'; company: Company }

const EMPTY: CompanyInput = {
  name: '', siren: '', email: '', phone: '',
  address_line1: '', address_line2: '', postal_code: '', city: '',
  payment_terms: 30, notes: '',
}

export function CompanyDialog(props: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const isEdit = props.mode === 'edit'
  const [values, setValues] = useState<CompanyInput>(
    isEdit ? { ...EMPTY, ...props.company } : EMPTY,
  )

  function set<K extends keyof CompanyInput>(key: K, value: CompanyInput[K]) {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = isEdit
        ? await updateCompany({ ...values, id: props.company.id })
        : await createCompany(values)

      if ('error' in res) {
        toast.error(isEdit ? 'Modification impossible' : 'Création impossible', { description: res.error })
        return
      }
      toast.success(isEdit ? 'Client mis à jour.' : 'Client créé.')
      setOpen(false)
      if (!isEdit && 'id' in res) router.push(`/clients/${res.id}`)
      else router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm" className="gap-2">
            <Pencil size={14} />
            Modifier
          </Button>
        ) : (
          <Button size="sm" className="gap-2">
            <Plus size={15} />
            Nouveau client
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le client' : 'Nouveau client professionnel'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Raison sociale</Label>
            <Input
              id="c-name" required value={values.name} disabled={pending}
              onChange={e => set('name', e.target.value)} placeholder="Maraîcher Dupont"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-siren">SIREN (optionnel)</Label>
              <Input
                id="c-siren" value={values.siren ?? ''} disabled={pending}
                onChange={e => set('siren', e.target.value)} placeholder="123456789"
                inputMode="numeric" maxLength={9}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-terms">Délai de paiement (jours)</Label>
              <Input
                id="c-terms" type="number" min={0} max={180} disabled={pending}
                value={values.payment_terms ?? 30}
                onChange={e => set('payment_terms', Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-email">E-mail</Label>
              <Input
                id="c-email" type="email" value={values.email ?? ''} disabled={pending}
                onChange={e => set('email', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-phone">Téléphone</Label>
              <Input
                id="c-phone" type="tel" value={values.phone ?? ''} disabled={pending}
                onChange={e => set('phone', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-addr">Adresse</Label>
            <Input
              id="c-addr" value={values.address_line1 ?? ''} disabled={pending}
              onChange={e => set('address_line1', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-cp">Code postal</Label>
              <Input
                id="c-cp" value={values.postal_code ?? ''} disabled={pending}
                onChange={e => set('postal_code', e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="c-city">Ville</Label>
              <Input
                id="c-city" value={values.city ?? ''} disabled={pending}
                onChange={e => set('city', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-notes">Notes internes (optionnel)</Label>
            <Textarea
              id="c-notes" rows={2} value={values.notes ?? ''} disabled={pending}
              onChange={e => set('notes', e.target.value)} className="resize-none text-sm"
            />
          </div>

          {!isEdit && (
            <p className="text-xs text-muted-foreground">
              Vous pourrez inviter un contact de cette entreprise juste après la création.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending || !values.name}>
            {pending && <Loader2 size={15} className="mr-2 animate-spin" />}
            {isEdit ? 'Enregistrer' : 'Créer le client'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
