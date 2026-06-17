# Design System — Chopin Conditionnement

## Palette couleurs

### Mode clair

| Token CSS | Valeur HSL | Hex source | Usage |
|-----------|-----------|-----------|-------|
| `--primary` | `144 33% 18%` | `#1F3D2B` | Vert forêt — boutons principaux, sidebar |
| `--accent` | `39 40% 54%` | `#B8975A` | Doré — ring de focus, liens actifs |
| `--secondary` | `42 40% 94%` | `#F5F1E8` | Crème — fonds secondaires |
| `--background` | `45 43% 96%` | `#FAF8F2` | Blanc cassé — fond page |
| `--foreground` | `0 0% 10%` | `#1A1A1A` | Texte principal |
| `--destructive` | `0 51% 46%` | `#B23A3A` | Erreurs, suppressions |

### Mode sombre

En mode sombre, le doré (`--accent` clair) devient la couleur `--primary`.
Le fond est un vert très sombre (`144 20% 8%`).

### Couleurs de statuts

Utiliser les composants `<StatusBadge>` qui lisent automatiquement les vars CSS `--status-*`.

| Statut | Background | Text |
|--------|-----------|------|
| `pending` | `--status-pending-bg` | `--status-pending-text` |
| `accepted` | `--status-accepted-bg` | `--status-accepted-text` |
| `refused` | `--status-refused-bg` | `--status-refused-text` |
| `in_preparation` | `--status-prep-bg` | `--status-prep-text` |
| `shipped` | `--status-shipped-bg` | `--status-shipped-text` |
| `delivered` | `--status-delivered-bg` | `--status-delivered-text` |
| `overdue` | `--status-overdue-bg` | `--status-overdue-text` |

## Typographie

- **Cormorant Garamond** (variable `--font-cormorant`) — titres, logo, éléments premium
  - Weight 500 (medium) et 600 (semibold)
  - Classe Tailwind : `font-serif`
- **Inter** (variable `--font-inter`) — tout le texte UI
  - Weight 400/500/600/700
  - Classe Tailwind : `font-sans` (défaut)

## Composants shadcn/ui installés

button, input, label, form, dialog, sheet, dropdown-menu, tabs, table, badge,
card, separator, select, calendar, popover, command, avatar, skeleton, alert, sonner

## Composants partagés à créer (étape 1)

```
components/shared/
├── status-badge.tsx      # <StatusBadge status="pending" /> → Badge avec couleur statut
├── confirm-dialog.tsx    # <ConfirmDialog onConfirm={fn}>Supprimer</ConfirmDialog>
├── data-table.tsx        # Wrapper TanStack Table (recherche, filtres, tri, pagination)
└── notification-bell.tsx # Cloche notifications (étape 4)
```

## Patterns récurrents

- **Statuts** : toujours `<StatusBadge>`, jamais de Badge brut avec className en dur
- **Actions destructives** : toujours derrière `<ConfirmDialog>` avant appel API
- **Listes longues** : `<DataTable>` avec @tanstack/react-table
- **Formulaires** : react-hook-form + zod + composants shadcn `<Form>`
- **Toast** : `toast.success()` / `toast.error()` de sonner, jamais d'alert()
- **Loading** : `<Skeleton>` pendant les chargements, jamais de spinner custom

## Icons

Lucide React — importés à la demande :
```tsx
import { Package, FileText, Users } from 'lucide-react'
```
