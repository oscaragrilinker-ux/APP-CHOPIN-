'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { recordPayment } from '@/lib/actions/invoices'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Props = {
  invoiceId: string
  remaining: number
}

export function RecordPaymentForm({ invoiceId, remaining }: Props) {
  const [isPending, startTransition] = useTransition()
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    amount: String(remaining),
    method: 'virement',
    paid_at: today,
    reference: '',
    notes: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(form.amount.replace(',', '.'))
    if (!amount || amount <= 0) {
      toast.error('Montant invalide.')
      return
    }

    startTransition(async () => {
      const res = await recordPayment({
        invoice_id: invoiceId,
        amount,
        method: form.method as 'virement' | 'cheque' | 'especes' | 'autre',
        paid_at: form.paid_at,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
      })

      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success('Paiement enregistré.')
        setForm(f => ({ ...f, amount: '', reference: '', notes: '' }))
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="font-serif text-lg text-foreground">Enregistrer un paiement</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Montant (€)</Label>
          <Input
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="0,00"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Mode de règlement</Label>
          <Select
            value={form.method}
            onValueChange={v => setForm(f => ({ ...f, method: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="virement">Virement</SelectItem>
              <SelectItem value="cheque">Chèque</SelectItem>
              <SelectItem value="especes">Espèces</SelectItem>
              <SelectItem value="autre">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Date de règlement</Label>
          <Input
            type="date"
            value={form.paid_at}
            onChange={e => setForm(f => ({ ...f, paid_at: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Référence (optionnel)</Label>
          <Input
            value={form.reference}
            onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
            placeholder="N° virement, chèque…"
          />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? 'Enregistrement…' : 'Enregistrer le paiement'}
      </Button>
    </form>
  )
}
