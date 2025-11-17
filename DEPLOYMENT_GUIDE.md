# Guide de Déploiement GOBEX avec Synchronisation Cloud

## 🚀 Étapes de Déploiement avec Supabase

### 0. Déploiement de l'API eMecef (Optionnel - pour le Bénin)

Si vous souhaitez utiliser la facturation eMecef conforme à la DGI du Bénin :

#### A. Cloner et déployer l'API standardizedInvoice
1. Clonez le repository : `git clone https://github.com/ZaidMazou/standardizedInvoice.git`
2. Suivez les instructions de déploiement de cette API
3. Déployez-la sur une plateforme (Netlify, Vercel, ou serveur)
4. Notez l'URL de déploiement (ex: `https://votre-api-emecef.netlify.app`)

#### B. Configurer les variables d'environnement eMecef
1. Dans Netlify : `Site settings` > `Environment variables`
2. Ajoutez :
   - **Nom**: `VITE_EMECEF_API_URL`
   - **Valeur**: URL de votre API standardizedInvoice déployée

### 1. Préparation de la Base de Données Supabase

#### A. Créer le projet Supabase
1. Allez sur [supabase.com](https://supabase.com)
2. Créez un compte et un nouveau projet
3. Choisissez la région la plus proche de vos utilisateurs
4. Notez les informations suivantes:
   - **SUPABASE_URL** (format: `https://your-project-ref.supabase.co`)
   - **SUPABASE_ANON_KEY**
   - **SUPABASE_SERVICE_ROLE_KEY**

#### B. Exécuter le schéma
1. Dans la console Supabase, ouvrez l'éditeur SQL
2. Copiez et exécutez le contenu du fichier `supabase/migrations/20250706082145_improved_schema.sql`
3. Vérifiez que toutes les tables sont créées sans erreur

### 2. Configuration Netlify

#### A. Préparer le projet
```bash
# 1. Installer les dépendances
npm install

# 2. Build pour production
npm run build

# 3. Vérifier que le dossier dist est créé
ls -la dist/
```

#### B. Déployer sur Netlify

**Option 1: Via Git (Recommandé)**
1. Poussez votre code sur GitHub/GitLab
2. Connectez votre repo à Netlify
3. Configurez les paramètres de build :
   - Build command: `npm run build`
   - Publish directory: `dist`

**Option 2: Déploiement manuel**
1. Glissez-déposez le dossier `dist` sur Netlify
2. Ou utilisez Netlify CLI :
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

#### C. Configurer les variables d'environnement
1. Dans le tableau de bord Netlify : `Site settings` > `Environment variables`
2. Ajoutez :
   - **Nom**: `SUPABASE_URL`
   - **Valeur**: Votre URL Supabase
   - **Nom**: `SUPABASE_ANON_KEY`
   - **Valeur**: Votre clé anon Supabase
   - **Nom**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Valeur**: Votre clé service role Supabase
   - **Nom**: `VITE_EMECEF_API_URL` (optionnel)
   - **Valeur**: URL de votre API eMecef déployée

### 3. Test de Déploiement

#### A. Vérifier les fonctions Netlify
1. Accédez à `https://votre-site.netlify.app/.netlify/functions/auth`
2. Vous devriez voir une erreur 400 (normal, pas de données POST)
3. Vérifiez les logs Netlify pour les erreurs

#### B. Test d'authentification
1. Ouvrez votre application déployée
2. Connectez-vous en tant que propriétaire :
   - Utilisateur: `gobexpropriétaire`
   - Mot de passe: `Ffreddy75@@7575xyzDistribpro2025`
   - Type: `Propriétaire`

#### C. Test de création de licence
1. Allez dans le module `Licences`
2. Créez un nouveau lot d'utilisateurs :
   - Gestionnaire: `test_gestionnaire` / `password123`
   - Employé: `test_employe` / `password123`
3. Générez une licence `Kpêvi` pour ce lot
4. Vérifiez dans la console Neon que les données sont créées

#### D. Test de synchronisation
1. Déconnectez-vous du compte propriétaire
2. Connectez-vous avec le gestionnaire de test
3. Observez le composant `SyncStatusIndicator` en haut à droite
4. Ajoutez quelques données (produits, ventes)
5. Vérifiez que la synchronisation fonctionne

#### E. Test eMecef (si configuré)
1. Allez dans `Paramètres` > `Fiscalité`
2. Activez eMecef et remplissez les informations fiscales
3. Allez dans `Paramètres` > `Diagnostic`
4. Cliquez sur "Test eMecef" pour vérifier la connectivité
5. Effectuez une vente test pour vérifier la génération du code

### 4. Tests Multi-Appareils

#### A. Test de synchronisation cross-device
1. Connectez-vous sur un autre navigateur/appareil
2. Utilisez les mêmes identifiants de test
3. Vérifiez que les données sont synchronisées
4. Ajoutez des données sur un appareil
5. Vérifiez qu'elles apparaissent sur l'autre

#### B. Test mode hors ligne
1. Désactivez votre connexion internet
2. Utilisez l'application (elle doit fonctionner)
3. Réactivez internet
4. Vérifiez que la synchronisation reprend automatiquement

### 5. Surveillance et Maintenance

#### A. Logs Netlify
- Surveillez les logs des fonctions dans le tableau de bord Netlify
- Vérifiez les erreurs de connexion Supabase

#### B. Monitoring Supabase
- Surveillez l'utilisation de la base de données dans le dashboard Supabase
- Vérifiez les performances des requêtes

#### C. Nettoyage automatique
- Le schéma inclut une fonction `cleanup_expired_data()`
- Configurez un cron job pour l'exécuter périodiquement

### 6. Dépannage

#### Problèmes courants :

**Fonctions Netlify ne répondent pas :**
- Vérifiez que les variables Supabase sont configurées
- Vérifiez les logs Netlify pour les erreurs
- Testez la connexion à Supabase depuis la console

**Synchronisation échoue :**
- Vérifiez la connectivité internet
- Consultez la console développeur (F12)
- Vérifiez les politiques RLS dans Supabase

**eMecef ne fonctionne pas :**
- Vérifiez que votre API standardizedInvoice est déployée
- Contrôlez l'URL dans les variables d'environnement
- Vérifiez vos informations fiscales dans les paramètres

**Authentification échoue :**
- Vérifiez que les données sont dans la base Supabase
- Testez les requêtes SQL manuellement
- Vérifiez les logs des fonctions

### 7. URLs Importantes

- **Application**: `https://votre-site.netlify.app`
- **Fonction Auth**: `https://votre-site.netlify.app/.netlify/functions/auth`
- **Fonction Data**: `https://votre-site.netlify.app/.netlify/functions/data`
- **Console Supabase**: `https://app.supabase.com`
- **Tableau de bord Netlify**: `https://app.netlify.com`

### 8. Sécurité

- Les mots de passe sont stockés en clair (pour simplicité)
- RLS est activé sur toutes les tables
- Les fonctions Netlify utilisent HTTPS
- Les données sont isolées par utilisateur

---

**✅ Une fois ces étapes terminées, votre application GOBEX sera entièrement fonctionnelle avec synchronisation Supabase !**