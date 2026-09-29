# APP CHOPIN — CLAUDE.md

Application métier privée pour **La Ferme des Chopin** (marque ; raison sociale à confirmer, voir `lib/brand.ts`).
Gestion des offres commerciales, commandes, préparation palette, facturation et relances clients professionnels.

## Stack technique

- **Framework** : Next.js 14.2 App Router (TypeScript strict)
- **BDD + Auth** : Supabase (PostgreSQL + RLS + Auth)
- **UI** : shadcn/ui (new-york) + Tailwind CSS (CSS vars charte Chopin)
- **Formulaires** : react-hook-form + zod
- **Tables** : @tanstack/react-table
- **Toasts** : sonner
- **Emails et SMS** : Brevo (API REST, sans SDK) + React Email, templates dans `/emails/`, wrapper `lib/email/send.ts` — `sendEmail()` et `sendSms()`. Sans `BREVO_API_KEY`, rien ne part et l'invitation reste transmissible par son lien
- **PDF** : @react-pdf/renderer côté serveur, socle commun `lib/pdf/kit.tsx`
  (charte kraft, en-tête, blocs émetteur/destinataire, tableau, totaux, pied
  légal). Chaque document se régénère à la demande depuis la base, rien n'est
  stocké. Les mentions (raison sociale, SIRET, TVA, IBAN, conditions) viennent
  de `document_settings` (migration 00022), modifiables dans Paramètres.
  - Bon de commande → `/api/bon-commande/[orderId]`, sans prix pour l'atelier
  - Devis → `/api/pdf/devis?id=` — numéro DEV-AAAA-NNNN attribué à la
    première édition (`generate_quote_number`)
  - Facture → `/api/pdf/invoice?id=` (RLS : un client ne voit que les siennes)
  - Bon de livraison → `/api/pdf/bon-livraison?order=` — « provisoire » tant
    que les numéros BL ne sont pas émis (`issueDeliveryNotesForOrder`)
  - Bon de transport → `/api/pdf/transport?order=`, réservé à l'exploitation
  - Fiche palette → `/api/pdf/pallet-sheet?id=`, QR du numéro de lot
  - Les montants passent par `fmt.euro` du kit : Helvetica n'a pas l'espace
    fine insécable de `toLocaleString('fr-FR')`, qui s'affichait « 1/125,00 »
- **Tests E2E** : Playwright
- **Déploiement** : Coolify

## Rôles utilisateurs

| Rôle | Description |
|------|-------------|
| `admin` | Accès complet à toutes les fonctions métier |
| `secretaire` | Commandes, transport, facturation, relances. Lecture seule sur les offres, ne pilote pas la préparation |
| `responsable_conditionnement` | Chef d'atelier : tout ce que fait un opérateur, plus l'ordre de passage des commandes. Sans les prix. Compte de test : `antoine.atelier@chopin-test.fr` |
| `conditionnement` | Préparation et fiches palette (sans les prix), saisie du lot |
| `client_pro` | Ses propres offres/commandes/factures uniquement |
| `super_admin` | DEV only — mêmes droits qu'admin + `activity_log` + impersonation. **Masqué côté UI.** |

La matrice complète est dans `docs/permissions.md`.

### Droits ajustés par utilisateur

Le rôle donne un jeu de droits par défaut ; un admin peut ensuite l'affiner
personne par personne au moment de l'invitation. Les écarts sont stockés dans
`profiles.permission_overrides` (jsonb) et appliqués par
`hasPermission(role, permission, overrides)`.

La RLS reste le plafond : un ajustement affine à l'intérieur du rôle, il ne le
contourne pas. Un compte conditionnement ne verra jamais les prix, même si la
case est cochée — ses données transitent par la vue `orders_for_conditionnement`
qui les exclut à la source.

### Entrée dans l'application

Le site public (`site-vitrine/`, port 3007) porte un formulaire « Demander un
accès » : e-mail, entreprise, vœux de commande. Il écrit dans `access_requests`
(migration 00021) avec la clé publique, dont le seul droit est l'insertion
d'une demande vierge. Un admin la voit dans `/utilisateurs` et, d'un clic,
crée l'entreprise et l'invitation ; le lien reste affiché tant que
l'invitation n'est ni acceptée ni révoquée.

Personne ne s'inscrit seul. Un admin invite un client (rattaché à une
entreprise créée au préalable) ou un salarié ; le destinataire reçoit un lien
signé à usage unique, valable 14 jours, qui crée son compte ou le rattache s'il
en a déjà un. Voir `lib/actions/invitations.ts` et `app/(auth)/invitation/`.

## Conventions

### Structure de dossiers

```
app/(auth)/         → login + page publique d'invitation /invitation/[token]
app/(app)/          → pages protégées (shell sidebar)
app/api/            → routes API (pdf, bon-commande, cron, auth)
components/ui/      → composants shadcn/ui (ne pas modifier manuellement)
components/<module>/→ composants métier, un dossier par module
                      (offres, commandes, clients, catalogue, facturation,
                       relances, archives, atelier, transporteurs,
                       invitations, layout)
context/            → AuthContext (rôle et profil courants côté client)
hooks/              → hooks React (useNotifications : temps réel Supabase)
emails/             → templates React Email
lib/actions/        → server actions, une par domaine métier
                      (offers, orders, invoices, catalogue, clients,
                       invitations, carriers, logistics)
lib/supabase/       → clients Supabase (client.ts, server.ts, service.ts)
lib/email/          → wrapper Resend + composeurs par événement
lib/pdf/            → composants @react-pdf/renderer (bon-commande, pallet-sheet)
lib/utils/          → utilitaires métier (price.ts : calculs et formats)
lib/permissions.ts  → matrice de permissions as code (source de vérité applicative)
lib/brand.ts        → identité : marque affichée (`name`) ≠ raison sociale (`legalName`).
                      Source unique du nom — ne jamais l'écrire en dur ailleurs
types/              → types TypeScript (database.ts auto-généré, index.ts métier)
supabase/           → migrations SQL, seed et tests RLS
```

Les pages métier vivent sous `app/(app)/` : `dashboard`, `offres`, `commandes`,
`atelier`, `catalogue`, `clients`, `transporteurs`, `facturation`, `relances`,
`archives`, `utilisateurs`, `parametres`, `compte`.

**Archives** : une offre archivée (`offers.archived_at`, action
`archiveOffers`) quitte la liste des négociations et se retrouve dans
`/archives`, classée par client puis par mois ; rien n'est supprimé, et
`unarchiveOffers` la remet en jeu.

### Règles de code

- TypeScript strict, pas de `any`
- CSS via Tailwind + CSS vars uniquement (jamais de hex en dur dans les composants)
- Permissions vérifiées **côté serveur** (RLS Supabase) ET via `lib/permissions.ts`
- Actions destructives toujours derrière un `<ConfirmDialog>`
  (`components/ui/confirm-dialog.tsx`), jamais `window.confirm`
- Statuts affichés via les badges dédiés `<OfferStatusBadge>`,
  `<OrderStatusBadge>`, `<InvoiceStatusBadge>`
- PDF uniquement côté serveur (jamais côté client)
- Emails uniquement via `lib/email/send.ts`
- Pas de `console.log` en production — utiliser des logs structurés
- Le client `service_role` (`lib/supabase/service.ts`) impose `cache: 'no-store'` :
  Next.js instrumente `fetch()` et mettrait en cache les réponses PostgREST

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
npm run types:supabase   # Regénérer types Supabase (projet distant, auth requise)
npm run test:e2e         # Tests Playwright
```

## Pièges connus

**Ne pas lancer `npm run build` pendant que `npm run dev` tourne.** Les deux
partagent `.next` ; le serveur de développement se retrouve cassé avec des pages
introuvables. Arrêter le dev, compiler, relancer.

**Ne pas utiliser `supabase db push`.** L'historique distant a été écrit via MCP :
les versions distantes des migrations 13 à 18 sont des horodatages
(`20260618103834`…) qui ne correspondent pas aux noms de fichiers locaux
(`00013_…`). `db push` les croirait non appliquées et les rejouerait en
production. Appliquer chaque migration explicitement, une par une.

**Une valeur d'enum fraîchement ajoutée ne peut pas servir dans la même
transaction.** C'est pourquoi `00019` (ajout de `responsable_conditionnement`)
est séparée de `00020` qui l'utilise. Dans les policies, comparer via
`get_user_role()::text` pour éviter le problème.

**`CREATE OR REPLACE VIEW` n'ajoute des colonnes qu'en fin de liste.** Pour
insérer une colonne au milieu, il faut `DROP VIEW` puis `CREATE VIEW` — et
rétablir le `GRANT SELECT` que le DROP efface.

**`site-vitrine/` est une application Next distincte** imbriquée dans ce dépôt,
exclue du `tsconfig` de l'app métier. Son code est versionné ; seuls ses
`node_modules/` et `.next/` sont ignorés. Elle partage la palette et les
polices (Anton · Archivo · Caveat) et tourne sur le port 3007. Son
`.env.local` porte `NEXT_PUBLIC_APP_URL` (lien « Espace commande ») et les
deux clés publiques Supabase (dépôt des demandes d'accès).

**Un seul serveur de dev par application.** Un `next dev` orphelin qui partage
`.next` avec un second corrompt le cache et fige le serveur : avant de relancer,
tuer *tous* les processus `next` de l'app, attendre que le port se libère,
puis vider `.next`.

**Le cache de Safari survit aux remplacements de fichiers.** Une image ou une
feuille remplacée sous le même nom peut rester servie depuis le cache : changer
le nom du fichier, ou tester en navigation privée.

## Variables d'environnement

Voir `.env.example`. Copier vers `.env.local` et renseigner les valeurs.

## Plan de développement

Voir `docs/plan.md`.
