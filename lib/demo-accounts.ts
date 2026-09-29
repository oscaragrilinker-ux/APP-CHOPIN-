import type { Role } from '@/types'

/** Comptes de démonstration accessibles depuis le sélecteur de profil (hors production). */
export type DemoAccount = {
  email: string
  label: string
  role: Role
  /** Groupe d'affichage dans le sélecteur. */
  group: 'Exploitation' | 'Atelier' | 'Clients'
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { email: 'francois.chopin@chopin-test.fr',        label: 'François Chopin',  role: 'admin',           group: 'Exploitation' },
  { email: 'laurence.chopin@chopin-test.fr',        label: 'Laurence Chopin',  role: 'admin',           group: 'Exploitation' },
  { email: 'marie.secretaire@chopin-test.fr',       label: 'Marie — secrétariat', role: 'secretaire',   group: 'Exploitation' },
  { email: 'antoine.atelier@chopin-test.fr',        label: 'Antoine — chef d\'atelier', role: 'responsable_conditionnement', group: 'Atelier' },
  { email: 'pierre.conditionnement@chopin-test.fr', label: 'Pierre — opérateur', role: 'conditionnement', group: 'Atelier' },
  { email: 'julien.conditionnement@chopin-test.fr', label: 'Julien — opérateur', role: 'conditionnement', group: 'Atelier' },
  { email: 'contact@maraicher-dupont.fr',           label: 'Maraîcher Dupont', role: 'client_pro',      group: 'Clients' },
  { email: 'direction@legumes-martin.fr',           label: 'Légumes Martin',   role: 'client_pro',      group: 'Clients' },
  { email: 'achats@primeurs-leclerc-test.fr',       label: 'Primeurs Leclerc', role: 'client_pro',      group: 'Clients' },
]
