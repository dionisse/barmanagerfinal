export type UserType = 'Gestionnaire' | 'Employé' | 'Propriétaire';

export interface UserLot {
  id: string;
  gestionnaire: {
    username: string;
    password: string;
  };
  employe: {
    username: string;
    password: string;
  };
  dateCreation: string;
  status: 'active' | 'suspended';
}

export interface License {
  id: string;
  type: 'Kpêvi' | 'Kléoun' | 'Agbon' | 'Baba';
  duree: number;
  prix: number;
  dateDebut: string;
  dateFin: string;
  cle: string;
  active: boolean;
  userLotId?: string;
  userLot?: UserLot;
}

export interface User {
  id: string;
  username: string;
  type: UserType;
  dateCreation: string;
  license?: License;
  userLotId?: string;
}

export interface Product {
  id: string;
  nom: string;
  prixAchat: number;
  prixVente: number;
  categorie: string;
  stockActuel: number;
  seuilAlerte?: number;
}

export interface Purchase {
  id: string;
  dateAchat: string;
  fournisseur: string;
  produitId: string;
  produitNom: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
}

export interface MultiPurchase {
  id: string;
  dateAchat: string;
  fournisseur: string;
  items: PurchaseItem[];
  totalGeneral: number;
  numeroCommande: string;
}

export interface PurchaseItem {
  produitId: string;
  produitNom: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
}

export interface Sale {
  id: string;
  dateVente: string;
  client: string;
  produitId: string;
  produitNom: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
  numeroFacture: string;
  emecefCode?: string;
  emecefStatus?: 'pending' | 'success' | 'error';
  emecefError?: string;
}

export interface Packaging {
  id: string;
  nom: string;
  type: string;
  stockActuel: number;
  prixUnitaire: number;
  seuilAlerte?: number;
}

export interface PackagingPurchase {
  id: string;
  dateAchat: string;
  fournisseur: string;
  packagingId: string;
  packagingNom: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  montant: number;
  categorie: string;
  destinataire: string;
  type: 'Dépense' | 'Charge';
}

export interface LicenseSettings {
  Kpêvi: { duree: 1; prix: 15000 };
  Kléoun: { duree: 3; prix: 40000 };
  Agbon: { duree: 6; prix: 70000 };
  Baba: { duree: 12; prix: 120000 };
}

export interface DashboardStats {
  ventesJour: number;
  stockTotal: number;
  beneficeNet: number;
  roi: number;
}

export interface InventoryRecord {
  id: string;
  date: string;
  produitId: string;
  produitNom: string;
  stockTheorique: number;
  stockReel: number;
  avaries: number;
  stockVendu: number; // Peut être calculé ou saisi manuellement
  coutVente: number;
  observations: string;
}

export interface Settings {
  entreprise: {
    nom: string;
    adresse: string;
    telephone: string;
    email: string;
  };
  fiscalite: {
    nif: string;
    rccm: string;
    adresseFiscale: string;
    activitePrincipale: string;
    regimeFiscal: string;
    centreImpot: string;
    emecefApiUrl: string;
    emecefEnabled: boolean;
  };
  facturation: {
    prefixeFacture: string;
    tva: number;
    mentionsLegales: string;
  };
  notifications: {
    stockFaible: boolean;
    licenceExpiration: boolean;
    rapportsAutomatiques: boolean;
  };
  sauvegarde: {
    automatique: boolean;
    frequence: string;
  };
}

export interface StockSalesCalculation {
  id: string;
  date: string;
  productId: string;
  productName: string;
  initialStock: number;
  finalStock: number;
  stockEntry: number;
  damaged: number;
  broken: number;
  leaking: number;
  quantitySold: number;
  notes: string;
  createdAt: string;
  createdBy: string;
}