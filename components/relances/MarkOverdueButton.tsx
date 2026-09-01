'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { markInvoicesOverdue } from '@/lib/actions/invoices'
import { Button } from '@/components/ui/button'

export function MarkOverdueButton({ count }: { count: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handle() {
    startTransition(async () => {
      const res = await markInvoicesOverdue()
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success(`${res.data?.count ?? count} facture(s) marquée(s) en retard.`)
        router.refresh()
      }
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handle}
      disabled={isPending}
      className="border-red-200 text-red-700 hover:bg-red-50"
    >
      {isPending ? 'Mise à jour…' : `Marquer ${count} en retard`}
    </Button>
  )
}
