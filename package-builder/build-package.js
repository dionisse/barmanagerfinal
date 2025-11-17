const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Configuration du package
const packageConfig = {
  name: 'GOBEX-Bar-Management',
  version: '2.0.1',
  description: 'Système de Gestion de Bar Professionnel',
  author: 'GOBEX Team',
  buildDate: new Date().toISOString()
};

// Créer le dossier de build
const buildDir = path.join(__dirname, 'dist');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Fonction pour copier les fichiers
function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

// Fonction pour créer le package
async function createPackage() {
  console.log('🚀 Création du package GOBEX...');

  // Copier les fichiers essentiels
  const filesToCopy = [
    { src: '../src', dest: 'src' },
    { src: '../public', dest: 'public' },
    { src: '../index.html', dest: 'index.html' },
    { src: '../package.json', dest: 'package.json' },
    { src: '../vite.config.ts', dest: 'vite.config.ts' },
    { src: '../tailwind.config.js', dest: 'tailwind.config.js' },
    { src: '../postcss.config.js', dest: 'postcss.config.js' },
    { src: '../tsconfig.json', dest: 'tsconfig.json' },
    { src: '../tsconfig.app.json', dest: 'tsconfig.app.json' },
    { src: '../tsconfig.node.json', dest: 'tsconfig.node.json' }
  ];

  // Créer le dossier temporaire
  const tempDir = path.join(buildDir, 'temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  // Copier les fichiers
  for (const file of filesToCopy) {
    const srcPath = path.join(__dirname, file.src);
    const destPath = path.join(tempDir, file.dest);
    
    if (fs.existsSync(srcPath)) {
      if (fs.statSync(srcPath).isDirectory()) {
        copyDirectory(srcPath, destPath);
      } else {
        copyFile(srcPath, destPath);
      }
    }
  }

  // Créer les fichiers de configuration
  await createConfigFiles(tempDir);
  
  // Créer l'archive
  await createArchive(tempDir);
  
  // Nettoyer
  fs.rmSync(tempDir, { recursive: true });
  
  console.log('✅ Package créé avec succès !');
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const items = fs.readdirSync(src);
  
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

async function createConfigFiles(tempDir) {
  // Créer le fichier README
  const readmeContent = `# GOBEX - Système de Gestion de Bar

## Installation et Lancement

1. Extraire l'archive dans un dossier
2. Ouvrir un terminal dans le dossier extrait
3. Exécuter les commandes suivantes :

\`\`\`bash
# Installer les dépendances
npm install

# Lancer l'application
npm run dev
\`\`\`

4. Ouvrir votre navigateur à l'adresse : http://localhost:5173

## Fonctionnalités

- ✅ Gestion des ventes avec facturation PDF
- ✅ Gestion des achats multiples
- ✅ Gestion des stocks avec inventaire
- ✅ Gestion des emballages
- ✅ Gestion des dépenses et charges
- ✅ Système de licences
- ✅ Rapports et analyses
- ✅ Paramètres configurables
- ✅ Stockage local des données

## Comptes par défaut

### Propriétaire
- Utilisateur : gobexpropriétaire
- Mot de passe : Ffreddy75@@7575xyzDistribpro2025

## Support

Pour toute assistance, contactez l'équipe GOBEX.

---
GOBEX v${packageConfig.version} - ${packageConfig.buildDate}
`;

  fs.writeFileSync(path.join(tempDir, 'README.md'), readmeContent);

  // Créer le script de lancement
  const launchScript = `#!/bin/bash

echo "🚀 Lancement de GOBEX..."
echo "📦 Installation des dépendances..."

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez l'installer depuis https://nodejs.org"
    exit 1
fi

# Vérifier si npm est installé
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé. Veuillez l'installer avec Node.js"
    exit 1
fi

# Installer les dépendances
npm install

# Lancer l'application
echo "🌐 Lancement de l'application..."
echo "📍 L'application sera disponible à : http://localhost:5173"
npm run dev
`;

  fs.writeFileSync(path.join(tempDir, 'launch.sh'), launchScript);
  fs.chmodSync(path.join(tempDir, 'launch.sh'), '755');

  // Script Windows
  const launchBat = `@echo off
echo 🚀 Lancement de GOBEX...
echo 📦 Installation des dépendances...

REM Vérifier si Node.js est installé
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js n'est pas installé. Veuillez l'installer depuis https://nodejs.org
    pause
    exit /b 1
)

REM Installer les dépendances
npm install

REM Lancer l'application
echo 🌐 Lancement de l'application...
echo 📍 L'application sera disponible à : http://localhost:5173
npm run dev
pause
`;

  fs.writeFileSync(path.join(tempDir, 'launch.bat'), launchBat);

  // Créer le fichier de configuration de l'application
  const appConfig = {
    ...packageConfig,
    storage: {
      type: 'localStorage',
      prefix: 'gobex_',
      encryption: false
    },
    features: {
      offline: true,
      autoSave: true,
      backup: true,
      multiUser: true,
      licensing: true
    },
    license: {
      types: {
        'Kpêvi': { duration: 1, price: 15000 },
        'Kléoun': { duration: 3, price: 40000 },
        'Agbon': { duration: 6, price: 70000 },
        'Baba': { duration: 12, price: 120000 }
      }
    }
  };

  fs.writeFileSync(
    path.join(tempDir, 'src', 'config', 'app.config.json'), 
    JSON.stringify(appConfig, null, 2)
  );
}

async function createArchive(sourceDir) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(path.join(buildDir, `${packageConfig.name}-v${packageConfig.version}.zip`));
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`📦 Archive créée : ${archive.pointer()} bytes`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

// Exécuter la création du package
createPackage().catch(console.error);