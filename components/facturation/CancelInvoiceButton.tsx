'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cancelInvoice } from '@/lib/actions/invoices'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function CancelInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleCancel() {
    startTransition(async () => {
      const res = await cancelInvoice(invoiceId)
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success('Facture annulée.')
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isPending}
        className="text-destructive border-destructive/40 hover:bg-destructive/10"
      >
        {isPending ? 'Annulation…' : 'Annuler la facture'}
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Annuler cette facture ?"
        description="La facture passera en statut annulé et ne sera plus comptée dans les encaissements. Son numéro reste réservé : la piste d'audit comptable est conservée. Cette action est irréversible."
        confirmLabel="Annuler la facture"
        cancelLabel="Revenir"
        destructive
        pending={isPending}
        onConfirm={handleCancel}
      />
    </>
  )
}
