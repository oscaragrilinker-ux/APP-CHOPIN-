import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { getInvitation } from '@/lib/actions/invitations'
import { AcceptInvitationForm } from './AcceptInvitationForm'

export const metadata = { title: 'Invitation — Chopin Conditionnement' }
export const dynamic = 'force-dynamic'

export default async function InvitationPage({ params }: { params: { token: string } }) {
  const result = await getInvitation(params.token)

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-[2.75rem] leading-none text-primary">Chopin</h1>
          <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase mt-2 font-sans">
            Conditionnement
          </p>
        </div>

        {'error' in result ? (
          <div className="bg-card rounded-lg border border-border shadow-sm p-6 text-center">
            <AlertCircle size={22} className="text-destructive mx-auto mb-3" />
            <p className="text-sm text-foreground mb-1">Invitation indisponible</p>
            <p className="text-sm text-muted-foreground">{result.error}</p>
            <Link href="/login" className="text-sm text-primary hover:underline mt-4 inline-block">
              Aller à la connexion →
            </Link>
          </div>
        ) : (
          <AcceptInvitationForm token={params.token} invitation={result.invitation} />
        )}

        <p className="text-center text-xs text-muted-foreground/70 mt-5">
          Accès réservé aux professionnels — SCEA Chopin Conditionnement
        </p>
      </div>
    </div>
  )
}
