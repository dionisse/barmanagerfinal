# Comment exécuter la migration depuis Bolt.new (Bolt IA)

Tu as l'erreur `bar_address column not found` car la migration `20260921` n'a jamais été appliquée sur ton Supabase distant.

Le code est déjà corrigé (fallback robuste) → l'inscription marche même sans migration.  
Mais pour avoir le schéma complet, applique le fix définitif ci-dessous.

---

## Méthode 1 : Recommandée pour Bolt (30 secondes, 100% fiable)

C'est la plus simple depuis Bolt, pas besoin de CLI.

1. **Ouvre Supabase Dashboard**
   - Va sur https://supabase.com/dashboard
   - Sélectionne ton projet `ahandjo` (ou `jtzshtopthamkqpgixcq`)

2. **SQL Editor**
   - Menu gauche > **SQL Editor** > **New Query**

3. **Copie-colle le fix**
   - Dans Bolt, ouvre le fichier `FIX_MISSING_COLUMNS.sql` à la racine
   - Copie tout (Ctrl+A, Ctrl+C)
   - Colle dans Supabase SQL Editor

4. **Run**
   - Clique **Run** (ou Ctrl+Enter)
   - Tu dois voir `Fix terminé - vous pouvez maintenant créer un compte`
   - Vérifie en bas : `user_lots columns` doit lister `bar_address`, `bar_name`, etc.

5. **Recharge le cache**
   - La dernière ligne du SQL fait déjà `NOTIFY pgrst, 'reload schema'`
   - Attends 10 secondes
   - Re-teste l'inscription dans ton app Bolt

**Lien direct SQL Editor :**  
`https://supabase.com/dashboard/project/[TON_PROJECT_REF]/sql/new`

---

## Méthode 2 : Via CLI Supabase dans le terminal Bolt

Si tu veux utiliser `supabase db push` (pour toutes les migrations dans `supabase/migrations/`)

### Étape 1 : Terminal Bolt
Dans Bolt, en bas, clique **Terminal**

```bash
# Vérifie si supabase CLI est installé
npx supabase --version

# Si non, installe (dans Bolt ça marche)
npm install -D supabase
# ou
npx supabase --version
```

### Étape 2 : Trouve ton PROJECT_REF
- Supabase Dashboard > **Project Settings** (icône engrenage) > **General**
- **Reference ID** = exemple `jtzshtopthamkqpgixcq`
- Copie-le

### Étape 3 : Link le projet
Dans le terminal Bolt :

```bash
npx supabase link --project-ref jtzshtopthamkqpgixcq
```

- Il va demander **Database Password** : 
  - Va dans Supabase Dashboard > **Project Settings** > **Database** > **Database Password** > Reset si oublié
  - Colle le password

### Étape 4 : Push les migrations

```bash
# Voir les migrations locales vs distantes
npx supabase db diff --linked

# Pousser toutes les migrations manquantes (20260920, 20260921, 20260922)
npx supabase db push
```

- Tape `Y` pour confirmer

### Étape 5 : Vérifie

```bash
npx supabase db reset --linked --dry-run
```

Ou retourne dans SQL Editor et lance :

```sql
SELECT column_name FROM information_schema.columns WHERE table_name='user_lots';
```

Tu dois voir `bar_address`.

---

## Méthode 3 : Script Node rapide (si tu as SERVICE_ROLE_KEY)

Si tu as `SUPABASE_SERVICE_ROLE_KEY` dans ton `.env`, tu peux créer un script qui exécute le SQL via postgres direct.

**Mais attention :** Supabase JS ne permet pas de faire `ALTER TABLE` via API, il faut passer par SQL Editor ou CLI. Donc Méthode 1 reste la meilleure pour Bolt.

---

## Pourquoi Bolt ne pousse pas automatiquement ?

- Bolt.new est un IDE navigateur, il n'a pas ton `access token` Supabase ni le `db password` par défaut
- Les migrations dans `supabase/migrations/` sont versionnées en local, mais pas auto-déployées
- Il faut soit les pousser manuellement (Méthode 2), soit copier-coller le SQL (Méthode 1)

---

## Après le fix

1. **Redémarre l'app Bolt** : `npm run dev`
2. **Teste inscription** : 
   - Nom bar, adresse, manager, phone, whatsapp, email, username, password
   - Clique `Créer mon bar - Essai 7j gratuit (direct)`
   - Plus d'erreur `bar_address` !

3. **Vérifie dans Supabase** :
   - **Table Editor** > `user_lots` > tu dois voir la nouvelle ligne avec `bar_name`, `bar_address`, etc.
   - `licenses` > licence `Essai` ou `Kpêvi 0€`
   - `users` > 2 users créés

---

## Fichiers concernés

- `FIX_MISSING_COLUMNS.sql` → script complet à copier dans SQL Editor (RECOMMANDÉ)
- `supabase/migrations/20260922_fix_user_lots_missing_columns.sql` → même contenu, pour `supabase db push`
- `src/utils/registrationService.ts` → déjà rendu robuste (fallback ancien schéma)

Besoin d'aide ? Colle l'erreur du terminal Bolt ici.
