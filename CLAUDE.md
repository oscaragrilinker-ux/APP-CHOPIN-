# APP CHOPIN — CLAUDE.md

Application métier privée pour **SCEA Chopin Conditionnement**.
Gestion des offres commerciales, commandes, préparation palette, facturation et relances clients professionnels.

## Stack technique

- **Framework** : Next.js 14.2 App Router (TypeScript strict)
- **BDD + Auth** : Supabase (PostgreSQL + RLS + Auth)
- **UI** : shadcn/ui (new-york) + Tailwind CSS (CSS vars charte Chopin)
- **Formulaires** : react-hook-form + zod
- **Tables** : @tanstack/react-table
- **Toasts** : sonner
- **Emails** : Resend + React Email, templates dans `/emails/`, wrapper `lib/email/send.ts`
- **PDF** : @react-pdf/renderer côté serveur
  - Fiches palette → stream direct (route GET `/api/pdf/pallet-sheet`)
  - Factures → upload Supabase Storage bucket `invoices` + URL signée
- **Tests E2E** : Playwright
- **Déploiement** : Coolify

## Rôles utilisateurs

| Rôle | Description |
|------|-------------|
| `admin` | Accès complet à toutes les fonctions métier |
| `secretaire` | Accès étendu sauf actions destructives |
| `conditionnement` | Commandes uniquement (sans prix), saisie lot, fiche palette |
| `client_pro` | Ses propres offres/commandes/factures uniquement |
| `super_admin` | DEV only — mêmes droits qu'admin + `activity_log` + impersonation. **Masqué côté UI.** |

La matrice complète est dans `docs/permissions.md`.

## Conventions

### Structure de dossiers

```
app/(auth)/         → pages login/callback
app/(app)/          → pages protégées (shell sidebar)
app/api/            → routes API (pdf, cron, auth)
components/ui/      → composants shadcn/ui (ne pas modifier manuellement)
components/shared/  → composants métier partagés
emails/             → templates React Email
lib/supabase/       → clients Supabase (client.ts, server.ts)
lib/email/          → wrapper Resend
lib/pdf/            → composants @react-pdf/renderer
lib/permissions.ts  → matrice de permissions as code
types/              → types TypeScript (database.ts auto-généré, index.ts métier)
supabase/           → migrations SQL et seed
```

### Règles de code

- TypeScript strict, pas de `any`
- CSS via Tailwind + CSS vars uniquement (jamais de hex en dur dans les composants)
- Permissions vérifiées **côté serveur** (RLS Supabase) ET via `lib/permissions.ts`
- Actions destructives toujours derrière un `<ConfirmDialog>`
- Statuts affichés via `<StatusBadge>` avec couleurs des CSS vars `--status-*`
- PDF uniquement côté serveur (jamais côté client)
- Emails uniquement via `lib/email/send.ts`
- Pas de `console.log` en production — utiliser des logs structurés

### Palette couleurs Chopin

| Token | Mode clair | Hex source |
|-------|-----------|-----------|
| `--primary` | `144 33% 18%` | `#1F3D2B` vert forêt |
| `--accent` | `39 40% 54%` | `#B8975A` doré |
| `--secondary` | `42 40% 94%` | `#F5F1E8` crème |
| `--background` | `45 43% 96%` | `#FAF8F2` blanc cassé |

## Commandes utiles

```bash
npm run dev              # Dev server (PWA désactivé)
npm run build            # Build production
npm run lint             # ESLint
npm run format           # Prettier
npm run types:supabase   # Regénérer types Supabase
npm run test:e2e         # Tests Playwright
```

## Variables d'environnement

Voir `.env.example`. Copier vers `.env.local` et renseigner les valeurs.

## Plan de développement

Voir `docs/plan.md`.
