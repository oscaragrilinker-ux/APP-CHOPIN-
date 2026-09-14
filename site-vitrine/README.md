# CHOPIN Conditionnement — Site vitrine

Site vitrine multi-pages pour **SCEA Chopin**, unité de conditionnement de pommes de terre et d'oignons à Beaumetz-lès-Cambrai (Hauts-de-France).

**Stack :** Next.js 14 · App Router · TypeScript strict · Tailwind CSS · Lucide React · Formspree

---

## Installation & lancement

```bash
cd site-vitrine
npm install
npm run dev        # Démarre sur http://localhost:3007
npm run build      # Build de production
npm run start      # Démarre en mode production
```

---

## Pages

| Route | Titre |
|-------|-------|
| `/` | Accueil |
| `/usine` | L'usine de conditionnement |
| `/histoire` | Notre histoire |
| `/produits` | Pommes de terre & oignons |
| `/contact` | Contact + formulaire |

---

## À personnaliser — `site.config.ts`

**Toutes les valeurs ajustables sont centralisées dans ce fichier unique.** Ne modifiez rien ailleurs.

| Constante | Valeur par défaut | À remplacer par |
|-----------|-------------------|-----------------|
| `contactPhone` | `+33 3 00 00 00 00` | Le vrai numéro de téléphone |
| `contactEmail` | `contact@fermedeschopin.fr` | L'email de contact réel |
| `formspreeId` | `xxxxxxxx` | Votre ID Formspree ([créer un compte](https://formspree.io)) |
| `orderAppUrl` | `/app` | L'URL de l'espace commande (app interne ou domaine) |
| `contactPhone` | — | Numéro cliquable dans le header/footer/contact |

### Obtenir un ID Formspree

1. Créer un compte sur [formspree.io](https://formspree.io)
2. Créer un formulaire avec l'email de destination
3. Copier l'ID (8 caractères) dans `formspreeId`

---

## Images à fournir

Remplacez les fichiers SVG placeholder par les vraies photos. **Format recommandé : JPG, largeur ≥ 1200px.**

Renommez-les avec l'extension `.svg` → `.jpg` **ET** mettez à jour les `src` correspondants dans les composants si vous changez d'extension.

> Astuce : si vous fournissez des `.jpg`, changez les `src` dans les pages concernées.

### Photos produits

| Chemin | Contenu |
|--------|---------|
| `public/images/produits/pommes-de-terre.svg` | Photo de caisses de pommes de terre conditionnées |
| `public/images/produits/oignons.svg` | Photo de caisses d'oignons conditionnés |

### Photos usine (parcours du légume)

| Chemin | Étape | Contenu suggéré |
|--------|-------|-----------------|
| `public/images/usine/etape-1.svg` | Réception | Camion ou tracteur arrivant avec légumes |
| `public/images/usine/etape-2.svg` | Tri & nettoyage | Chaîne de brossage/tri |
| `public/images/usine/etape-3.svg` | Calibrage | Machine de calibrage en action |
| `public/images/usine/etape-4.svg` | Contrôle qualité | Personne inspectant les légumes |
| `public/images/usine/etape-5.svg` | Conditionnement | Mise en caisses 2,5 kg |
| `public/images/usine/etape-6.svg` | Expédition | Palettes prêtes au chargement |

### Logo

| Chemin | Usage |
|--------|-------|
| `public/logo/chopin-logo.svg` | Header, footer (actuellement remplacé par version typographique CSS) |
| `public/favicon.svg` | Onglet navigateur |

---

## Déploiement

Ce projet est **indépendant** de l'app de commandes. Il se déploie séparément (Coolify, Vercel, Netlify, etc.).

Pour pointer l'espace commande vers l'app interne, modifiez `orderAppUrl` dans `site.config.ts`.

---

## Structure des dossiers

```
site-vitrine/
├── app/                    # Pages App Router Next.js
│   ├── layout.tsx          # Shell : Header + Footer + fonts
│   ├── page.tsx            # Accueil
│   ├── usine/page.tsx
│   ├── histoire/page.tsx
│   ├── produits/page.tsx
│   └── contact/page.tsx
├── components/             # Composants réutilisables
│   ├── Header.tsx          # Sticky header + menu mobile
│   ├── Footer.tsx
│   ├── Logo.tsx            # Typographique (SVG de secours)
│   ├── CTAButton.tsx       # Boutons : gold | outline | outline-light
│   ├── SectionTitle.tsx    # Titre + filet doré
│   ├── Container.tsx       # Wrapper section (bg cream/forest/creamMuted)
│   ├── Pillars.tsx         # Bandeau 3 piliers
│   ├── Card.tsx            # Carte générique
│   ├── ProductCard.tsx     # Carte produit avec image + tags
│   ├── Timeline.tsx        # Timeline verticale (histoire)
│   ├── StepList.tsx        # Liste numérotée avec images (usine)
│   └── ContactForm.tsx     # Formulaire Formspree (client)
├── public/
│   ├── favicon.svg
│   ├── logo/chopin-logo.svg
│   └── images/
│       ├── produits/       # 2 photos produits
│       └── usine/          # 6 photos étapes
├── site.config.ts          # ⚙️ TOUTES les valeurs ajustables
└── tailwind.config.ts      # Tokens design (couleurs, fonts)
```

---

*Site distinct du module de commandes (`app/`). Ne pas modifier les fichiers hors de `site-vitrine/`.*
