# Guide d'Intégration eMecef pour GOBEX

## 📋 Vue d'ensemble

Cette intégration permet à GOBEX de générer automatiquement des codes eMecef conformes à la réglementation de la Direction Générale des Impôts (DGI) du Bénin pour toutes les factures émises.

## 🚀 Étapes d'Installation

### 1. Déployer l'API standardizedInvoice

#### A. Cloner le repository
```bash
git clone https://github.com/ZaidMazou/standardizedInvoice.git
cd standardizedInvoice
```

#### B. Installer et configurer
```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés API eMecef
```

#### C. Déployer sur Netlify
1. Connectez le repository à Netlify
2. Configurez les variables d'environnement dans Netlify
3. Déployez l'application
4. Notez l'URL de déploiement (ex: `https://votre-api-emecef.netlify.app`)

### 2. Configurer GOBEX

#### A. Variables d'environnement
Ajoutez dans votre configuration Netlify de GOBEX :
```
VITE_EMECEF_API_URL=https://votre-api-emecef.netlify.app
```

#### B. Paramètres fiscaux dans GOBEX
1. Connectez-vous en tant que propriétaire
2. Allez dans **Paramètres** > **Fiscalité**
3. Activez eMecef
4. Remplissez les informations obligatoires :
   - **NIF** : Numéro d'Identification Fiscale
   - **RCCM** : Registre du Commerce et du Crédit Mobilier
   - **Adresse Fiscale** : Adresse officielle de l'entreprise
   - **URL de l'API** : URL de votre API standardizedInvoice

## 🔧 Fonctionnement

### Processus de Facturation avec eMecef

1. **Vente normale** : L'utilisateur effectue une vente dans le module Ventes
2. **Génération automatique** : GOBEX envoie automatiquement les données à l'API eMecef
3. **Code eMecef** : L'API retourne un code unique conforme à la DGI
4. **Stockage** : Le code est stocké avec la vente dans GOBEX
5. **PDF** : Le code eMecef est inclus dans la facture PDF générée

### Gestion des Erreurs

- **API indisponible** : La vente est enregistrée sans code eMecef
- **Informations manquantes** : Un message d'erreur est affiché
- **Retry automatique** : 3 tentatives automatiques en cas d'échec
- **Statut visible** : Le statut eMecef est affiché dans la liste des ventes

## 📊 Interface Utilisateur

### Module Ventes
- **Colonne eMecef** : Affiche le statut du code eMecef pour chaque vente
- **Icônes de statut** :
  - ✅ Vert : Code généré avec succès
  - ❌ Rouge : Erreur lors de la génération
  - N/A : eMecef désactivé ou non applicable

### Module Paramètres
- **Onglet Fiscalité** : Configuration complète d'eMecef
- **Activation/Désactivation** : Bouton toggle pour activer eMecef
- **Validation** : Vérification des champs obligatoires

### Module Diagnostic
- **Test eMecef** : Bouton pour tester la connectivité avec l'API
- **Statut de configuration** : Vérification des informations fiscales

## 🔒 Sécurité et Conformité

### Données Sensibles
- Les informations fiscales sont stockées localement et dans le cloud
- Les clés API eMecef restent sur votre serveur standardizedInvoice
- Aucune donnée fiscale n'est exposée côté client

### Conformité DGI
- Codes eMecef générés selon les standards officiels
- Intégration avec l'API officielle eMecef via standardizedInvoice
- Archivage automatique des codes avec les ventes

## 🛠️ Dépannage

### Problèmes Courants

**eMecef ne fonctionne pas :**
1. Vérifiez que votre API standardizedInvoice est déployée et accessible
2. Contrôlez l'URL dans les variables d'environnement Netlify
3. Vérifiez vos informations fiscales dans Paramètres > Fiscalité
4. Utilisez le test eMecef dans Paramètres > Diagnostic

**Codes non générés :**
1. Vérifiez que eMecef est activé dans les paramètres
2. Contrôlez que tous les champs obligatoires sont remplis
3. Vérifiez la connectivité internet
4. Consultez les logs dans la console développeur (F12)

**API standardizedInvoice inaccessible :**
1. Vérifiez que l'API est déployée et en ligne
2. Testez l'URL directement dans votre navigateur
3. Vérifiez les logs de déploiement de l'API
4. Contrôlez les variables d'environnement de l'API

### Logs et Debug

Pour activer les logs détaillés :
```javascript
// Dans la console développeur
emecefService.setDebugMode(true);
```

## 📝 Structure des Données

### Code eMecef dans les Ventes
```typescript
interface Sale {
  // ... autres champs
  emecefCode?: string;           // Code eMecef généré
  emecefStatus?: 'pending' | 'success' | 'error';
  emecefError?: string;          // Message d'erreur si échec
}
```

### Paramètres Fiscaux
```typescript
interface FiscalSettings {
  nif: string;                   // Obligatoire
  rccm: string;                  // Obligatoire
  adresseFiscale: string;        // Obligatoire
  activitePrincipale: string;
  regimeFiscal: string;
  centreImpot: string;
  emecefApiUrl: string;          // Obligatoire
  emecefEnabled: boolean;
}
```

## 🔄 Workflow Complet

1. **Configuration initiale** :
   - Déployer l'API standardizedInvoice
   - Configurer les variables d'environnement
   - Activer eMecef dans GOBEX
   - Remplir les informations fiscales

2. **Utilisation quotidienne** :
   - Effectuer des ventes normalement
   - Les codes eMecef sont générés automatiquement
   - Les factures PDF incluent les codes
   - Suivi du statut dans l'interface

3. **Maintenance** :
   - Surveiller les logs d'erreur
   - Tester périodiquement la connectivité
   - Mettre à jour les informations fiscales si nécessaire

---

**✅ Une fois configuré, eMecef fonctionne de manière transparente avec GOBEX !**