# Achat & renouvellement de licences — Paiement FEDAPAY

Ce document explique le nouveau système de licences AHANDJO : notifications
d'expiration, bouton d'achat/renouvellement en ligne et activation
automatique après paiement via l'API FEDAPAY.

---

## 1. Vue d'ensemble du système

```
J-7 / J-3 / J-0 ──► Notifications (navigateur + centre de notifications)
                          │
                          ▼
            Bandeau « Renouveler » sur le Tableau de bord
                          │  (le propriétaire peut aussi renouveler
                          ▼   pour un client depuis le module Licences)
              Modale de paiement — choix de la formule
              Kpêvi 1 mois 15 000 F · Kléoun 3 mois 40 000 F
              Agbon 6 mois 70 000 F · Baba 12 mois 120 000 F
                          │
                          ▼
              Paiement sécurisé FEDAPAY (Mobile Money / carte)
                          │
                          ▼
       Retour dans l'app → vérification du paiement → activation
       AUTOMATIQUE de la licence (prolongée à partir de l'échéance actuelle)
```

## 2. Ce qui a été mis en place

| Élément | Fichier |
|---|---|
| Service central (tarifs, statut J-7/J-3/J-0, renouvellement) | `src/utils/licenseService.ts` |
| Notifications d'échéance + Notification API navigateur | `src/utils/licenseNotificationService.ts` |
| Paiement FEDAPAY + activation automatique | `src/utils/fedapayService.ts` |
| Modale d'achat/renouvellement | `src/components/LicenseCheckoutModal.tsx` |
| Bandeau + bouton « Renouveler » (Dashboard) | `src/components/Dashboard.tsx` |
| Notifications persistantes dans la cloche | `src/components/NotificationCenter.tsx` |
| Module Licences restructuré (stats, échéances, paiements) | `src/components/LicencesModule.tsx` |
| Configuration FEDAPAY (propriétaire) | `src/components/ParametresModule.tsx` → onglet « Paiements » |
| Migration SQL (`license_payments`, `platform_settings`) | `supabase/migrations/20260920_create_license_payments_and_platform_settings.sql` |
| Edge Functions (mode serveur recommandé) | `supabase/functions/fedapay-{checkout,verify,webhook}/` |

## 3. Activation — étapes pour le propriétaire

### Étape 1 : créer le compte FEDAPAY
1. Créez un compte marchand sur [fedapay.com](https://fedapay.com) (Bénin/Togo).
2. Dans le dashboard FEDAPAY → **Réglages → Clés API**, récupérez la **clé
   secrète** (`sk_sandbox_…` pour tester, `sk_live_…` pour encaisser réellement).

### Étape 2 : appliquer la migration SQL
Dans le dashboard Supabase → **SQL Editor**, exécutez le contenu de
`supabase/migrations/20260920_create_license_payments_and_platform_settings.sql`.
Cela crée :
- `license_payments` — l'historique des paiements + le verrou d'idempotence
  (un paiement = une seule licence activée, même si le client revient
  plusieurs fois ou si le webhook arrive en même temps) ;
- `platform_settings` — le partage de la configuration FEDAPAY entre appareils.

### Étape 3 : configurer le paiement dans l'application
Connectez-vous avec le compte **propriétaire** → **Paramètres → Paiements** :
- choisissez l'environnement (Sandbox pour tester, Production pour encaisser) ;
- collez la **clé secrète** FEDAPAY ;
- cliquez **Tester la connexion** puis **Enregistrer**.

Vos clients voient immédiatement le bouton « Renouveler en ligne ».

### Étape 4 (recommandée, production) : déployer les Edge Functions
En mode direct (étape 3 seule), la clé secrète est partagée sur les appareils
des clients pour créer les paiements. Pour ne **jamais** l'exposer :

```bash
supabase login
supabase link --project-ref VOTRE_PROJECT_REF
supabase secrets set FEDAPAY_SECRET_KEY=sk_live_votre_cle FEDAPAY_MODE=live
supabase functions deploy fedapay-checkout --no-verify-jwt
supabase functions deploy fedapay-verify   --no-verify-jwt
supabase functions deploy fedapay-webhook  --no-verify-jwt
```

Puis dans **Paramètres → Paiements**, renseignez l'URL des Edge Functions :
`https://VOTRE-PROJET.supabase.co/functions/v1`
(et videz la clé secrète du champ « mode direct »).

### Étape 5 (optionnelle) : webhook temps réel
Dans le dashboard FEDAPAY → **Réglages → Webhooks**, ajoutez :
- URL : `https://VOTRE-PROJET.supabase.co/functions/v1/fedapay-webhook`
- Événement : `transaction.approved`

La licence est alors activée **côté serveur dès la confirmation du paiement**,
même si le client ne revient jamais dans l'application. L'idempotence est
partagée entre le webhook et le retour client : jamais de double activation.

## 4. Fonctionnement technique

### Notifications d'expiration (J-7, J-3, J-0)
- Au login, puis toutes les heures et au retour au premier plan, l'app calcule
  les échéances de toutes les licences.
- À **7 jours**, **3 jours** et le **jour de l'expiration**, une notification
  est émise **une seule fois par licence et par jalon** (déduplication
  persistée). Elle apparaît : en notification navigateur (si l'utilisateur a
  cliqué « Activer les rappels ») et dans la cloche du centre de notifications.
- Le **propriétaire** reçoit les alertes pour tous ses clients ; le
  **gestionnaire/employé** reçoit celles de son propre lot.

### Renouvellement (prolongation sans perte)
La nouvelle licence démarre à l'**échéance de la licence courante** si elle
est encore valide (le temps restant est conservé), sinon le jour même.
L'ancienne licence reste active jusqu'à son expiration naturelle : aucun trou
d'accès.

### Paiement FEDAPAY
1. `POST /v1/transactions` (montant en FCFA, metadata `user_lot_id`,
   `license_type`, `duree`, `montant`) puis `POST /v1/transactions/{id}/token`
   → URL de paiement sécurisée.
2. Redirection du client vers FEDAPAY ; au retour, l'URL contient
   `?fedapay_return=1&id={transactionId}&status=approved`.
3. L'app **revérifie le statut réel** auprès de FEDAPAY (le paramètre d'URL
   n'est jamais pris pour argent comptant), passe le paiement
   `pending → completed` (verrou d'idempotence) puis active la licence.
4. Si le client ferme l'onglet avant le retour, le paiement est retrouvé et
   vérifié à la prochaine ouverture de l'application.

### Modes de paiement
| Mode | Clé secrète | Mise en route | Recommandation |
|---|---|---|---|
| Direct | partagée via `platform_settings` | immédiate (collez la clé) | tests / démarrage |
| Edge Functions | uniquement sur le serveur | déploiement `supabase functions` | **production** |

## 5. Test rapide (sandbox)
1. Paramètres → Paiements : mode **Sandbox**, clé `sk_sandbox_…`, Tester.
2. Connectez-vous avec un compte gestionnaire dont la licence expire ≤ 7 jours
   (ou attendez J-7 ; le bandeau apparaît aussi pour une licence expirée).
3. Tableau de bord → « Renouveler en ligne » → choisissez une formule → payer
   avec les moyens de test FEDAPAY sandbox.
4. Au retour : message « Paiement confirmé ✅ Votre licence … a été activée
   automatiquement jusqu'au … ».
5. Le propriétaire voit le paiement dans **Licences → Paiements FEDAPAY**.
