import type { AppData, Sale } from "../types";

export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(Math.round(amount)) + " FCFA";
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function getDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function isSameDay(dateStr: string, refDate: Date): boolean {
  const d = new Date(dateStr);
  return d.toDateString() === refDate.toDateString();
}

export function getRevenueForPeriod(sales: Sale[], days: number): number {
  const cutoff = getDaysAgo(days);
  return sales
    .filter((s) => s.dateVente >= cutoff)
    .reduce((sum, s) => sum + s.total, 0);
}

export function getRevenueByDay(sales: Sale[], days: number): { date: string; revenue: number; label: string }[] {
  const result: { date: string; revenue: number; label: string }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const revenue = sales
      .filter((s) => s.dateVente === dateStr)
      .reduce((sum, s) => sum + s.total, 0);
    result.push({
      date: dateStr,
      revenue,
      label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
    });
  }
  return result;
}

export function getTopProducts(sales: Sale[], limit: number): { nom: string; quantite: number; revenue: number }[] {
  const map = new Map<string, { nom: string; quantite: number; revenue: number }>();
  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const existing = map.get(item.produitId) || { nom: item.produitNom, quantite: 0, revenue: 0 };
      existing.quantite += item.quantite;
      existing.revenue += item.total;
      map.set(item.produitId, existing);
    });
  });
  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function getRevenueByCategory(sales: Sale[], products: AppData["products"]): { categorie: string; revenue: number }[] {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const map = new Map<string, number>();
  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const prod = productMap.get(item.produitId);
      const cat = prod?.categorie || "Autres";
      map.set(cat, (map.get(cat) || 0) + item.total);
    });
  });
  return Array.from(map.entries())
    .map(([categorie, revenue]) => ({ categorie, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function getPaymentModeBreakdown(sales: Sale[]): { mode: string; count: number; revenue: number }[] {
  const map = new Map<string, { count: number; revenue: number }>();
  sales.forEach((s) => {
    const existing = map.get(s.modePaiement) || { count: 0, revenue: 0 };
    existing.count += 1;
    existing.revenue += s.total;
    map.set(s.modePaiement, existing);
  });
  return Array.from(map.entries()).map(([mode, v]) => ({ mode, ...v }));
}

export function getStockValue(products: AppData["products"]): number {
  return products.reduce((sum, p) => sum + Math.max(0, p.stockActuel) * p.prixAchat, 0);
}

export function getLowStockProducts(products: AppData["products"]): AppData["products"] {
  return products
    .filter((p) => p.stockActuel <= (p.seuilAlerte || 50))
    .sort((a, b) => a.stockActuel - b.stockActuel);
}

export function getProfitForPeriod(sales: Sale[], products: AppData["products"], days: number): number {
  const cutoff = getDaysAgo(days);
  const productMap = new Map(products.map((p) => [p.id, p]));
  let revenue = 0;
  let cost = 0;
  sales
    .filter((s) => s.dateVente >= cutoff)
    .forEach((sale) => {
      sale.items.forEach((item) => {
        revenue += item.total;
        const prod = productMap.get(item.produitId);
        cost += (prod?.prixAchat || 0) * item.quantite;
      });
    });
  return revenue - cost;
}

export function getExpensesForPeriod(expenses: AppData["expenses"], days: number): number {
  const cutoff = getDaysAgo(days);
  return expenses
    .filter((e) => e.date >= cutoff)
    .reduce((sum, e) => sum + e.montant, 0);
}

export function getTodaySalesCount(sales: Sale[]): number {
  const today = new Date().toISOString().slice(0, 10);
  return sales.filter((s) => s.dateVente === today).length;
}

export function getTodayRevenue(sales: Sale[]): number {
  const today = new Date().toISOString().slice(0, 10);
  return sales.filter((s) => s.dateVente === today).reduce((sum, s) => sum + s.total, 0);
}
