export interface EmecefInvoiceData {
  client: {
    nom: string;
    adresse?: string;
    telephone?: string;
    email?: string;
    nif?: string;
  };
  items: Array<{
    designation: string;
    quantite: number;
    prixUnitaire: number;
    total: number;
    tva?: number;
  }>;
  total: number;
  tva: number;
  totalTTC: number;
  numeroFacture: string;
  dateFacture: string;
}

export interface EmecefResponse {
  success: boolean;
  data?: {
    codeEmecef: string;
    numeroFacture: string;
    qrCode?: string;
    dateGeneration: string;
  };
  error?: string;
  message?: string;
}

export interface FiscalSettings {
  nif: string;
  rccm: string;
  adresseFiscale: string;
  activitePrincipale: string;
  regimeFiscal: string;
  centreImpot: string;
  emecefApiUrl: string;
  emecefEnabled: boolean;
}

export class EmecefService {
  private debugMode: boolean = true;
  private retryCount: number = 3;
  private retryDelay: number = 2000; // 2 secondes

  // Générer un code eMecef pour une facture
  async generateEmecefCode(
    invoiceData: EmecefInvoiceData,
    fiscalSettings: FiscalSettings
  ): Promise<EmecefResponse> {
    try {
      // Vérifier si eMecef est activé
      if (!fiscalSettings.emecefEnabled) {
        return {
          success: false,
          error: 'eMecef n\'est pas activé dans les paramètres'
        };
      }

      // Vérifier les informations fiscales obligatoires
      const missingFields = this.validateFiscalSettings(fiscalSettings);
      if (missingFields.length > 0) {
        return {
          success: false,
          error: `Informations fiscales manquantes: ${missingFields.join(', ')}`
        };
      }

      // Vérifier la connectivité
      if (!navigator.onLine) {
        return {
          success: false,
          error: 'Aucune connexion internet disponible'
        };
      }

      this.logDebug('Génération du code eMecef pour la facture:', invoiceData.numeroFacture);

      // Préparer les données pour l'API standardizedInvoice
      const apiPayload = this.prepareApiPayload(invoiceData, fiscalSettings);

      // Log détaillé du payload envoyé à standardizedInvoice
      this.logDebug('=== DONNÉES ENVOYÉES À STANDARDIZEDINVOICE ===');
      this.logDebug('URL de l\'API:', fiscalSettings.emecefApiUrl);
      this.logDebug('Payload complet:', JSON.stringify(apiPayload, null, 2));
      this.logDebug('Données originales de la facture:', JSON.stringify(invoiceData, null, 2));
      this.logDebug('Paramètres fiscaux:', JSON.stringify(fiscalSettings, null, 2));
      this.logDebug('===============================================');

      // Appeler l'API avec retry
      const result = await this.callEmecefApiWithRetry(apiPayload, fiscalSettings.emecefApiUrl);

      if (result.success) {
        this.logDebug('Code eMecef généré avec succès:', result.data?.codeEmecef);
      } else {
        this.logDebug('Erreur lors de la génération du code eMecef:', result.error);
      }

      return result;
    } catch (error) {
      this.logDebug('Erreur dans generateEmecefCode:', error);
      return {
        success: false,
        error: `Erreur technique: ${error.message}`
      };
    }
  }

  // Valider les paramètres fiscaux obligatoires
  private validateFiscalSettings(settings: FiscalSettings): string[] {
    const missingFields: string[] = [];
    
    if (!settings.nif) missingFields.push('NIF');
    if (!settings.rccm) missingFields.push('RCCM');
    if (!settings.adresseFiscale) missingFields.push('Adresse fiscale');
    if (!settings.emecefApiUrl) missingFields.push('URL de l\'API eMecef');
    
    return missingFields;
  }

  // Préparer les données pour l'API standardizedInvoice
  private prepareApiPayload(invoiceData: EmecefInvoiceData, fiscalSettings: FiscalSettings) {
    return {
      // Informations de l'entreprise émettrice
      entreprise: {
        nif: fiscalSettings.nif,
        rccm: fiscalSettings.rccm,
        adresse: fiscalSettings.adresseFiscale,
        activitePrincipale: fiscalSettings.activitePrincipale,
        regimeFiscal: fiscalSettings.regimeFiscal,
        centreImpot: fiscalSettings.centreImpot
      },
      
      // Informations du client
      client: {
        nom: invoiceData.client.nom,
        adresse: invoiceData.client.adresse || '',
        telephone: invoiceData.client.telephone || '',
        email: invoiceData.client.email || '',
        nif: invoiceData.client.nif || ''
      },
      
      // Détails de la facture
      facture: {
        numeroFacture: invoiceData.numeroFacture,
        dateFacture: invoiceData.dateFacture,
        items: invoiceData.items.map(item => ({
          designation: item.designation,
          quantite: item.quantite,
          prixUnitaire: item.prixUnitaire,
          total: item.total,
          tva: item.tva || invoiceData.tva
        })),
        totalHT: invoiceData.total,
        totalTVA: invoiceData.totalTTC - invoiceData.total,
        totalTTC: invoiceData.totalTTC
      }
    };
  }

  // Appeler l'API avec retry automatique
  private async callEmecefApiWithRetry(payload: any, apiUrl: string): Promise<EmecefResponse> {
    // Vérifier d'abord la connectivité de base
    if (!navigator.onLine) {
      this.logDebug('❌ Aucune connexion internet détectée');
      return {
        success: false,
        error: 'Aucune connexion internet disponible'
      };
    }

    // Vérifier que l'URL est valide
    try {
      new URL(apiUrl);
    } catch (urlError) {
      this.logDebug('❌ URL de l\'API invalide:', apiUrl);
      return {
        success: false,
        error: `URL de l'API invalide: ${apiUrl}`
      };
    }

    let lastError;
    
    this.logDebug('=== DÉBUT DES TENTATIVES D\'APPEL API ===');
    this.logDebug('URL cible:', `${apiUrl}/api/generate-invoice`);
    this.logDebug('Nombre de tentatives configurées:', this.retryCount);
    
    for (let attempt = 0; attempt < this.retryCount; attempt++) {
      try {
        this.logDebug(`🔄 TENTATIVE ${attempt + 1}/${this.retryCount}`);
        this.logDebug('Headers de la requête:', {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        });
        
        // Ajouter un timeout pour éviter les blocages
        const response = await fetch(`${apiUrl}/api/generate-invoice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(30000) // Timeout de 30 secondes
        });

        this.logDebug(`Statut de la réponse: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          const errorText = await response.text();
          this.logDebug('Texte d\'erreur de la réponse:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        this.logDebug('Réponse JSON reçue:', JSON.stringify(result, null, 2));
        
        // Vérifier la structure de la réponse
        if (result.success && result.data && result.data.codeEmecef) {
          this.logDebug('✅ Code eMecef extrait avec succès:', result.data.codeEmecef);
          return {
            success: true,
            data: {
              codeEmecef: result.data.codeEmecef,
              numeroFacture: result.data.numeroFacture || payload.facture.numeroFacture,
              qrCode: result.data.qrCode,
              dateGeneration: result.data.dateGeneration || new Date().toISOString()
            }
          };
        } else {
          this.logDebug('❌ Structure de réponse invalide ou code eMecef manquant');
          throw new Error(result.error || 'Réponse invalide de l\'API eMecef');
        }
      } catch (error) {
        this.logDebug(`❌ Tentative ${attempt + 1} échouée:`, error.message);
        this.logDebug('Détails de l\'erreur:', error);
        lastError = error;
        
        // Analyser le type d'erreur pour fournir des messages plus précis
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          this.logDebug('🔍 Erreur de type "Failed to fetch" détectée - problème de connectivité ou CORS');
        } else if (error.name === 'AbortError') {
          this.logDebug('⏰ Timeout de la requête - l\'API met trop de temps à répondre');
        }

        // Attendre avant de réessayer (sauf pour la dernière tentative)
        if (attempt < this.retryCount - 1) {
          this.logDebug(`⏳ Attente de ${this.retryDelay}ms avant la prochaine tentative...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }
    
    this.logDebug('=== TOUTES LES TENTATIVES ONT ÉCHOUÉ ===');
    this.logDebug('Dernière erreur:', lastError);
    
    // Fournir un message d'erreur plus informatif selon le type d'erreur
    let errorMessage = `Échec après ${this.retryCount} tentatives: ${lastError.message}`;
    
    if (lastError.name === 'TypeError' && lastError.message.includes('Failed to fetch')) {
      errorMessage += '\n\nCauses possibles:\n- L\'API standardizedInvoice n\'est pas accessible\n- Problème de configuration CORS\n- URL de l\'API incorrecte\n- Aucune connexion internet';
    } else if (lastError.name === 'AbortError') {
      errorMessage += '\n\nL\'API met trop de temps à répondre (timeout de 30s)';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }

  // Tester la connectivité avec l'API eMecef
  async testConnection(apiUrl: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!apiUrl) {
        return {
          success: false,
          message: 'URL de l\'API eMecef non configurée'
        };
      }

      if (!navigator.onLine) {
        return {
          success: false,
          message: 'Aucune connexion internet'
        };
      }

      this.logDebug('Test de connexion à l\'API eMecef:', apiUrl);

      const response = await fetch(`${apiUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Connexion à l\'API eMecef réussie'
        };
      } else {
        return {
          success: false,
          message: `Erreur HTTP ${response.status}`
        };
      }
    } catch (error) {
      this.logDebug('Erreur de test de connexion:', error);
      return {
        success: false,
        message: `Erreur de connexion: ${error.message}`
      };
    }
  }

  // Obtenir le statut d'une facture eMecef
  async getInvoiceStatus(numeroFacture: string, apiUrl: string): Promise<EmecefResponse> {
    try {
      if (!apiUrl) {
        return {
          success: false,
          error: 'URL de l\'API eMecef non configurée'
        };
      }

      const response = await fetch(`${apiUrl}/api/invoice-status/${numeroFacture}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de la vérification du statut: ${error.message}`
      };
    }
  }

  // Méthode pour les logs de debug
  private logDebug(...args: any[]): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      console.log(`🧾 [EmecefService ${timestamp}]`, ...args);
    }
  }

  // Activer/désactiver le mode debug
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
}

// Instance globale
export const emecefService = new EmecefService();