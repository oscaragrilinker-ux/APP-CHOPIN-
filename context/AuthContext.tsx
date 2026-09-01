'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Profile, Role } from '@/types'

type AuthContextValue = {
  profile: Profile
  role: Role
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({
  profile,
  children,
}: {
  profile: Profile
  children: ReactNode
}) {
  return (
    <AuthContext.Provider value={{ profile, role: profile.role }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return ctx
}
