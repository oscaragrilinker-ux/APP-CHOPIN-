'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error('Connexion impossible', {
        description:
          error.message === 'Invalid login credentials'
            ? 'Identifiants incorrects. Vérifiez votre adresse e-mail et mot de passe.'
            : error.message,
      })
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-[2.75rem] leading-none text-primary">Chopin</h1>
          <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase mt-2 font-sans">
            Conditionnement
          </p>
        </div>

        {/* Carte */}
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <h2 className="text-base font-semibold text-foreground mb-5">
            Connexion à l&apos;espace professionnel
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="prenom.nom@exemple.com"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={15} className="mr-2 animate-spin" />
                  Connexion en cours…
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground/70 mt-5">
          Accès réservé aux professionnels — SCEA Chopin Conditionnement
        </p>
      </div>
    </div>
  )
}
