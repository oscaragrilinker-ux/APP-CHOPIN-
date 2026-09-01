'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FilePlus } from 'lucide-react'
import { createInvoice } from '@/lib/actions/invoices'
import { Button } from '@/components/ui/button'

export function CreateInvoiceButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  function handleClick() {
    startTransition(async () => {
      const res = await createInvoice({ order_id: orderId })
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success('Facture émise.')
        setDone(true)
        router.push(`/facturation/${res.data?.invoiceId}`)
      }
    })
  }

  if (done) return null

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      size="sm"
      className="gap-2"
    >
      <FilePlus size={14} />
      {isPending ? 'Création…' : 'Émettre la facture'}
    </Button>
  )
}
