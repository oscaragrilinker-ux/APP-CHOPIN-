import { createClient } from '@supabase/supabase-js'

/**
 * Client à privilèges service_role : contourne la RLS, réservé aux server
 * actions et routes serveur.
 *
 * Le `cache: 'no-store'` est indispensable : Next.js instrumente fetch() en
 * App Router et mettrait en cache les réponses PostgREST. Une invitation
 * déjà consommée ou un rôle fraîchement modifié continueraient alors d'être
 * lus dans leur état précédent.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
      },
    }
  )
}
