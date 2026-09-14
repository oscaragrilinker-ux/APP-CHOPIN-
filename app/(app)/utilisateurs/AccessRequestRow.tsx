'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Check, Copy, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  acceptAccessRequest,
  declineAccessRequest,
  type AccessRequestRow as Row,
} from '@/lib/actions/access-requests'

/**
 * Une demande d'accès venue du site public, et les deux décisions possibles.
 *
 * Accepter crée l'entreprise et l'invitation en un geste. Le lien vient
 * ensuite du serveur, pas de l'état du bouton : il reste affiché après un
 * rechargement, tant que l'invitation n'est ni acceptée ni révoquée. Si
 * l'e-mail n'est pas parti (messagerie non configurée), c'est ce lien que
 * l'admin transmet lui-même.
 */
export function AccessRequestRow({ request }: { request: Row }) {
  const [pending, start] = useTransition()
  const [declineOpen, setDeclineOpen] = useState(false)
  const [link, setLink] = useState<string | null>(request.invitation_link ?? null)
  const [emailSent, setEmailSent] = useState<boolean | null>(null)
  const [copied, setCopied] = useState(false)

  const invited = request.status === 'invited' || link !== null

  function accept() {
    start(async () => {
      const res = await acceptAccessRequest({ id: request.id })
      if ('error' in res) { toast.error(res.error); return }
      setLink(res.link)
      setEmailSent(res.emailSent)
      toast.success(res.emailSent ? 'Client créé, invitation envoyée par e-mail.' : 'Client créé, lien d’invitation prêt.')
    })
  }

  function decline() {
    start(async () => {
      const res = await declineAccessRequest({ id: request.id })
      if ('error' in res) { toast.error(res.error); return }
      setDeclineOpen(false)
      toast.success('Demande déclinée.')
    })
  }

  async function copy() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-foreground">
            <span className="font-medium">{request.company_name}</span>
            {request.contact_name ? <span className="text-muted-foreground"> · {request.contact_name}</span> : null}
            {invited && (
              <span className="ml-2 rounded-sm bg-primary/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                Invitée
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {request.email}
            {request.phone ? ` · ${request.phone}` : ''}
            {' · reçue le '}
            {format(new Date(request.created_at), 'd MMMM yyyy', { locale: fr })}
          </p>
          {request.wishes && (
            <p className="text-sm text-foreground/80 whitespace-pre-line border-l-2 border-accent/50 pl-3 mt-2">
              {request.wishes}
            </p>
          )}
        </div>

        {!invited && (
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" disabled={pending} onClick={() => setDeclineOpen(true)}>
              Décliner
            </Button>
            <Button size="sm" disabled={pending} onClick={accept}>
              <Mail size={14} className="mr-1.5" />
              Créer le client et inviter
            </Button>
          </div>
        )}
      </div>

      {link && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
          <p className="text-xs text-foreground">
            {emailSent === true
              ? `Invitation envoyée à ${request.email}. Le lien reste disponible ci-dessous.`
              : emailSent === false
                ? 'Lien créé — l’e-mail n’est pas parti (messagerie non configurée). Transmettez-le vous-même :'
                : 'Lien d’invitation en cours de validité. Si l’e-mail n’est pas parvenu, transmettez-le :'}
          </p>
          <div className="flex gap-2">
            <Input readOnly value={link} className="text-xs font-mono" onFocus={e => e.target.select()} />
            <Button type="button" variant="outline" size="icon" onClick={copy} title="Copier">
              {copied ? <Check size={15} className="text-primary" /> : <Copy size={15} />}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={declineOpen}
        onOpenChange={setDeclineOpen}
        title="Décliner cette demande ?"
        description={`${request.company_name} (${request.email}) ne recevra pas d’invitation. La demande reste consultable mais ne sera plus proposée.`}
        confirmLabel="Décliner"
        destructive
        pending={pending}
        onConfirm={decline}
      />
    </div>
  )
}
