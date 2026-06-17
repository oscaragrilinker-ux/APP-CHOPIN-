// TODO étape 1 — Généré via: npm run types:supabase
// Contenu auto-généré par Supabase CLI après création du schéma
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: 'admin' | 'secretaire' | 'conditionnement' | 'client_pro' | 'super_admin'
    }
  }
}
