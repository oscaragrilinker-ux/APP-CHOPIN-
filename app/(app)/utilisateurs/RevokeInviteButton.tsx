'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { revokeInvitation } from '@/lib/actions/invitations'

export function RevokeInviteButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="sm"
      className="shrink-0 text-muted-foreground hover:text-destructive gap-1.5"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await revokeInvitation({ id })
          if ('error' in res) toast.error(res.error)
          else {
            toast.success('Invitation annulée.')
            router.refresh()
          }
        })
      }
    >
      {pending ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
      Annuler
    </Button>
  )
}
