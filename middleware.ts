import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type Role = 'admin' | 'secretaire' | 'conditionnement' | 'client_pro' | 'super_admin'

const PUBLIC_ROUTES = ['/login', '/auth/callback']

const ROUTE_PERMISSIONS: Record<string, Role[]> = {
  '/offres/nouvelle':  ['client_pro'],
  '/offres':           ['admin', 'secretaire', 'super_admin'],
  '/commandes':        ['admin', 'secretaire', 'conditionnement', 'super_admin'],
  '/catalogue':        ['admin', 'secretaire', 'conditionnement', 'client_pro', 'super_admin'],
  '/clients':          ['admin', 'secretaire', 'super_admin'],
  '/facturation':      ['admin', 'secretaire', 'super_admin'],
  '/relances':         ['admin', 'secretaire', 'super_admin'],
  '/dashboard':        ['admin', 'secretaire', 'super_admin'],
}

function getHomeForRole(role: Role): string {
  switch (role) {
    case 'client_pro':      return '/offres'
    case 'conditionnement': return '/commandes'
    default:                return '/dashboard'
  }
}

export async function middleware(request: NextRequest) {
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

  if (PUBLIC_ROUTES.some((r) => path.startsWith(r))) {
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
    if (path.startsWith(routePrefix)) {
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
