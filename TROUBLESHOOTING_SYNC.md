# 🔧 Diagnostic de Synchronisation Netlify-Neon
# 🔧 Diagnostic de Synchronisation Netlify-Supabase

## ✅ Points de Vérification Critiques

### 1. Variables d'Environnement Netlify
Dans votre tableau de bord Netlify :
- Allez dans **Site settings** > **Environment variables**
- Vérifiez que les variables suivantes sont configurées :
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

Ces informations se trouvent dans votre projet Supabase sous **Project Settings** > **API**.

### 2. Test des Fonctions Netlify
Testez vos fonctions directement :

**Test de la fonction auth :**
```bash
curl -X POST https://ephemeral-marshmallow-26ca03.netlify.app/.netlify/functions/auth \
  -H "Content-Type: application/json" \
  -d '{"action":"test"}'
```

**Test de connexion avec un utilisateur :**
```bash
curl -X POST https://ephemeral-marshmallow-26ca03.netlify.app/.netlify/functions/auth \
  -H "Content-Type: application/json" \
  -d '{
    "action": "login",
    "username": "gobexpropriétaire",
    "password": "Ffreddy75@@7575xyzDistribpro2025",
    "userType": "Propriétaire"
  }'
```

### 3. Vérification des Logs Netlify
1. Dans Netlify, allez dans **Functions** > **View logs**
2. Recherchez les erreurs dans les logs des fonctions `auth` et `data`
3. Vérifiez les erreurs de connexion à Supabase

### 4. Test de Connexion Supabase
Dans la console Supabase, testez cette requête :
```sql
SELECT 'Connection successful' as status;
```

## 🚨 Erreurs Communes et Solutions

### Erreur : "Service unavailable"
**Cause :** Clés Supabase incorrectes ou manquantes
**Solution :** Vérifiez les variables d'environnement dans Netlify

### Erreur : "JWT expired"
**Cause :** Clé Supabase expirée
**Solution :** Régénérez votre clé anon dans la console Supabase

### Erreur : "Function timeout"
**Cause :** Requête trop lente ou Supabase inaccessible
**Solution :** Vérifiez que votre projet Supabase est actif

### Erreur : "CORS"
**Cause :** Headers CORS manquants
**Solution :** Vérifiez que les fonctions retournent les bons headers CORS

## 🔍 Tests de Diagnostic

### Test 1 : Vérification de l'URL des fonctions
Ouvrez dans votre navigateur :
```
https://ephemeral-marshmallow-26ca03.netlify.app/.netlify/functions/auth
```
Vous devriez voir une erreur 400 (normal, pas de données POST)

### Test 2 : Test depuis l'application
1. Ouvrez l'application déployée
2. Ouvrez la console développeur (F12)
3. Tentez de vous connecter avec le compte propriétaire
4. Vérifiez les erreurs dans la console

### Test 3 : Vérification du schéma Supabase
Dans la console Supabase, vérifiez que les tables existent :
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

## 🛠️ Actions Correctives

### Si les fonctions ne répondent pas :
1. Redéployez le site sur Netlify
2. Vérifiez que les fichiers de fonctions sont présents dans le build
3. Vérifiez la configuration `netlify.toml` et le bundler esbuild

### Si Supabase ne répond pas :
1. Vérifiez que votre projet Supabase est actif
2. Testez la connexion depuis la console Supabase
3. Vérifiez les politiques RLS et le schéma

### Si l'authentification échoue :
1. Vérifiez que le schéma est correctement appliqué
2. Testez les requêtes SQL manuellement
3. Vérifiez les politiques RLS

## 📋 Checklist de Vérification

- [ ] Variables Supabase configurées dans Netlify
- [ ] Schéma appliqué dans Supabase
- [ ] Fonctions Netlify déployées
- [ ] CORS configuré correctement
- [ ] Politiques RLS configurées correctement
- [ ] Tables créées avec succès
- [ ] RLS activé et politiques configurées
- [ ] Test de connexion réussi

## 🆘 Si le problème persiste

1. **Vérifiez les logs Netlify** pour les erreurs spécifiques
2. **Testez la connexion Supabase** depuis un autre client
3. **Redéployez** avec des logs de debug activés
4. **Contactez le support** Netlify ou Supabase si nécessaire

---

**Note :** La synchronisation peut prendre quelques minutes après le déploiement pour être pleinement opérationnelle.