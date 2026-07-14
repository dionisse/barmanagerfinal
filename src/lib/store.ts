import { useEffect, useSyncExternalStore } from "react";
import type { AppData, Product, Sale, Purchase, Expense } from "../types";
import { SEED_DATA } from "../data/seed";

const STORAGE_KEY = "barigo-data-v1";

let data: AppData = loadData();
const listeners = new Set<() => void>();

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return structuredClone(SEED_DATA);
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return data;
}

export function useStore(): AppData {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function getData(): AppData {
  return data;
}

export function setData(updater: (d: AppData) => AppData) {
  data = updater(data);
  emit();
}

export function resetData() {
  data = structuredClone(SEED_DATA);
  emit();
}

let idCounter = Date.now();
export function generateId(prefix = "id"): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function generateFactureNumber(): string {
  const counter = data.settings.factureCounter + 1;
  setData((d) => ({
    ...d,
    settings: { ...d.settings, factureCounter: counter },
  }));
  return `${data.settings.facturation.prefixeFacture}-${counter}`;
}

export function generateCommandeNumber(): string {
  const counter = data.settings.commandeCounter + 1;
  setData((d) => ({
    ...d,
    settings: { ...d.settings, commandeCounter: counter },
  }));
  return `CMD-${counter}`;
}

export const storeActions = {
  addProduct(product: Omit<Product, "id">) {
    const newProduct: Product = { ...product, id: generateId("prod") };
    setData((d) => ({ ...d, products: [...d.products, newProduct] }));
    return newProduct;
  },

  updateProduct(id: string, updates: Partial<Product>) {
    setData((d) => ({
      ...d,
      products: d.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  },

  deleteProduct(id: string) {
    setData((d) => ({
      ...d,
      products: d.products.filter((p) => p.id !== id),
    }));
  },

  addSale(sale: Omit<Sale, "id" | "numeroFacture">) {
    const numeroFacture = generateFactureNumber();
    const newSale: Sale = { ...sale, id: generateId("sale"), numeroFacture };
    setData((d) => {
      const products = d.products.map((p) => {
        const item = sale.items.find((i) => i.produitId === p.id);
        return item ? { ...p, stockActuel: p.stockActuel - item.quantite } : p;
      });
      return { ...d, sales: [newSale, ...d.sales], products };
    });
    return newSale;
  },

  deleteSale(id: string) {
    setData((d) => {
      const sale = d.sales.find((s) => s.id === id);
      if (!sale) return d;
      const products = d.products.map((p) => {
        const item = sale.items.find((i) => i.produitId === p.id);
        return item ? { ...p, stockActuel: p.stockActuel + item.quantite } : p;
      });
      return {
        ...d,
        sales: d.sales.filter((s) => s.id !== id),
        products,
      };
    });
  },

  addPurchase(purchase: Omit<Purchase, "id" | "numeroCommande">) {
    const numeroCommande = generateCommandeNumber();
    const newPurchase: Purchase = { ...purchase, id: generateId("purch"), numeroCommande };
    setData((d) => {
      const products = d.products.map((p) => {
        const item = purchase.items.find((i) => i.produitId === p.id);
        return item
          ? { ...p, stockActuel: p.stockActuel + item.quantite, prixAchat: item.prixAchat }
          : p;
      });
      return { ...d, purchases: [newPurchase, ...d.purchases], products };
    });
    return newPurchase;
  },

  addExpense(expense: Omit<Expense, "id">) {
    const newExpense: Expense = { ...expense, id: generateId("exp") };
    setData((d) => ({ ...d, expenses: [newExpense, ...d.expenses] }));
    return newExpense;
  },

  deleteExpense(id: string) {
    setData((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) }));
  },

  updateSettings(updates: Partial<AppData["settings"]>) {
    setData((d) => ({ ...d, settings: { ...d.settings, ...updates } }));
  },

  adjustStock(productId: string, newStock: number) {
    setData((d) => ({
      ...d,
      products: d.products.map((p) =>
        p.id === productId ? { ...p, stockActuel: newStock } : p
      ),
    }));
  },
};

export function usePersistentStore() {
  const d = useStore();
  useEffect(() => {
    persist();
  }, [d]);
  return d;
}
