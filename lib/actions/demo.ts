'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { DEMO_ACCOUNTS } from '@/lib/demo-accounts'

/**
 * Bascule de profil pour les démonstrations.
 *
 * Permet de passer d'un compte de test à l'autre en un clic, sans se
 * déconnecter à la main. La session obtenue est une vraie session Supabase :
 * les offres, contre-offres et notifications sont celles de la base, vues
 * avec les droits réels du compte — rien n'est simulé.
 *
 * Désactivé en production : la fonction refuse toute demande dès que
 * NODE_ENV vaut « production », et n'accepte que les comptes de démonstration
 * listés ici, jamais une adresse arbitraire.
 */

function isDemoSwitcherEnabled(): boolean {
  return process.env.NODE_ENV !== 'production'
}

type SwitchResult = { tokenHash: string } | { error: string }

export async function getDemoSwitchToken(email: string): Promise<SwitchResult> {
  if (!isDemoSwitcherEnabled()) {
    return { error: 'Le changement de profil est désactivé en production.' }
  }
  const account = DEMO_ACCOUNTS.find(a => a.email === email)
  if (!account) return { error: 'Compte de démonstration inconnu.' }

  const service = createServiceClient()
  const { data, error } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email: account.email,
  })
  if (error || !data?.properties?.hashed_token) {
    // Journal structuré : la cause exacte doit remonter dans app.log, sinon un
    // échec en démonstration est impossible à diagnostiquer après coup.
    console.error('[demo-switch] generateLink a échoué', {
      email: account.email,
      status: error?.status,
      code: error?.code,
      message: error?.message,
    })
    return { error: error ? `${error.message}${error.code ? ` (${error.code})` : ''}` : 'Lien de connexion vide.' }
  }
  return { tokenHash: data.properties.hashed_token }
}
