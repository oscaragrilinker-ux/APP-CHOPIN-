# Plan de développement

Validé le 2026-06-17. Petites itérations, une feature à la fois.

| # | Étape | Fichiers principaux | Validation | Taille |
|---|-------|---------------------|------------|--------|
| **0** | ✅ **Init projet** | `package.json`, `tailwind.config.ts`, `globals.css`, `middleware.ts`, `CLAUDE.md` | App démarre, palette visible | **S** |
| **0.5** | ✅ **Seed data** | `supabase/seed.sql` | Données réalistes disponibles pour tests | **S** |
| **1** | ✅ **Auth & rôles** | `middleware.ts`, `lib/supabase/`, `app/(auth)/`, migration `profiles` | Login/logout fonctionnel, rôles bloquent les accès | **M** |
| **2** | ✅ **Catalogue** | `app/(app)/catalogue/`, migration `products`/`varieties`/`formats` | Admin CRUD, Secrétaire lecture seule | **M** |
| **3** | ✅ **Clients pro** | `app/(app)/clients/`, migration `clients` | Création Admin, modif coordonnées, désactivation | **M** |
| **4** | ✅ **Workflow offres** | `app/(app)/offres/`, migration `offers`/`offer_events`/`notifications` | Cycle complet offre → commande, notifs déclenchées | **L** |
| **5a** | 🟡 **Workflow commandes** | `app/(app)/commandes/`, migration `orders` | Machine d'état complète, actions par rôle | **M** |
| **5b** | 🔴 **Module PDF générique** | `lib/pdf/components/` (header, footer, page-wrapper) | Composants réutilisables, build sans erreur | **S** |
| **5c** | ✅ **Fiche palette** | `lib/pdf/pallet-sheet.tsx`, `app/api/pdf/pallet-sheet/` | PDF téléchargeable, QR code inclus | **S** |
| **6** | 🟡 **Facturation** | `app/(app)/facturation/`, `lib/pdf/invoice-document.tsx`, migration `invoices`/`payments` | Numérotation CHOP-AAAA-NNNN, statuts, upload bucket | **L** |
| **7** | 🟡 **Emails** | `emails/`, `lib/email/send.ts` | Email reçu à chaque événement déclencheur | **M** |
| **8** | 🟡 **Relances & cron** | `app/(app)/relances/`, `app/api/cron/delivery-reminder/` | Email J-1 déclenché, relance manuelle | **S** |
| **9** | 🟡 **Dashboard** | `app/(app)/dashboard/` | KPIs encaissements, CA mensuel (recharts) | **M** |
| **10** | 🔴 **Tests E2E** | `tests/` (Playwright) | Cycle offre→commande, facture→paiement, RLS, séquentialité | **M** |

Légende : ✅ fait · 🟡 partiel · 🔴 non commencé

### Ce qui manque sur les étapes partielles

| # | Reste à faire |
|---|---------------|
| 5a | Annulation de commande (le statut existe, aucune action ne l'atteint) |
| 6 | PDF de facture (`/api/pdf/invoice` encore en 501) et accès client à ses factures |
| 7 | 1 template écrit sur ~6. `RESEND_API_KEY` non renseignée, rien ne part |
| 8 | Envoi des relances et rappel J-1 (`/api/cron/delivery-reminder` en 501) |
| 9 | Graphique de CA mensuel — `recharts` installé mais jamais importé |

L'étape 5b n'a pas été réalisée telle que prévue : plutôt qu'un module PDF
générique, deux documents complets ont été écrits directement (bon de commande,
fiche palette). La mutualisation reste à faire si un troisième document arrive.

## Modules construits hors plan

Quatre modules ont été ajoutés parce que l'usage les a réclamés.

| Module | Ce qu'il apporte |
|--------|------------------|
| **Invitations** | Parcours d'entrée dans l'app : lien signé à usage unique, création ou rattachement de compte, droits ajustés par personne. Table `invitations`, `app/(auth)/invitation/`, `lib/actions/invitations.ts` |
| **Atelier** | Poste de travail tablette pour le chariot : file de préparation classée par urgence, épinglage des priorités, saisie de palette, émission des bons de livraison. Rôle `responsable_conditionnement` créé à cette occasion |
| **Transport** | Carnet de transporteurs et organisation des enlèvements : lieux, horaire, poids, récapitulatif de chargement envoyable |
| **Archives / Utilisateurs** | Recherche des commandes terminées ; gestion des comptes, des rôles et des invitations en attente |

## Données de seed (étape 0.5)

- 5 admins : Frédéric, Laurence, Benoît, François, Antoine
- 1 secrétaire de test
- 2 salariés conditionnement de test
- 3 entreprises clientes avec 1 utilisateur `client_pro` chacune
- Catalogue : 2 produits (Pommes de terre, Oignons), 4 variétés (Bintje, Charlotte, Jaune doux, Rouge), 3 formats (Carton 2,5 kg, Sac 5 kg, Big bag 25 kg)
- 2-3 offres en cours dans différents statuts
- 1 commande livrée + 1 facture émise
