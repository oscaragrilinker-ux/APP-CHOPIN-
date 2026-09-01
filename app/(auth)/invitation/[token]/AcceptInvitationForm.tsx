'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { acceptInvitation, type InvitationPreview } from '@/lib/actions/invitations'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  secretaire: 'Secrétaire',
  conditionnement: 'Conditionnement',
  client_pro: 'Client professionnel',
  super_admin: 'Super Admin',
}

export function AcceptInvitationForm({
  token,
  invitation,
}: {
  token: string
  invitation: InvitationPreview
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [firstName, setFirstName] = useState(invitation.firstName ?? '')
  const [lastName, setLastName] = useState(invitation.lastName ?? '')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  // Coordonnées d'entreprise : l'admin a créé la fiche, le client la complète.
  const [address, setAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [city, setCity] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')

  const needsPassword = !invitation.hasAccount

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (needsPassword && password !== confirm) {
      toast.error('Les deux mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)

    const res = await acceptInvitation({
      token,
      password: needsPassword ? password : undefined,
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
      company: invitation.needsCompanyDetails
        ? { address_line1: address || null, postal_code: postalCode || null, city: city || null, phone: companyPhone || null }
        : null,
    })

    if ('error' in res) {
      toast.error('Activation impossible', { description: res.error })
      setLoading(false)
      return
    }

    // Compte prêt : on ouvre directement la session si le mot de passe vient
    // d'être défini, sinon on renvoie vers la connexion habituelle.
    if (needsPassword) {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email: res.email, password })
      if (!error) {
        toast.success('Bienvenue chez Chopin Conditionnement.')
        router.push('/')
        router.refresh()
        return
      }
    }

    toast.success('Votre accès est activé. Connectez-vous pour continuer.')
    router.push('/login')
  }

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm p-6">
      <h2 className="text-base font-semibold text-foreground">
        {invitation.hasAccount ? 'Confirmer votre accès' : 'Créer votre compte'}
      </h2>
      <p className="text-sm text-muted-foreground mt-1">
        {invitation.email} · {ROLE_LABELS[invitation.role] ?? invitation.role}
        {invitation.companyName && ` · ${invitation.companyName}`}
      </p>

      {invitation.message && (
        <p className="text-sm text-foreground/80 border-l-2 border-accent bg-secondary/40 px-3 py-2 mt-4 italic">
          {invitation.message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 mt-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">Prénom</Label>
            <Input id="firstName" required value={firstName} onChange={e => setFirstName(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Nom</Label>
            <Input id="lastName" required value={lastName} onChange={e => setLastName(e.target.value)} disabled={loading} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Téléphone (optionnel)</Label>
          <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} disabled={loading} />
        </div>

        {needsPassword && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password" type="password" required minLength={8} autoComplete="new-password"
                value={password} onChange={e => setPassword(e.target.value)} disabled={loading}
                placeholder="8 caractères minimum"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirmer le mot de passe</Label>
              <Input
                id="confirm" type="password" required minLength={8} autoComplete="new-password"
                value={confirm} onChange={e => setConfirm(e.target.value)} disabled={loading}
              />
            </div>
          </>
        )}

        {invitation.needsCompanyDetails && (
          <div className="pt-2 border-t border-border/60 space-y-4">
            <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground pt-3">
              Coordonnées de {invitation.companyName ?? 'votre entreprise'}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="address">Adresse</Label>
              <Input id="address" value={address} onChange={e => setAddress(e.target.value)} disabled={loading} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="postalCode">Code postal</Label>
                <Input id="postalCode" value={postalCode} onChange={e => setPostalCode(e.target.value)} disabled={loading} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="city">Ville</Label>
                <Input id="city" value={city} onChange={e => setCity(e.target.value)} disabled={loading} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="companyPhone">Téléphone de l&apos;entreprise</Label>
              <Input id="companyPhone" type="tel" value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} disabled={loading} />
            </div>
          </div>
        )}

        <Button type="submit" className="w-full mt-2" disabled={loading}>
          {loading && <Loader2 size={15} className="mr-2 animate-spin" />}
          {invitation.hasAccount ? 'Confirmer mon accès' : 'Créer mon compte'}
        </Button>
      </form>
    </div>
  )
}
