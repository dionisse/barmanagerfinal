import { 
  collection, 
  doc, 
  setDoc,
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  Timestamp,
  getFirestore,
  connectFirestoreEmulator
} from 'firebase/firestore';
import { initializeApp } from "firebase/app";

// Firebase configuration
// Updated configuration with correct credentials
const firebaseConfig = {
  apiKey: "AIzaSyDQzwACmPXuS_gMUaQJn1PSw-GQnXfGDSA",
  authDomain: "gobex-sync.firebaseapp.com",
  projectId: "gobex-sync",
  storageBucket: "gobex-sync.appspot.com",
  messagingSenderId: "1075842274123",
  appId: "1:1075842274123:web:e5d9b7f8c3a4f5e6d2c1b0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

export class FirebaseService {
  private debugMode: boolean = true;
  private connectionTested: boolean = false;

  // Méthode pour sauvegarder les données utilisateur
  async saveUserData(userId: string, data: any): Promise<{ success: boolean; message: string }> {
    try {
      if (!navigator.onLine) {
        return {
          success: false,
          message: 'Hors ligne - impossible de sauvegarder les données'
        };
      }
      
      this.logDebug('Sauvegarde des données pour l\'utilisateur:', userId);
      
      // Vérifier que l'ID utilisateur est valide
      if (!userId || (userId !== 'owner-001' && !userId.includes('_'))) {
        throw new Error(`Format d'ID utilisateur invalide: ${userId}`);
      }
      
      // S'assurer que tous les champs sont valides pour Firestore (pas de undefined)
      const sanitizedData = this.sanitizeDataForFirestore(data);
      
      // Référence au document utilisateur
      const userDocRef = doc(db, 'user_data', userId);
      
      // Ajouter un timestamp de dernière synchronisation
      const dataWithTimestamp = {
        ...sanitizedData,
        last_sync: serverTimestamp()
      };
      
      // Sauvegarder les données
      await setDoc(userDocRef, dataWithTimestamp, { merge: true });
      
      this.logDebug('Données sauvegardées avec succès pour l\'utilisateur:', userId);
      return {
        success: true,
        message: 'Données synchronisées avec succès'
      };
    } catch (error) {
      this.logDebug('Erreur lors de la sauvegarde des données:', error);
      return {
        success: false,
        message: `Erreur: ${error.message}`
      };
    }
  }

  // Méthode pour récupérer les données utilisateur
  async getUserData(userId: string): Promise<{ success: boolean; data?: any; lastSync?: string; message?: string }> {
    try {
      if (!navigator.onLine) {
        return {
          success: false,
          message: 'Hors ligne - impossible de récupérer les données'
        };
      }
      
      this.logDebug('Récupération des données pour l\'utilisateur:', userId);
      
      // Vérifier que l'ID utilisateur est valide
      if (!userId || (userId !== 'owner-001' && !userId.includes('_'))) {
        throw new Error(`Format d'ID utilisateur invalide: ${userId}`);
      }
      
      // Référence au document utilisateur
      const userDocRef = doc(db, 'user_data', userId);
      
      // Récupérer les données
      const docSnap = await getDoc(userDocRef);
      
      if (docSnap.exists()) {
        const userData = docSnap.data();
        
        // Convertir le timestamp Firestore en string ISO
        let lastSync = null;
        if (userData.last_sync) {
          const timestamp = userData.last_sync as Timestamp;
          lastSync = timestamp.toDate().toISOString();
        }
        
        this.logDebug('Données récupérées avec succès pour l\'utilisateur:', userId);
        return {
          success: true,
          data: userData,
          lastSync
        };
      } else {
        this.logDebug('Aucune donnée trouvée pour l\'utilisateur:', userId);
        return {
          success: true,
          data: null,
          message: 'Aucune donnée trouvée'
        };
      }
    } catch (error) {
      this.logDebug('Erreur lors de la récupération des données:', error);
      return {
        success: false,
        message: `Erreur: ${error.message}`
      };
    }
  }

  // Méthode pour authentifier un utilisateur
  async authenticateUser(username: string, password: string, userType: string): Promise<{ success: boolean; user?: any; message?: string }> {
    try {
      if (!navigator.onLine) {
        return {
          success: false,
          message: 'Hors ligne - impossible de s\'authentifier'
        };
      }
      
      this.logDebug('Tentative d\'authentification pour:', username, userType);
      
      // Cas spécial pour le propriétaire
      if (username === 'gobexpropriétaire' && password === 'Ffreddy75@@7575xyzDistribpro2025' && userType === 'Propriétaire') {
        return {
          success: true,
          user: {
            id: 'owner-001',
            username: 'gobexpropriétaire',
            type: 'Propriétaire',
            dateCreation: new Date().toISOString()
          }
        };
      }
      
      // Pour les autres utilisateurs, chercher dans la collection users
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef, 
        where('username', '==', username),
        where('password', '==', password),
        where('type', '==', userType)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return {
          success: false,
          message: 'Identifiants incorrects'
        };
      }
      
      // Récupérer les données de l'utilisateur
      const userData = querySnapshot.docs[0].data();
      const userId = querySnapshot.docs[0].id;
      
      // Vérifier si l'utilisateur a une licence active
      const userLotId = userData.user_lot_id;
      if (userLotId) {
        const licenseQuery = query(
          collection(db, 'licenses'),
          where('user_lot_id', '==', userLotId),
          where('active', '==', true)
        );
        
        const licenseSnapshot = await getDocs(licenseQuery);
        
        if (licenseSnapshot.empty) {
          return {
            success: false,
            message: 'Aucune licence active trouvée pour cet utilisateur'
          };
        }
        
        const licenseData = licenseSnapshot.docs[0].data();
        const dateFin = licenseData.date_fin.toDate();
        
        if (dateFin < new Date()) {
          return {
            success: false,
            message: 'Licence expirée. Contactez le propriétaire.'
          };
        }
        
        // Vérifier le statut du lot d'utilisateurs
        const userLotRef = doc(db, 'user_lots', userLotId);
        const userLotSnap = await getDoc(userLotRef);
        
        if (userLotSnap.exists() && userLotSnap.data().status !== 'active') {
          return {
            success: false,
            message: 'Compte suspendu. Contactez l\'administrateur.'
          };
        }
        
        // Construire l'objet utilisateur avec les informations de licence
        return {
          success: true,
          user: {
            id: userId,
            username: userData.username,
            type: userData.type,
            dateCreation: userData.date_creation.toDate().toISOString(),
            userLotId: userLotId,
            license: {
              type: licenseData.license_type,
              dateFin: dateFin.toISOString().split('T')[0]
            }
          }
        };
      }
      
      // Utilisateur sans licence (cas rare)
      return {
        success: true,
        user: {
          id: userId,
          username: userData.username,
          type: userData.type,
          dateCreation: userData.date_creation.toDate().toISOString()
        }
      };
    } catch (error) {
      this.logDebug('Erreur lors de l\'authentification:', error);
      return {
        success: false,
        message: `Erreur: ${error.message}`
      };
    }
  }

  // Méthode pour vérifier la licence d'un utilisateur
  async checkUserLicense(username: string): Promise<{ hasAccess: boolean; license?: any; userLot?: any; message?: string }> {
    try {
      if (!navigator.onLine) {
        return { hasAccess: false, message: 'Hors ligne - impossible de vérifier la licence' };
      }
      
      this.logDebug('Vérification de licence pour:', username);
      
      // Trouver l'utilisateur
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return { hasAccess: false };
      }
      
      const userData = querySnapshot.docs[0].data();
      const userLotId = userData.user_lot_id;
      
      if (!userLotId) {
        return { hasAccess: false };
      }
      
      // Récupérer le lot d'utilisateurs
      const userLotRef = doc(db, 'user_lots', userLotId);
      const userLotSnap = await getDoc(userLotRef);
      
      if (!userLotSnap.exists() || userLotSnap.data().status !== 'active') {
        return { hasAccess: false };
      }
      
      const userLot = {
        id: userLotId,
        ...userLotSnap.data()
      };
      
      // Vérifier la licence
      const licenseQuery = query(
        collection(db, 'licenses'),
        where('user_lot_id', '==', userLotId),
        where('active', '==', true)
      );
      
      const licenseSnapshot = await getDocs(licenseQuery);
      
      if (licenseSnapshot.empty) {
        return { hasAccess: false, userLot };
      }
      
      const licenseData = licenseSnapshot.docs[0].data();
      const dateFin = licenseData.date_fin.toDate();
      
      if (dateFin < new Date()) {
        return { hasAccess: false, userLot };
      }
      
      const license = {
        id: licenseSnapshot.docs[0].id,
        ...licenseData,
        dateFin: dateFin.toISOString().split('T')[0]
      };
      
      return {
        hasAccess: true,
        license,
        userLot
      };
    } catch (error) {
      this.logDebug('Erreur lors de la vérification de licence:', error);
      return { hasAccess: false, message: error.message };
    }
  }

  // Méthode pour enregistrer un lot d'utilisateurs et une licence
  async registerUserLotAndLicense(userLot: any, license: any): Promise<{ success: boolean; message?: string }> {
    try {
      if (!navigator.onLine) {
        return {
          success: false,
          message: 'Hors ligne - impossible d\'enregistrer'
        };
      }
      
      this.logDebug('Enregistrement d\'un lot d\'utilisateurs et licence');
      
      // Vérifier si les noms d'utilisateurs existent déjà
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef, 
        where('username', 'in', [userLot.gestionnaire.username, userLot.employe.username])
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const existingUsername = querySnapshot.docs[0].data().username;
        return {
          success: false,
          message: `Le nom d'utilisateur "${existingUsername}" existe déjà`
        };
      }
      
      // Créer le lot d'utilisateurs
      const userLotRef = doc(db, 'user_lots', userLot.id);
      await setDoc(userLotRef, {
        gestionnaire_username: userLot.gestionnaire.username,
        gestionnaire_password: userLot.gestionnaire.password,
        employe_username: userLot.employe.username,
        employe_password: userLot.employe.password,
        date_creation: new Date(userLot.dateCreation),
        status: userLot.status
      });
      
      // Créer la licence
      const licenseRef = doc(db, 'licenses', license.id);
      await setDoc(licenseRef, {
        license_type: license.type,
        duree: license.duree,
        prix: license.prix,
        date_debut: new Date(license.dateDebut),
        date_fin: new Date(license.dateFin),
        cle: license.cle,
        active: license.active,
        user_lot_id: userLot.id
      });
      
      // Créer les utilisateurs
      const gestionnaireRef = doc(db, 'users', `${userLot.id}_gestionnaire`);
      await setDoc(gestionnaireRef, {
        username: userLot.gestionnaire.username,
        password: userLot.gestionnaire.password,
        type: 'Gestionnaire',
        date_creation: new Date(userLot.dateCreation),
        user_lot_id: userLot.id
      });
      
      const employeRef = doc(db, 'users', `${userLot.id}_employe`);
      await setDoc(employeRef, {
        username: userLot.employe.username,
        password: userLot.employe.password,
        type: 'Employé',
        date_creation: new Date(userLot.dateCreation),
        user_lot_id: userLot.id
      });
      
      return {
        success: true
      };
    } catch (error) {
      this.logDebug('Erreur lors de l\'enregistrement:', error);
      return {
        success: false,
        message: `Erreur: ${error.message}`
      };
    }
  }

  // Méthode pour tester la connectivité
  async testConnection(): Promise<boolean> {
    try {
      if (!navigator.onLine) {
        this.logDebug('Appareil hors ligne - test de connexion impossible');
        return false;
      }
      
      this.logDebug('Test de connectivité Firebase en cours...');
      
      if (this.connectionTested) {
        this.logDebug('Connexion déjà testée avec succès');
        return true; // Éviter de tester trop souvent
      }
      
      // Méthode simplifiée pour tester la connexion sans écrire dans la base
      try {
        // Tenter de lire un document qui n'existe probablement pas
        // Cela testera la connectivité sans écrire dans la base
        const testRef = doc(db, 'connection_tests', 'test-connection');
        await getDoc(testRef);
        
        // Si on arrive ici, la connexion fonctionne
        this.connectionTested = true;
        this.logDebug('Connexion Firebase réussie');
        return true;
      } catch (error) {
        // Vérifier si l'erreur est liée à l'authentification ou à la permission
        // Ces erreurs indiquent que la connexion fonctionne mais l'accès est refusé
        if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
          this.connectionTested = true;
          this.logDebug('Connexion Firebase réussie (accès refusé mais connexion établie)');
          return true;
        }
        
        this.logDebug('Erreur de connexion Firebase:', error);
        return false;
      }
      
    } catch (error) {
      this.logDebug('Test de connexion échoué:', error);
      return false;
    }
  }

  // Méthode pour les logs de debug
  private logDebug(...args: any[]): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // Format HH:MM:SS
      console.log(`🔥 [FirebaseService ${timestamp}]`, ...args);
    }
  }

  // Activer/désactiver le mode debug
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.logDebug(`Mode debug ${enabled ? 'activé' : 'désactivé'}`);
  }
  
  // Méthode pour nettoyer les données avant de les envoyer à Firestore
  private sanitizeDataForFirestore(data: any): any {
    if (data === null || data === undefined) {
      return {};
    }
    
    if (typeof data !== 'object') {
      return data;
    }
    
    // Si c'est un tableau
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeDataForFirestore(item));
    }
    
    // Si c'est un objet
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) {
        // Remplacer undefined par null (accepté par Firestore)
        sanitized[key] = null;
      } else if (typeof value === 'object' && value !== null) {
        // Récursion pour les objets imbriqués
        sanitized[key] = this.sanitizeDataForFirestore(value);
      } else {
        // Valeurs primitives
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}

export const firebaseService = new FirebaseService();