'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Power } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { setCarrierActive } from '@/lib/actions/carriers'

export function ToggleCarrierActive({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function apply() {
    startTransition(async () => {
      const res = await setCarrierActive({ id, isActive: !isActive })
      if ('error' in res) {
        toast.error(res.error)
        return
      }
      toast.success(isActive ? 'Transporteur désactivé.' : 'Transporteur réactivé.')
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={`gap-1.5 ${isActive ? 'text-muted-foreground hover:text-destructive' : 'text-primary'}`}
        onClick={() => setOpen(true)}
        disabled={pending}
      >
        {pending ? <Loader2 size={13} className="animate-spin" /> : <Power size={13} />}
        {isActive ? 'Désactiver' : 'Réactiver'}
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={isActive ? 'Désactiver ce transporteur ?' : 'Réactiver ce transporteur ?'}
        description={
          isActive
            ? 'Il ne sera plus proposé au moment d\'organiser un transport. Les commandes déjà rattachées le conservent.'
            : 'Il sera de nouveau proposé lors de l\'organisation des transports.'
        }
        confirmLabel={isActive ? 'Désactiver' : 'Réactiver'}
        destructive={isActive}
        pending={pending}
        onConfirm={apply}
      />
    </>
  )
}
