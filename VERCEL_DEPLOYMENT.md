# Guide de Déploiement sur Vercel

Ce guide vous explique comment déployer votre application GOBEX sur Vercel.

## Prérequis

1. Un compte Vercel (gratuit) : https://vercel.com/signup
2. Un compte GitHub (si vous voulez le déploiement continu)

## Méthode 1 : Déploiement via l'interface Vercel (Recommandé)

### Étape 1 : Préparer votre code

1. Assurez-vous que votre code est dans un dépôt Git (GitHub, GitLab, ou Bitbucket)
2. Si ce n'est pas le cas, créez un nouveau dépôt et poussez votre code

### Étape 2 : Importer sur Vercel

1. Connectez-vous à https://vercel.com
2. Cliquez sur "Add New" puis "Project"
3. Importez votre dépôt Git
4. Vercel détectera automatiquement qu'il s'agit d'un projet Vite

### Étape 3 : Configurer les variables d'environnement

Dans les paramètres du projet sur Vercel, ajoutez ces variables d'environnement :

```
VITE_SUPABASE_URL=https://cieewtsvqfpulkomxdnj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZWV3dHN2cWZwdWxrb214ZG5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMjg3NDAsImV4cCI6MjA3ODkwNDc0MH0.fRm3ayhFzRQUN6wB27hb-9item7N-rsNbkB-YEKC25w
```

### Étape 4 : Déployer

1. Cliquez sur "Deploy"
2. Attendez quelques minutes que le build se termine
3. Votre application sera disponible sur un lien du type : `https://votre-projet.vercel.app`

## Méthode 2 : Déploiement via CLI Vercel

### Installation

```bash
npm install -g vercel
```

### Déploiement

```bash
# Depuis le dossier du projet
vercel login
vercel

# Suivez les instructions à l'écran
# Configurez les variables d'environnement quand demandé
```

### Déploiement en production

```bash
vercel --prod
```

## Configuration Automatique

Le fichier `vercel.json` est déjà configuré avec :
- Build automatique via Vite
- Redirections pour le SPA (Single Page Application)
- Headers de sécurité
- Support du Service Worker (PWA)

## Après le Déploiement

1. **Testez votre application** sur le lien Vercel fourni
2. **Configurez un domaine personnalisé** (optionnel) dans les paramètres Vercel
3. **Activez le déploiement automatique** : Chaque push sur la branche principale déclenchera un nouveau déploiement

## Fonctionnalités Disponibles

Votre application GOBEX déployée inclut :
- ✅ Authentification complète
- ✅ Gestion des ventes, achats, stocks
- ✅ Rapports et exports PDF
- ✅ Changement de mots de passe
- ✅ Synchronisation Supabase
- ✅ Mode hors ligne (PWA)
- ✅ Installation sur mobile/desktop

## Identifiants de Test

**Gestionnaire :**
- Username : `gestionnaire`
- Password : `test123`

**Employé :**
- Username : `employe`
- Password : `test123`

## Support

Pour toute question sur Vercel :
- Documentation : https://vercel.com/docs
- Support : https://vercel.com/support

## Mise à Jour

Pour mettre à jour votre application :
1. Poussez vos modifications sur votre dépôt Git
2. Vercel déploiera automatiquement les changements
3. Ou utilisez `vercel --prod` depuis la CLI

---

**Note :** Les variables d'environnement Supabase sont déjà configurées et sécurisées. Votre base de données est prête à être utilisée.
