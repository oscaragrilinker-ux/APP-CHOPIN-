'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Power } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { setCompanyActive } from '@/lib/actions/clients'

export function ToggleCompanyActive({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function apply() {
    startTransition(async () => {
      const res = await setCompanyActive({ id, isActive: !isActive })
      if ('error' in res) {
        toast.error(res.error)
        return
      }
      toast.success(isActive ? 'Client désactivé.' : 'Client réactivé.')
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={`gap-2 ${isActive ? 'text-muted-foreground hover:text-destructive' : 'text-primary'}`}
        onClick={() => setOpen(true)}
        disabled={pending}
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
        {isActive ? 'Désactiver' : 'Réactiver'}
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={isActive ? 'Désactiver ce client ?' : 'Réactiver ce client ?'}
        description={
          isActive
            ? 'Le client n\'apparaîtra plus dans les listes actives. Son historique de commandes et de factures est conservé, et vous pourrez le réactiver à tout moment.'
            : 'Le client réapparaîtra dans les listes actives et ses contacts pourront à nouveau soumettre des offres.'
        }
        confirmLabel={isActive ? 'Désactiver' : 'Réactiver'}
        destructive={isActive}
        pending={pending}
        onConfirm={apply}
      />
    </>
  )
}
