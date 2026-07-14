export interface Product {
  id: string;
  nom: string;
  categorie: string;
  prixAchat: number;
  prixVente: number;
  stockActuel: number;
  seuilAlerte?: number;
}

export interface SaleItem {
  produitId: string;
  produitNom: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
}

export interface Sale {
  id: string;
  numeroFacture: string;
  dateVente: string;
  client: string;
  items: SaleItem[];
  total: number;
  modePaiement: "Espèces" | "Mobile Money" | "Carte" | "Crédit";
}

export interface PurchaseItem {
  produitId: string;
  produitNom: string;
  quantite: number;
  prixAchat: number;
  total: number;
}

export interface Purchase {
  id: string;
  numeroCommande: string;
  dateAchat: string;
  fournisseur: string;
  items: PurchaseItem[];
  totalGeneral: number;
}

export interface Expense {
  id: string;
  date: string;
  libelle: string;
  montant: number;
  categorie: string;
}

export interface Settings {
  entreprise: {
    nom: string;
    email: string;
    telephone: string;
    adresse: string;
  };
  facturation: {
    tva: number;
    prefixeFacture: string;
    mentionsLegales: string;
  };
  factureCounter: number;
  commandeCounter: number;
}

export interface AppData {
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  settings: Settings;
}
