# Supabase — Guide développeur

## 1. Créer le projet Supabase

1. Aller sur [supabase.com/dashboard](https://supabase.com/dashboard)
2. Cliquer **New project**
3. Renseigner :
   - **Name** : `chopin-conditionnement`
   - **Database password** : générer un mot de passe fort, le noter dans `.env.local`
   - **Region** : `West EU (Ireland)` ou `Central EU (Frankfurt)`
4. Attendre la création (~2 min)

---

## 2. Configurer les variables d'environnement

Dans le dashboard Supabase → **Settings → API** :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

Copier `.env.example` vers `.env.local` et renseigner ces 3 valeurs.

---

## 3. Appliquer les migrations

### Option A — Dashboard SQL Editor (recommandé pour démarrer)

Exécuter dans l'ordre dans **SQL Editor → New query** :

```
1. supabase/migrations/00000_extensions.sql
2. supabase/migrations/00001_enums.sql
3. supabase/migrations/00002_tables.sql
4. supabase/migrations/00003_functions_triggers.sql
5. supabase/migrations/00004_rls_policies.sql
```

### Option B — Supabase CLI

```bash
# Installer le CLI
npm install -g supabase

# Lier au projet (récupère le project-ref dans Settings → General)
supabase link --project-ref xxxxxxxxxxxxxx

# Appliquer toutes les migrations
supabase db push
```

---

## 4. Appliquer le seed (données de test)

Uniquement en développement/staging, **jamais en production**.

```bash
# Via le Dashboard SQL Editor
# Copier-coller le contenu de supabase/seed.sql et exécuter

# Via le CLI (après supabase link)
supabase db seed
```

> **Note** : le seed insère les utilisateurs directement dans `auth.users`
> avec les mots de passe hashés en bcrypt. L'email est automatiquement
> confirmé (`email_confirmed_at = now()`).

---

## 5. Réinitialiser proprement (dev uniquement)

```sql
-- Dans SQL Editor, supprimer dans l'ordre inverse des FK :
TRUNCATE public.notifications, public.activity_log,
  public.payments, public.invoices,
  public.pallet_sheets, public.orders,
  public.offer_rounds, public.offers,
  public.client_users, public.companies,
  public.formats, public.varieties, public.products,
  public.profiles
  RESTART IDENTITY CASCADE;

-- Supprimer les utilisateurs de test (adapté si UUIDs changent)
DELETE FROM auth.users WHERE email LIKE '%chopin-test.fr' OR email LIKE '%chopin-app.fr';

-- Remettre le compteur de factures à 0
UPDATE public.sequence_counters SET value = 0 WHERE name = 'invoice';

-- Réappliquer le seed
```

---

## 6. Regénérer types/database.ts

Après chaque modification de schéma :

```bash
npm run types:supabase
```

Ce script appelle :
```
supabase gen types typescript --project-id xxxxxxxxxxxxxx > types/database.ts
```

(Project ID visible dans Settings → General)

Mettre à jour `scripts.types:supabase` dans `package.json` avec le bon project-id.

---

## 7. Créer le bucket Storage pour les factures

Dans le dashboard → **Storage → New bucket** :

- **Name** : `invoices`
- **Public** : NON (privé, accès via URL signée)
- **File size limit** : 10 MB
- **Allowed MIME types** : `application/pdf`

Policy RLS sur le bucket (à créer dans Storage → Policies) :
```sql
-- Lecture : admin, secrétaire, et client propriétaire de la facture
-- Upload : admin/secrétaire uniquement (via route /api/pdf/invoice)
```

---

## 8. Comptes de test

| Email | Rôle | Mot de passe |
|-------|------|-------------|
| frederic.chopin@chopin-test.fr | admin | ChopinTest2026! |
| laurence.chopin@chopin-test.fr | admin | ChopinTest2026! |
| benoit.chopin@chopin-test.fr | admin | ChopinTest2026! |
| francois.chopin@chopin-test.fr | admin | ChopinTest2026! |
| antoine.chopin@chopin-test.fr | admin | ChopinTest2026! |
| marie.secretaire@chopin-test.fr | secretaire | ChopinTest2026! |
| pierre.conditionnement@chopin-test.fr | conditionnement | ChopinTest2026! |
| julien.conditionnement@chopin-test.fr | conditionnement | ChopinTest2026! |
| contact@maraicher-dupont.fr | client_pro | ChopinTest2026! |
| achats@primeurs-leclerc-test.fr | client_pro | ChopinTest2026! |
| direction@legumes-martin.fr | client_pro | ChopinTest2026! |
| dev@chopin-app.fr | super_admin | ChopinTest2026! |

---

## 9. Données de test disponibles après seed

- **3 offres** : 1 pending (Dupont), 1 counter_proposed avec 2 rounds (Leclerc), 1 accepted (Martin)
- **1 commande livrée** : issue de l'offre Martin, fiche palette LOT-2026-xxxx-001
- **1 facture émise** : CHOP-2026-0001, 97,06 € TTC (5,5% TVA), échéance +30 jours
- **3 notifications** : 1 non lue Frédéric (nouvelle offre), 1 lue Sophie (contre-proposition), 1 non lue Jean-Paul (facture)
