import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type Role =
  | 'admin'
  | 'secretaire'
  | 'conditionnement'
  | 'responsable_conditionnement'
  | 'client_pro'
  | 'super_admin'

// '/invitation' est public : le destinataire n'a pas encore de session, c'est
// précisément l'écran qui lui en crée une.
const PUBLIC_ROUTES = ['/login', '/auth/callback', '/api/auth/callback', '/invitation']

// Routes machine-à-machine : elles n'ont pas de session utilisateur et portent
// leur propre authentification (CRON_SECRET). Sans cette exemption, le
// middleware les redirigerait vers /login avant qu'elles ne s'exécutent.
const MACHINE_ROUTES = ['/api/cron']

// Routes restreintes par rôle.
// Une route non listée ici est accessible à tout utilisateur connecté.
// Ordre important : les préfixes plus spécifiques doivent précéder les préfixes plus courts.
const ROUTE_PERMISSIONS: Record<string, Role[]> = {
  '/offres/nouvelle': ['client_pro'],
  '/offres': ['admin', 'secretaire', 'super_admin', 'client_pro'],
  '/commandes': ['admin', 'secretaire', 'conditionnement', 'responsable_conditionnement', 'super_admin', 'client_pro'],
  '/atelier': ['admin', 'secretaire', 'super_admin', 'conditionnement', 'responsable_conditionnement'],
  '/transporteurs': ['admin', 'secretaire', 'super_admin'],
  '/catalogue': ['admin', 'secretaire', 'conditionnement', 'responsable_conditionnement', 'client_pro', 'super_admin'],
  '/clients': ['admin', 'secretaire', 'super_admin'],
  '/facturation': ['admin', 'secretaire', 'super_admin'],
  '/relances': ['admin', 'secretaire', 'super_admin'],
  '/archives': ['admin', 'secretaire', 'super_admin'],
  '/dashboard': ['admin', 'secretaire', 'super_admin', 'conditionnement', 'responsable_conditionnement', 'client_pro'],
  '/utilisateurs': ['admin', 'super_admin'],
  '/parametres': ['admin', 'super_admin'],
  '/compte': ['admin', 'secretaire', 'conditionnement', 'responsable_conditionnement', 'client_pro', 'super_admin'],
}

function getHomeForRole(role: Role): string {
  return '/dashboard'
}

export async function middleware(request: NextRequest) {
  if (MACHINE_ROUTES.some(r => request.nextUrl.pathname.startsWith(r))) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: ((cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        }) as CookieMethodsServer['setAll'],
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  if (PUBLIC_ROUTES.some(r => path.startsWith(r))) {
    return supabaseResponse
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as Role | undefined

  if (!role) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  for (const [routePrefix, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (path === routePrefix || path.startsWith(routePrefix + '/')) {
      if (!allowedRoles.includes(role)) {
        return NextResponse.redirect(new URL(getHomeForRole(role), request.url))
      }
      break
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|webp)$).*)'],
}
