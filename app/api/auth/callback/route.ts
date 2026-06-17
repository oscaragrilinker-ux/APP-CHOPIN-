// TODO étape 1 — Supabase OAuth callback
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    // TODO: échange code → session Supabase
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
