import { useState, useMemo } from "react";
import {
  Search,
  Eye,
  Trash2,
  Receipt,
  Calendar,
  ShoppingBag,
  Printer,
  X,
} from "lucide-react";
import { useStore, storeActions } from "../lib/store";
import { formatFCFA, formatDate, formatNumber } from "../lib/utils";
import { Modal } from "../components/Modal";
import type { Sale } from "../types";

export default function Ventes() {
  const data = useStore();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [viewing, setViewing] = useState<Sale | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...data.sales]
      .sort((a, b) => b.dateVente.localeCompare(a.dateVente))
      .filter((s) =>
        s.numeroFacture.toLowerCase().includes(q) ||
        s.client.toLowerCase().includes(q) ||
        s.items.some((i) => i.produitNom.toLowerCase().includes(q))
      )
      .filter((s) => !dateFilter || s.dateVente === dateFilter);
  }, [data.sales, search, dateFilter]);

  const totalRevenue = filtered.reduce((sum, s) => sum + s.total, 0);

  function remove(id: string) {
    if (confirm("Supprimer cette vente ? Le stock sera restauré.")) storeActions.deleteSale(id);
  }

  function printFacture() {
    window.print();
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-4 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-xs text-night-400">Total ventes</p>
              <p className="font-display font-bold text-xl text-white">{formatNumber(filtered.length)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 animate-slide-up" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-night-400">Revenu total</p>
              <p className="font-display font-bold text-xl text-white">{formatFCFA(totalRevenue)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 animate-slide-up col-span-2 lg:col-span-1" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-400/15 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <p className="text-xs text-night-400">Panier moyen</p>
              <p className="font-display font-bold text-xl text-white">
                {formatFCFA(filtered.length > 0 ? totalRevenue / filtered.length : 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-night-400" />
          <input
            type="text"
            placeholder="Rechercher par facture, client, produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-11"
          />
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="input sm:w-48"
        />
        {dateFilter && (
          <button onClick={() => setDateFilter("")} className="btn-ghost">
            <X className="w-4 h-4" />
            Effacer
          </button>
        )}
      </div>

      {/* Sales list */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-night-800">
                <th className="text-left text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3">Facture</th>
                <th className="text-left text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Date</th>
                <th className="text-left text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Client</th>
                <th className="text-center text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Articles</th>
                <th className="text-left text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Paiement</th>
                <th className="text-right text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3">Total</th>
                <th className="text-right text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((sale) => (
                <tr key={sale.id} className="border-b border-night-800/50 hover:bg-night-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-white">{sale.numeroFacture}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-sm text-night-300">{formatDate(sale.dateVente)}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-night-300">{sale.client}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-center">
                    <span className="badge bg-night-700 text-night-300">{sale.items.length}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`badge ${
                      sale.modePaiement === "Espèces" ? "bg-emerald-500/15 text-emerald-400" :
                      sale.modePaiement === "Mobile Money" ? "bg-primary-500/15 text-primary-400" :
                      sale.modePaiement === "Carte" ? "bg-accent-400/15 text-accent-400" :
                      "bg-amber-500/15 text-amber-400"
                    }`}>
                      {sale.modePaiement}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-white">{formatFCFA(sale.total)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setViewing(sale)}
                        className="p-2 rounded-lg text-night-400 hover:bg-night-700 hover:text-primary-400 transition-all"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => remove(sale.id)}
                        className="p-2 rounded-lg text-night-400 hover:bg-red-500/15 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-night-400">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucune vente trouvée</p>
          </div>
        )}
        {filtered.length > 100 && (
          <div className="text-center py-3 text-xs text-night-400 border-t border-night-800">
            Affichage de 100 ventes sur {filtered.length}
          </div>
        )}
      </div>

      {/* Invoice detail modal */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title="Détail de la vente"
        size="lg"
      >
        {viewing && (
          <div className="space-y-4">
            {/* Invoice header */}
            <div className="flex items-start justify-between p-4 rounded-xl bg-night-800/50">
              <div>
                <p className="text-xs text-night-400 mb-1">Facture</p>
                <p className="font-display font-bold text-lg text-white">{viewing.numeroFacture}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-night-400 mb-1">Date</p>
                <p className="text-sm text-white">{formatDate(viewing.dateVente)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="card p-3 bg-night-800/30">
                <p className="text-xs text-night-400 mb-1">Client</p>
                <p className="text-sm text-white">{viewing.client}</p>
              </div>
              <div className="card p-3 bg-night-800/30">
                <p className="text-xs text-night-400 mb-1">Mode de paiement</p>
                <p className="text-sm text-white">{viewing.modePaiement}</p>
              </div>
            </div>

            {/* Items table */}
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-night-800">
                    <th className="text-left text-xs font-medium text-night-400 px-4 py-2">Produit</th>
                    <th className="text-center text-xs font-medium text-night-400 px-4 py-2">Qté</th>
                    <th className="text-right text-xs font-medium text-night-400 px-4 py-2">Prix unit.</th>
                    <th className="text-right text-xs font-medium text-night-400 px-4 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewing.items.map((item, i) => (
                    <tr key={i} className="border-b border-night-800/50">
                      <td className="px-4 py-2.5 text-sm text-white">{item.produitNom}</td>
                      <td className="px-4 py-2.5 text-center text-sm text-night-300">{item.quantite}</td>
                      <td className="px-4 py-2.5 text-right text-sm text-night-300">{formatFCFA(item.prixUnitaire)}</td>
                      <td className="px-4 py-2.5 text-right text-sm font-semibold text-white">{formatFCFA(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-primary-500/10 border border-primary-500/20">
              <span className="text-sm text-night-300">Total</span>
              <span className="font-display font-bold text-2xl text-primary-400">{formatFCFA(viewing.total)}</span>
            </div>

            <button onClick={printFacture} className="btn-accent w-full">
              <Printer className="w-5 h-5" />
              Imprimer la facture
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
