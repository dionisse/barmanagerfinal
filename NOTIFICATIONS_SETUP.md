# Notifications AHANDJO - Setup 0€ MVP

## Stratégie choisie : Email réel gratuit + WhatsApp via wa.me support

### Pourquoi pas WhatsApp API auto pour l'instant ?

- WhatsApp Business API (Meta Cloud) : 1000 conversations/mois gratuites puis 0,025-0,08€/conv. Nécessite Business Manager vérifié (2-3j) + templates approuvés.
- Twilio, GreenAPI : payant après crédit d'essai.
- Baileys / whatsapp-web.js : gratuit mais contre CGU, ban numéro garanti si envoi massif + téléphone doit rester allumé 24/7.

**Pour MVP 0€, Email est le seul canal auto légal et gratuit scalable.**

WhatsApp est géré via liens `wa.me` : le support clique et écrit manuellement depuis son numéro pro. 0€, légal, pas de ban.

---

## 1. Email réel gratuit avec Resend (100/jour, 3000/mois)

### a) Créer compte Resend (2 min)
1. Va sur https://resend.com → Sign up gratuit
2. Crée une API Key : `re_xxx`
3. Par défaut tu peux envoyer depuis `onboarding@resend.dev` vers ton propre email pour tester.
   Pour envoyer vers n'importe quel client, ajoute ton domaine dans Resend → Domains → Add Domain (gratuit) et mets `noreply@tondomaine.com`.

### b) Déployer Edge Function send-notification

```bash
supabase login
supabase link --project-ref jtzshtopthamkqpgixcq

# Secrets
supabase secrets set RESEND_API_KEY=re_xxx FROM_EMAIL="AHANDJO <noreply@tondomaine.com>" SUPPORT_PHONE="+22997000000"

# Déploiement (important --no-verify-jwt pour que l'app puisse appeler sans JWT)
supabase functions deploy send-notification --no-verify-jwt
supabase functions deploy fedapay-checkout --no-verify-jwt
supabase functions deploy fedapay-verify --no-verify-jwt
supabase functions deploy fedapay-webhook --no-verify-jwt
```

Vérifie : `https://TON_PROJET.supabase.co/functions/v1/send-notification` doit répondre.

### c) Côté app
`notificationService.ts` appelle automatiquement :
- `${VITE_SUPABASE_URL}/functions/v1/send-notification`
- Fallback : `platform_settings.fedapay.edgeFunctionUrl/send-notification`

Si `RESEND_API_KEY` manque, l'email est mocké et le code s'affiche dans console F12 + localStorage `ahandjo_last_verification_code`.

### Templates gérés
- `registration` : bienvenue + identifiant + essai 7j
- `verification` : code 6 chiffres 10min
- `password_reset` : code 6 chiffres 15min
- `license_purchased`, `trial_expiring` J-2/J-1, `trial_expired`

---

## 2. WhatsApp Support via wa.me (0€)

### Principe
On ne tente PAS d'envoyer via API. On génère un lien :
```
https://wa.me/22997000000?text=Bonjour%20Jean%20...
```
Quand le support clique, WhatsApp s'ouvre avec message pré-rempli.

### Fichiers
- `src/utils/whatsappService.ts` : `getWhatsappLink(phone, message)`, `cleanPhoneForWaMe`, `WhatsappTemplates`
- `src/components/WhatsappSupportButton.tsx` : bouton réutilisable

### Où c'est utilisé
- **Inscription** : `RegistrationForm.tsx` → après saisie WhatsApp, lien "Tester lien WhatsApp support" + modal qui explique que code vient par Email, mais support peut écrire via wa.me
- **Clients** : `ClientsModule.tsx` → icône WhatsApp verte à côté de chaque client → ouvre chat avec message dette/rappel
- **Paramètres → Notifications** : config numéro support + mode `email_only` / `email_whatsapp` + logs + boutons test
- **Support** : `ParametresModule.tsx` → onglet Notifications affiche les 20 derniers logs avec lien wa.me cliquable

### Numéro support
Par défaut `+229 97 00 00 00` à changer dans :
- Paramètres → Notifications → Numéro Support → Enregistrer
- Ou variable d'env Edge Function `SUPPORT_PHONE`
- Ou `localStorage.setItem('ahandjo_support_phone', '+229...')`

### Templates pré-remplis
```ts
WhatsappTemplates.welcomeNewBar(barName, managerName)
WhatsappTemplates.verificationCode(code, barName)
WhatsappTemplates.trialExpiring(barName, daysLeft)
WhatsappTemplates.trialExpired(barName)
WhatsappTemplates.passwordReset(code)
```

Usage :
```ts
import { getSupportToClientLink } from '../utils/whatsappService';
const link = getSupportToClientLink(clientPhone, 'trialExpiring', 'Bar Le Maquis', 2);
window.open(link, '_blank');
```

---

## 3. Mode de fonctionnement actuel (MVP)

- `notificationService.getNotificationMode()` → `email_only` par défaut
- `sendNotification({type:'email'})` → vrai email via Resend Edge Function
- `sendNotification({type:'whatsapp'})` → ne tente pas d'API, retourne `waLink` + log + stocke code en localStorage
- `sendRegistrationNotification` → email réel + wa.me link pour support

**Coût : 0€**
- Email : 0€ jusqu'à 3000/mois
- WhatsApp : 0€ (manuel via wa.me)

---

## 4. Passage en WhatsApp auto plus tard (quand revenu)

1. Créer app Meta Business → WhatsApp Cloud API → récupérer `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID`
2. Ajouter secrets :
```bash
supabase secrets set WHATSAPP_TOKEN=... WHATSAPP_PHONE_ID=... WHATSAPP_BUSINESS_ID=...
```
3. Modifier `supabase/functions/send-notification/index.ts` :
   - Si `type==='whatsapp'` et `WHATSAPP_TOKEN` présent, appeler `https://graph.facebook.com/v19.0/${PHONE_ID}/messages`
   - Sinon fallback wa.me

Aucun changement front nécessaire.

---

## 5. Checklist déploiement gratuit maintenant

- [ ] Compte Resend + API Key
- [ ] `supabase secrets set RESEND_API_KEY=... FROM_EMAIL=... SUPPORT_PHONE=...`
- [ ] `supabase functions deploy send-notification --no-verify-jwt`
- [ ] Tester inscription avec vrai email → vérifier boîte + spam
- [ ] Dans Paramètres → Notifications → renseigner numéro support → tester boutons wa.me
- [ ] Mettre `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans `.env`

---

## 6. Logs et debug

- Console navigateur (F12) : `[AHANDJO NOTIF]`, `[WHATSAPP WA.ME]`, `CODE`
- localStorage :
  - `ahandjo_last_verification_code` : dernier code 6 chiffres
  - `ahandjo_last_whatsapp_link` : dernier lien wa.me
  - `ahandjo_notification_log` : 100 derniers envois
- Paramètres → Notifications → section logs

---

**Résumé :** Email = auto gratuit via Resend. WhatsApp = wa.me manuel 0€ pour support. Pas d'API payante, pas de risque ban, vendable dès demain.
