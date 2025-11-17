// Service pour interagir avec la base de données Neon via les fonctions Netlify
export class DatabaseService {
  private baseUrl: string;
  private retryCount: number = 3;
  private retryDelay: number = 1000;
  private debugMode: boolean = true;

  constructor() {
    // En production, utiliser l'URL de votre site Netlify
    this.baseUrl = import.meta.env.PROD 
      ? `${window.location.origin}/.netlify/functions`
      : 'http://localhost:8888/.netlify/functions';
  }

  async authenticateUser(username: string, password: string, userType: string) {
    return this.executeWithRetry(async () => {
      this.logDebug('Tentative d\'authentification pour:', username, userType);
      
      const response = await fetch(`${this.baseUrl}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          username,
          password,
          userType
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logDebug('Erreur d\'authentification:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      this.logDebug('Résultat d\'authentification:', result.success);
      return result;
    });
  }

  async registerUserLotAndLicense(userLot: any, license: any) {
    return this.executeWithRetry(async () => {
      this.logDebug('Enregistrement d\'un lot d\'utilisateurs et licence');
      
      const response = await fetch(`${this.baseUrl}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'register',
          userLot,
          license
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logDebug('Erreur d\'enregistrement:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      this.logDebug('Résultat d\'enregistrement:', result.success);
      return result;
    });
  }

  async checkUserLicense(username: string) {
    return this.executeWithRetry(async () => {
      this.logDebug('Vérification de licence pour:', username);
      
      const response = await fetch(`${this.baseUrl}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'checkLicense',
          username
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logDebug('Erreur de vérification de licence:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      this.logDebug('Résultat de vérification de licence:', result.hasAccess);
      return result;
    });
  }

  async syncUserData(userId: string, data: any) {
    return this.executeWithRetry(async () => {
      this.logDebug('Synchronisation des données pour l\'utilisateur:', userId);
      
      // Vérifier que l'ID utilisateur est valide
      if (!userId || (userId !== 'owner-001' && !userId.includes('_'))) {
        throw new Error(`Format d'ID utilisateur invalide: ${userId}`);
      }
      
      const response = await fetch(`${this.baseUrl}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'syncData',
          userId,
          data
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logDebug('Erreur de synchronisation:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      this.logDebug('Résultat de synchronisation:', result.success);
      return result;
    });
  }

  async getUserData(userId: string) {
    return this.executeWithRetry(async () => {
      this.logDebug('Récupération des données pour l\'utilisateur:', userId);
      
      // Vérifier que l'ID utilisateur est valide
      if (!userId || (userId !== 'owner-001' && !userId.includes('_'))) {
        throw new Error(`Format d'ID utilisateur invalide: ${userId}`);
      }
      
      const response = await fetch(`${this.baseUrl}/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getUserData',
          userId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logDebug('Erreur de récupération des données:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      this.logDebug('Résultat de récupération des données:', result.success);
      return result;
    });
  }

  async saveUserData(userId: string, data: any) {
    return this.executeWithRetry(async () => {
      this.logDebug('Sauvegarde des données pour l\'utilisateur:', userId);
      
      // Vérifier que l'ID utilisateur est valide
      if (!userId || (userId !== 'owner-001' && !userId.includes('_'))) {
        throw new Error(`Format d'ID utilisateur invalide: ${userId}`);
      }
      
      const response = await fetch(`${this.baseUrl}/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'saveUserData',
          userId,
          ...data
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logDebug('Erreur de sauvegarde des données:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      this.logDebug('Résultat de sauvegarde des données:', result.success);
      return result;
    });
  }

  async getAllLicenses() {
    return this.executeWithRetry(async () => {
      this.logDebug('Récupération de toutes les licences');
      
      const response = await fetch(`${this.baseUrl}/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getAllLicenses'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logDebug('Erreur de récupération des licences:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      this.logDebug('Licences récupérées:', result.licenses?.length || 0);
      return result;
    });
  }

  async getAllUserLots() {
    return this.executeWithRetry(async () => {
      this.logDebug('Récupération de tous les lots d\'utilisateurs');
      
      const response = await fetch(`${this.baseUrl}/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getAllUserLots'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logDebug('Erreur de récupération des lots d\'utilisateurs:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      this.logDebug('Lots d\'utilisateurs récupérés:', result.userLots?.length || 0);
      return result;
    });
  }

  // Méthode pour tester la connectivité
  async testConnection() {
    try {
      this.logDebug('Test de connectivité');
      
      const response = await fetch(`${this.baseUrl}/debug`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      this.logDebug('Résultat du test de connectivité:', result);
      return response.ok;
    } catch (error) {
      this.logDebug('Test de connexion échoué:', error);
      return false;
    }
  }

  // Méthode pour exécuter une requête avec retry automatique
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError;
    
    for (let attempt = 0; attempt < this.retryCount; attempt++) {
      try {
        return await fn();
      } catch (error) {
        this.logDebug(`Tentative ${attempt + 1}/${this.retryCount} échouée:`, error.message);
        lastError = error;
        
        // Attendre avant de réessayer
        if (attempt < this.retryCount - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)));
        }
      }
    }
    
    throw lastError;
  }

  // Méthode pour les logs de debug
  private logDebug(...args: any[]): void {
    if (this.debugMode) {
      console.log('🔄 [DatabaseService]', ...args);
    }
  }

  // Activer/désactiver le mode debug
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
}

export const databaseService = new DatabaseService();