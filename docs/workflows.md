# Workflows métier

## Workflow d'une offre

1. **Client soumet une offre** → statut `pending`
   - Email + notif in-app aux admins
2. **Admin réagit** :
   - **Accepte** → crée une commande, statut offre = `accepted`, notif client
   - **Refuse** → statut `refused`, notif client (avec motif optionnel)
   - **Contre-propose** → statut `counter_proposed`, notif client
3. **Si contre-proposition** : client peut accepter, refuser ou contre-contre-proposer → boucle multi-tour
4. À l'acceptation → bascule automatique vers le **workflow commande**

### États valides des offres

```
pending → accepted | refused | counter_proposed | cancelled
counter_proposed → accepted | refused | counter_proposed | cancelled
```

## Workflow d'une commande

```
[accepted]
↓ (admin/secrétaire choisit transporteur, date, lieu)
[in_preparation]
↓ (conditionnement saisit n° lot et marque "prête")
[ready]
↓ (secrétaire confirme expédition)
[shipped]
↓ (secrétaire/admin marque "livrée")
[delivered]
↓ (secrétaire émet la facture)
→ création d'une facture liée
```

### Règles
- Conditionnement voit les commandes en `in_preparation` et `ready` **sans les infos de prix**
- Annulation uniquement par Admin, depuis `accepted` ou `in_preparation`

## Workflow facturation

1. Facture créée en `draft` → édition possible
2. Émission → statut `issued`, numéro `CHOP-AAAA-NNNN` attribué
   (séquentiel, **jamais réutilisé** même si annulation)
3. Réception paiement → secrétaire saisit dans `payments`
4. Si `paid_amount = amount_ttc` → statut `paid`
5. Si `paid_amount < amount_ttc` et > 0 → `partially_paid`
6. Si `due_date < today` et non payée → `overdue` (calculé dynamiquement)
7. Annulation possible uniquement avant paiement (création d'un avoir)

### Format numéro de facture

```
CHOP-2026-0001
CHOP-2026-0002
...
```

Séquence par année civile, repart à 0001 chaque 1er janvier.
Le compteur ne recule jamais (pas de trou comblé).

## Workflow de notification

Chaque événement majeur déclenche :
- Une entrée dans `notifications` (in-app, cloche)
- Un email transactionnel via Resend

| Événement | Destinataires |
|-----------|--------------|
| Nouvelle offre reçue | Admins |
| Réponse à une offre (accept/refuse/counter) | Client concerné |
| Commande passée en "expédiée" | Client |
| Rappel avant livraison (J-1) | Client + Secrétaire |
| Facture émise | Client |
| Facture en retard | Admins + Secrétaire |
