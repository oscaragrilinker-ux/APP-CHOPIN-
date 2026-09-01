# Matrice de permissions

Légende : ✅ accès complet · 👁️ lecture seule · 🚫 aucun accès

Abréviations de colonnes : **Adm** admin · **Sec** secrétaire ·
**RCd** responsable conditionnement · **Cd** conditionnement · **Cli** client pro

| Module / Action          | Adm | Sec | RCd | Cd  | Cli |
|--------------------------|:---:|:---:|:---:|:---:|:---:|
| **Offres**               |     |     |     |     |     |
| Soumettre une offre      | 🚫  | 🚫  | 🚫  | 🚫  | ✅  |
| Voir toutes les offres   | ✅  | 👁️  | 🚫  | 🚫  | 🚫  |
| Voir ses propres offres  |  —  |  —  |  —  |  —  | ✅  |
| Accepter / refuser       | ✅  | 🚫  | 🚫  | 🚫  | 🚫  |
| Contre-proposer          | ✅  | 🚫  | 🚫  | 🚫  | 🚫  |
| Annuler                  | ✅  | 🚫  | 🚫  | 🚫  | ✅ (siennes) |
| **Commandes**            |     |     |     |     |     |
| Voir toutes              | ✅  | ✅  | 👁️* | 👁️* | 🚫  |
| Voir les siennes         |  —  |  —  |  —  |  —  | ✅  |
| Voir les prix            | ✅  | ✅  | 🚫  | 🚫  | ✅ (siennes) |
| Changer statut prép.     | ✅  | 🚫  | ✅  | ✅  | 🚫  |
| Réordonner la file       | ✅  | 🚫  | ✅  | 🚫  | 🚫  |
| Expédier / marquer livrée| ✅  | ✅  | 🚫  | 🚫  | 🚫  |
| Annuler                  | ✅  | 🚫  | 🚫  | 🚫  | 🚫  |
| **Transport**            |     |     |     |     |     |
| Organiser le transport   | ✅  | ✅  | 🚫  | 🚫  | 🚫  |
| Choisir le transporteur  | ✅  | ✅  | 🚫  | 🚫  | 🚫  |
| Définir date/heure/lieu  | ✅  | ✅  | 🚫  | 🚫  | 🚫  |
| Gérer le carnet          | ✅  | ✅  | 🚫  | 🚫  | 🚫  |
| **Atelier**              |     |     |     |     |     |
| Saisir une fiche palette | ✅  | ✅  | ✅  | ✅  | 🚫  |
| Saisir n° de lot         | ✅  | ✅  | ✅  | ✅  | 🚫  |
| Générer / télécharger    | ✅  | ✅  | ✅  | ✅  | ✅ (ses) |
| **Clients pro**          |     |     |     |     |     |
| Créer un compte          | ✅  | 🚫  | 🚫  | 🚫  | 🚫  |
| Inviter un contact       | ✅  | 🚫  | 🚫  | 🚫  | 🚫  |
| Modifier coordonnées     | ✅  | ✅  | 🚫  | 🚫  | ✅ (siennes) |
| Désactiver               | ✅  | 🚫  | 🚫  | 🚫  | 🚫  |
| **Utilisateurs internes**|     |     |     |     |     |
| Créer / modifier rôle    | ✅  | 🚫  | 🚫  | 🚫  | 🚫  |
| **Catalogue**            |     |     |     |     |     |
| Produits / variétés / formats CRUD | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| Consultation             | ✅  | ✅  | ✅  | ✅  | ✅  |
| **Facturation**          |     |     |     |     |     |
| Émettre une facture      | ✅  | ✅  | 🚫  | 🚫  | 🚫  |
| Modifier statut paiement | ✅  | ✅  | 🚫  | 🚫  | 🚫  |
| Saisir un règlement      | ✅  | ✅  | 🚫  | 🚫  | 🚫  |
| Voir dashboard encaissements | ✅ | ✅ | 🚫 | 🚫  | 🚫  |
| Télécharger ses factures |  —  |  —  |  —  |  —  | ✅  |
| Annuler / avoir          | ✅  | 🚫  | 🚫  | 🚫  | 🚫  |
| **Relances**             |     |     |     |     |     |
| Déclencher une relance   | ✅  | ✅  | 🚫  | 🚫  | 🚫  |

\* Atelier : accès en lecture aux commandes `accepted`, `in_preparation` et
`ready` uniquement, **sans aucune information de prix**.

## Le rôle ne dit pas tout

La matrice ci-dessus donne les droits **par défaut** d'un rôle. Au moment de
l'invitation, un admin peut les ajuster pour une personne précise : retirer la
saisie de lot à un opérateur, ouvrir le catalogue à un contact client sans
l'autoriser à soumettre des offres, etc.

Ces écarts sont stockés dans `profiles.permission_overrides` (jsonb, forme
`{"orders:enter_lot": false}`). Une clé absente signifie « valeur du rôle ».
Seul un admin peut les modifier — c'est verrouillé en base par le trigger
`protect_profile_role` (migration 00018), au même titre que le rôle lui-même.

**La RLS reste le plafond.** Un ajustement affine à l'intérieur du rôle, il ne
le contourne jamais. Cocher « voir les prix » pour un compte conditionnement
n'a aucun effet : ses données transitent par la vue
`orders_for_conditionnement`, qui n'expose pas les colonnes de prix.

## Rôle super_admin

Rôle réservé au développeur (DEV only) :
- Mêmes droits qu'admin
- Accès à la table `activity_log` (logs d'audit)
- Capacité « se connecter en tant que » (impersonation pour debug)
- **Masqué côté UI** : n'apparaît jamais dans les listes de sélection de rôle,
  ni dans les rôles invitables (`INVITABLE_ROLES`)
- Désactivé en production sauf pour le compte développeur

## Implémentation

- **Base de données** : Row Level Security — voir `supabase/migrations/`.
  Les garde-fous structurants sont dans `00004` (policies de base),
  `00017` (protection du rôle, transitions de statut par rôle) et
  `00020` (droits de l'atelier, transporteurs, fiches palette).
- **Applicatif** : `lib/permissions.ts` est la source de vérité. Chaque server
  action appelle `hasPermission(role, permission, overrides)` avant d'écrire.
- **Navigation** : `middleware.ts` filtre les routes par rôle,
  `components/layout/Sidebar.tsx` filtre les entrées de menu.

Les trois couches doivent rester cohérentes : une permission ajoutée dans
`lib/permissions.ts` sans policy RLS correspondante ne produira qu'un bouton
qui échoue à l'exécution.
