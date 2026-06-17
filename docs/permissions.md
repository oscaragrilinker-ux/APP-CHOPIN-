# Matrice de permissions

Légende : ✅ accès complet · 👁️ lecture seule · 🚫 aucun accès

| Module / Action          | Admin | Secrétaire | Cond. | Client pro |
|--------------------------|:-----:|:----------:|:-----:|:----------:|
| **Offres**               |       |            |       |            |
| Soumettre une offre      |  🚫   |    🚫      |  🚫   |    ✅      |
| Voir toutes les offres   |  ✅   |    👁️      |  🚫   |    🚫      |
| Voir ses propres offres  |   —   |     —      |   —   |    ✅      |
| Accepter / refuser       |  ✅   |    🚫      |  🚫   |    🚫      |
| Contre-proposer          |  ✅   |    🚫      |  🚫   |    🚫      |
| Annuler                  |  ✅   |    🚫      |  🚫   |   ✅ (siennes) |
| **Commandes**            |       |            |       |            |
| Voir toutes              |  ✅   |    ✅      |  👁️*  |    🚫      |
| Voir les siennes         |   —   |     —      |   —   |    ✅      |
| Choisir transporteur     |  ✅   |    ✅      |  🚫   |    🚫      |
| Définir date/heure/lieu  |  ✅   |    ✅      |  🚫   |    🚫      |
| Saisir n° de lot         |  ✅   |    ✅      |  ✅   |    🚫      |
| Changer statut prép.     |  ✅   |    🚫      |  ✅   |    🚫      |
| Marquer "livrée"         |  ✅   |    ✅      |  🚫   |    🚫      |
| Annuler                  |  ✅   |    🚫      |  🚫   |    🚫      |
| **Fiches palette**       |       |            |       |            |
| Générer / télécharger    |  ✅   |    ✅      |  ✅   |    ✅(ses) |
| **Clients pro**          |       |            |       |            |
| Créer un compte          |  ✅   |    🚫      |  🚫   |    🚫      |
| Modifier coordonnées     |  ✅   |    ✅      |  🚫   | ✅ (siennes) |
| Désactiver               |  ✅   |    🚫      |  🚫   |    🚫      |
| **Utilisateurs internes**|       |            |       |            |
| Créer / modifier rôle    |  ✅   |    🚫      |  🚫   |    🚫      |
| **Catalogue**            |       |            |       |            |
| Produits / variétés / formats CRUD | ✅ | 🚫 | 🚫 | 🚫 |
| Consultation             |  ✅   |    ✅      |  ✅   |    ✅      |
| **Facturation**          |       |            |       |            |
| Émettre une facture      |  ✅   |    ✅      |  🚫   |    🚫      |
| Modifier statut paiement |  ✅   |    ✅      |  🚫   |    🚫      |
| Saisir un règlement      |  ✅   |    ✅      |  🚫   |    🚫      |
| Voir dashboard encaissements | ✅ |  ✅      |  🚫   |    🚫      |
| Télécharger ses factures |   —   |     —      |   —   |    ✅      |
| Annuler / avoir          |  ✅   |    🚫      |  🚫   |    🚫      |
| **Relances**             |       |            |       |            |
| Déclencher une relance   |  ✅   |    ✅      |  🚫   |    🚫      |

*Conditionnement : voit uniquement les commandes "à préparer" et
"en préparation", SANS les infos de prix.

## Rôle super_admin

Rôle réservé au développeur (DEV only) :
- Mêmes droits qu'admin
- Accès à la table `activity_log` (logs d'audit)
- Capacité "se connecter en tant que" (impersonation pour debug)
- **Masqué côté UI** : n'apparaît jamais dans les listes de sélection de rôle
- Désactivé en production sauf pour le compte développeur

## Implémentation

- Côté base de données : Row Level Security (RLS) Supabase — voir `supabase/migrations/`
- Côté applicatif : `lib/permissions.ts` + `middleware.ts`
- Dans les composants : hook `usePermission(permission)` à créer à l'étape 1
