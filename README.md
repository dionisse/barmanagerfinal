# GOBEX - Système de Gestion de Bar Professionnel

## 📦 Package Web avec Synchronisation Cloud

GOBEX est maintenant disponible avec synchronisation cloud via Neon Database, permettant aux utilisateurs de se connecter depuis n'importe quel navigateur avec leurs données synchronisées.

## 🚀 Installation et Configuration

### Prérequis
- Node.js (version 16 ou supérieure)
- npm ou yarn
- Compte Neon Database
- Compte Netlify

### Configuration de la Base de Données

#### 1. Créer une base de données Neon

1. Rendez-vous sur [neon.tech](https://neon.tech) et créez un compte
2. Créez un nouveau projet et une base de données PostgreSQL
3. Notez votre chaîne de connexion (DATABASE_URL)

#### 2. Initialiser le schéma

Exécutez le script SQL fourni dans `database/schema.sql` dans votre console Neon :

```sql
-- Copiez et exécutez le contenu du fichier database/schema.sql
```

#### 3. Configuration Netlify

1. **Variables d'environnement Netlify :**
   - Allez dans votre tableau de bord Netlify
   - Naviguez vers Site settings > Environment variables
   - Ajoutez la variable : `DATABASE_URL` avec votre chaîne de connexion Neon

2. **Déploiement :**
   ```bash
   # Installer les dépendances
   npm install
   
   # Build pour production
   npm run build
   
   # Déployer sur Netlify (ou via Git)
   ```

### Étapes d'installation locale

1. **Cloner et installer**
   ```bash
   git clone <votre-repo>
   cd gobex
   npm install
   ```

2. **Configuration locale (optionnelle)**
   ```bash
   # Pour tester les fonctions Netlify localement
   npm install -g netlify-cli
   netlify dev
   ```

3. **Lancement de l'application**
   ```bash
   npm run dev
   ```

## ✨ Fonctionnalités Cloud

### 🔄 Synchronisation Automatique
- **Synchronisation en temps réel** : Les données sont automatiquement synchronisées toutes les 5 minutes
- **Mode hors ligne** : L'application fonctionne hors ligne avec synchronisation à la reconnexion
- **Synchronisation manuelle** : Bouton de synchronisation manuelle disponible
- **Indicateur de statut** : Affichage du statut de connexion et de la dernière synchronisation

### 🔐 Authentification Cloud
- **Connexion universelle** : Les utilisateurs peuvent se connecter depuis n'importe quel navigateur
- **Vérification de licence** : Contrôle des licences en temps réel via la base de données
- **Gestion centralisée** : Le propriétaire peut gérer tous les utilisateurs et licences depuis le cloud

### 💾 Stockage Hybride
- **Local + Cloud** : Données stockées localement pour la performance et dans le cloud pour la synchronisation
- **Fallback intelligent** : Si le cloud n'est pas disponible, l'application fonctionne en mode local
- **Récupération automatique** : Les données sont automatiquement récupérées depuis le cloud lors de la première connexion

## 🔧 Fonctionnalités du Package

### 🏪 Gestion Complète
- ✅ **Gestion des ventes** avec facturation PDF
- ✅ **Gestion des achats** multiples par casiers
- ✅ **Gestion des stocks** avec inventaire
- ✅ **Gestion des emballages**
- ✅ **Gestion des dépenses** et charges
- ✅ **Système de licences** cloud
- ✅ **Rapports et analyses** détaillés
- ✅ **Paramètres configurables**
- ✅ Intégration eMecef (Bénin)

### 🌐 Fonctionnalités Cloud
- ✅ **Synchronisation automatique** des données
- ✅ **Authentification centralisée**
- ✅ **Gestion des licences** en temps réel
- ✅ **Accès multi-appareils**
- ✅ **Sauvegarde cloud** automatique
- ✅ **Mode hors ligne** avec synchronisation
- ✅ **Intégration eMecef** pour la facturation conforme DGI Bénin

## 👥 Comptes et Licences

### Propriétaire (Accès Permanent)
- **Utilisateur :** `gobexpropriétaire`
- **Mot de passe :** `Ffreddy75@@7575xyzDistribpro2025`
- **Accès :** Toutes les fonctionnalités + gestion des licences

### Utilisateurs avec Licence
Les autres utilisateurs (Gestionnaire, Employé) sont créés via le module Licences par le propriétaire et leurs données sont synchronisées dans le cloud.

## 📋 Types de Licences

| Type | Durée | Prix |
|------|-------|------|
| **Kpêvi** | 1 mois | 15,000 FCFA |
| **Kléoun** | 3 mois | 40,000 FCFA |
| **Agbon** | 6 mois | 70,000 FCFA |
| **Baba** | 12 mois | 120,000 FCFA |

## 🛠️ Architecture Technique

### Frontend
- **React + TypeScript** pour l'interface utilisateur
- **Tailwind CSS** pour le styling
- **Vite** pour le build et le développement
- **PWA** pour l'installation sur appareils

### Backend
- **Netlify Functions** pour les API serverless
- **Neon PostgreSQL** pour la base de données cloud
- **Row Level Security (RLS)** pour la sécurité des données

### Synchronisation
- **Service de synchronisation** automatique
- **Gestion des conflits** intelligente
- **Mode hors ligne** avec queue de synchronisation

## 📊 Base de Données

### Tables Principales
- `user_lots` : Lots d'utilisateurs (gestionnaire + employé)
- `licenses` : Licences avec dates d'expiration
- `users` : Utilisateurs individuels
- `user_data` : Données applicatives synchronisées

### Sécurité
- **Row Level Security (RLS)** activé sur toutes les tables
- **Politiques de sécurité** pour isoler les données par utilisateur
- **Chiffrement** des mots de passe et données sensibles

## 🔧 Configuration Avancée

### Variables d'Environnement
```bash
# Production (Netlify)
DATABASE_URL=postgresql://user:password@host:port/database
VITE_EMECEF_API_URL=https://votre-api-emecef.netlify.app

# Développement local (optionnel)
VITE_API_URL=http://localhost:8888/.netlify/functions
VITE_EMECEF_API_URL=http://localhost:3000
```

### Fonctions Netlify
- `auth.ts` : Authentification et gestion des licences
- `data.ts` : Synchronisation des données utilisateur

## 🆘 Support et Dépannage

### Problèmes Courants

**Synchronisation échouée :**
- Vérifiez votre connexion internet
- Consultez l'indicateur de statut dans la navigation
- Utilisez le bouton de synchronisation manuelle

**Licence expirée :**
- Contactez le propriétaire pour renouveler
- Le propriétaire peut gérer les licences via le module dédié

**Données manquantes :**
- Les données sont automatiquement récupérées depuis le cloud
- En cas de problème, utilisez la synchronisation manuelle

**Problèmes eMecef :**
- Vérifiez que votre API standardizedInvoice est déployée et accessible
- Contrôlez vos informations fiscales dans les paramètres
- Les ventes sont enregistrées même si eMecef échoue

### Logs et Débogage
- Ouvrez la console développeur (F12) pour voir les logs de synchronisation
- Les erreurs de connexion sont affichées dans l'interface utilisateur

## 📝 Licence et Copyright

© 2024 GOBEX Team. Tous droits réservés.

---

**GOBEX v2.0.1** - Système de Gestion de Bar Professionnel avec Synchronisation Cloud
```