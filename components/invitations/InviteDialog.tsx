'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Check, Copy, Loader2, Mail, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createInvitation } from '@/lib/actions/invitations'
import {
  INVITABLE_ROLES, PERMISSION_LABELS, permissionGroupsFor, rolePermissions,
  type Permission, type Role,
} from '@/lib/permissions'

type Props = {
  /** Invitation d'un contact client : le rôle est imposé et l'entreprise connue. */
  company?: { id: string; name: string }
  /**
   * Entreprises sélectionnables lorsqu'on invite un client depuis l'écran
   * général des utilisateurs (un client est toujours rattaché à l'une d'elles).
   */
  companies?: { id: string; name: string }[]
  triggerLabel?: string
}

type InvitableRole = Exclude<Role, 'super_admin'>

export function InviteDialog({ company, companies, triggerLabel }: Props) {
  // Invitation depuis une fiche client : le rôle et l'entreprise sont imposés.
  const isClientInvite = !!company
  const initialRole: InvitableRole = isClientInvite ? 'client_pro' : 'conditionnement'

  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [message, setMessage] = useState('')
  const [role, setRole] = useState<InvitableRole>(initialRole)
  const [companyId, setCompanyId] = useState<string>(company?.id ?? '')
  const [granted, setGranted] = useState<Set<Permission>>(
    () => new Set(rolePermissions(initialRole)),
  )
  const [link, setLink] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [copied, setCopied] = useState(false)

  const baseForRole = useMemo(() => new Set(rolePermissions(role)), [role])
  const adjustedCount = useMemo(() => {
    let n = 0
    for (const p of Object.keys(PERMISSION_LABELS) as Permission[]) {
      if (baseForRole.has(p) !== granted.has(p)) n++
    }
    return n
  }, [baseForRole, granted])

  function selectRole(next: InvitableRole) {
    setRole(next)
    // Repartir des droits du rôle : les ajustements précédents ne veulent plus
    // rien dire une fois le métier changé.
    setGranted(new Set(rolePermissions(next)))
  }

  function toggle(permission: Permission) {
    setGranted(prev => {
      const next = new Set(prev)
      if (next.has(permission)) next.delete(permission)
      else next.add(permission)
      return next
    })
  }

  function reset() {
    setEmail(''); setFirstName(''); setLastName(''); setMessage('')
    setLink(null); setEmailSent(false); setCopied(false)
    setRole(initialRole)
    setCompanyId(company?.id ?? '')
    setGranted(new Set(rolePermissions(initialRole)))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await createInvitation({
        email,
        role,
        company_id: role === 'client_pro' ? (companyId || null) : null,
        first_name: firstName || null,
        last_name: lastName || null,
        message: message || null,
        granted: Array.from(granted),
      })
      if ('error' in res) {
        toast.error('Invitation impossible', { description: res.error })
        return
      }
      setLink(res.link)
      setEmailSent(res.emailSent)
      toast.success(res.emailSent ? 'Invitation envoyée par e-mail.' : 'Lien d\'invitation créé.')
    })
  }

  async function copy() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => { setOpen(next); if (!next) reset() }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <UserPlus size={15} />
          {triggerLabel ?? (isClientInvite ? 'Inviter un contact' : 'Inviter un utilisateur')}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isClientInvite ? `Inviter un contact — ${company!.name}` : 'Inviter un utilisateur'}
          </DialogTitle>
        </DialogHeader>

        {link ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-secondary/40 p-4">
              <p className="text-sm text-foreground flex items-center gap-2">
                {emailSent ? <Mail size={15} className="text-primary" /> : null}
                {emailSent
                  ? `Invitation envoyée à ${email}.`
                  : 'Lien créé. Transmettez-le par e-mail, SMS ou messagerie.'}
              </p>
              {!emailSent && (
                <p className="text-xs text-muted-foreground mt-1">
                  L&apos;envoi automatique s&apos;activera dès que la clé Brevo sera renseignée.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Lien d&apos;invitation (valable 14 jours)</Label>
              <div className="flex gap-2">
                <Input readOnly value={link} className="text-xs font-mono" onFocus={e => e.target.select()} />
                <Button type="button" variant="outline" size="icon" onClick={copy} title="Copier">
                  {copied ? <Check size={15} className="text-primary" /> : <Copy size={15} />}
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={reset}>
                Inviter quelqu&apos;un d&apos;autre
              </Button>
              <Button type="button" className="flex-1" onClick={() => { setOpen(false); reset() }}>
                Terminé
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Adresse e-mail</Label>
              <Input
                id="invite-email" type="email" required value={email}
                onChange={e => setEmail(e.target.value)} disabled={pending}
                placeholder="prenom.nom@exemple.fr"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="invite-first">Prénom (optionnel)</Label>
                <Input id="invite-first" value={firstName} onChange={e => setFirstName(e.target.value)} disabled={pending} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-last">Nom (optionnel)</Label>
                <Input id="invite-last" value={lastName} onChange={e => setLastName(e.target.value)} disabled={pending} />
              </div>
            </div>

            {!isClientInvite && (
              <div className="space-y-2">
                <Label>Rôle de base</Label>
                <div className="grid gap-2">
                  {INVITABLE_ROLES.map(r => (
                    <label
                      key={r.value}
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        role === r.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/40'
                      }`}
                    >
                      <input
                        type="radio" name="role" className="mt-1" checked={role === r.value}
                        onChange={() => selectRole(r.value)} disabled={pending}
                      />
                      <span>
                        <span className="text-sm font-medium text-foreground block">{r.label}</span>
                        <span className="text-xs text-muted-foreground">{r.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Un client est toujours rattaché à une entreprise cliente. */}
            {!isClientInvite && role === 'client_pro' && (
              <div className="space-y-1.5">
                <Label htmlFor="invite-company">Entreprise cliente</Label>
                {companies?.length ? (
                  <>
                    <select
                      id="invite-company"
                      required
                      value={companyId}
                      onChange={e => setCompanyId(e.target.value)}
                      disabled={pending}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                    >
                      <option value="">Sélectionner une entreprise…</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      L&apos;entreprise n&apos;existe pas encore ? Créez-la depuis la page Clients,
                      puis invitez son contact.
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Aucune entreprise cliente enregistrée. Créez-la d&apos;abord depuis la page Clients.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2 pt-1">
              <div className="flex items-baseline justify-between">
                <Label>Droits accordés</Label>
                <span className="text-xs text-muted-foreground">
                  {adjustedCount === 0
                    ? 'Droits par défaut du rôle'
                    : `${adjustedCount} ajustement${adjustedCount > 1 ? 's' : ''}`}
                </span>
              </div>

              <div className="rounded-lg border border-border divide-y divide-border/60 max-h-64 overflow-y-auto">
                {permissionGroupsFor(role).map(group => (
                  <div key={group.module} className="p-3">
                    <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-2">
                      {group.module}
                    </p>
                    <div className="space-y-1.5">
                      {group.permissions.map(permission => (
                        <label key={permission} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={granted.has(permission)}
                            onChange={() => toggle(permission)}
                            disabled={pending}
                            className="accent-primary"
                          />
                          <span className={granted.has(permission) ? 'text-foreground' : 'text-muted-foreground'}>
                            {PERMISSION_LABELS[permission]}
                          </span>
                          {baseForRole.has(permission) !== granted.has(permission) && (
                            <span className="text-[10px] text-accent uppercase tracking-wide">modifié</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Les règles de sécurité de la base restent prioritaires : un compte
                conditionnement ne verra jamais les prix, même coché ici.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-message">Message d&apos;accompagnement (optionnel)</Label>
              <Textarea
                id="invite-message" rows={2} value={message} disabled={pending}
                onChange={e => setMessage(e.target.value)}
                className="resize-none text-sm"
                placeholder="Bonjour, voici votre accès à notre espace professionnel…"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={pending || !email || (role === 'client_pro' && !companyId)}
            >
              {pending && <Loader2 size={15} className="mr-2 animate-spin" />}
              Créer l&apos;invitation
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
