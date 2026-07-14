import { useState, useMemo } from "react";
import { Search, Plus, Pencil, Trash2, Package, TriangleAlert as AlertTriangle, TrendingUp, Boxes, X } from "lucide-react";
import { useStore, storeActions } from "../lib/store";
import { formatFCFA, formatNumber, getStockValue, getLowStockProducts } from "../lib/utils";
import { Modal } from "../components/Modal";
import type { Product } from "../types";

export default function Stock() {
  const data = useStore();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, "id">>({
    nom: "",
    categorie: "Boissons",
    prixAchat: 0,
    prixVente: 0,
    stockActuel: 0,
    seuilAlerte: 50,
  });

  const stockValue = useMemo(() => getStockValue(data.products), [data.products]);
  const lowStock = useMemo(() => getLowStockProducts(data.products), [data.products]);
  const outOfStock = data.products.filter((p) => p.stockActuel <= 0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return data.products
      .filter((p) => p.nom.toLowerCase().includes(q) || p.categorie.toLowerCase().includes(q))
      .filter((p) => {
        if (filter === "low") return p.stockActuel <= (p.seuilAlerte || 50) && p.stockActuel > 0;
        if (filter === "out") return p.stockActuel <= 0;
        return true;
      })
      .sort((a, b) => b.stockActuel - a.stockActuel);
  }, [data.products, search, filter]);

  function openAdd() {
    setEditing(null);
    setForm({ nom: "", categorie: "Boissons", prixAchat: 0, prixVente: 0, stockActuel: 0, seuilAlerte: 50 });
    setShowModal(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      nom: product.nom,
      categorie: product.categorie,
      prixAchat: product.prixAchat,
      prixVente: product.prixVente,
      stockActuel: product.stockActuel,
      seuilAlerte: product.seuilAlerte || 50,
    });
    setShowModal(true);
  }

  function save() {
    if (!form.nom.trim()) return;
    if (editing) {
      storeActions.updateProduct(editing.id, form);
    } else {
      storeActions.addProduct(form);
    }
    setShowModal(false);
  }

  function remove(id: string) {
    if (confirm("Supprimer ce produit ?")) storeActions.deleteProduct(id);
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-xs text-night-400">Total produits</p>
              <p className="font-display font-bold text-xl text-white">{data.products.length}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 animate-slide-up" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-night-400">Valeur du stock</p>
              <p className="font-display font-bold text-xl text-white">{formatFCFA(stockValue)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 animate-slide-up" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-night-400">Stock faible</p>
              <p className="font-display font-bold text-xl text-white">{lowStock.length}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 animate-slide-up" style={{ animationDelay: "180ms" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
              <Package className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-night-400">Ruptures</p>
              <p className="font-display font-bold text-xl text-white">{outOfStock.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-night-400" />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-11"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "low", "out"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                filter === f ? "bg-primary-500 text-white" : "bg-night-800 text-night-300 hover:bg-night-700"
              }`}
            >
              {f === "all" ? "Tous" : f === "low" ? "Stock faible" : "Ruptures"}
            </button>
          ))}
        </div>
        <button onClick={openAdd} className="btn-primary whitespace-nowrap">
          <Plus className="w-5 h-5" />
          Ajouter
        </button>
      </div>

      {/* Products table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-night-800">
                <th className="text-left text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3">Produit</th>
                <th className="text-left text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Catégorie</th>
                <th className="text-right text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3">Prix achat</th>
                <th className="text-right text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3">Prix vente</th>
                <th className="text-right text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3">Stock</th>
                <th className="text-right text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Marge</th>
                <th className="text-right text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const margin = product.prixVente - product.prixAchat;
                const marginPct = product.prixAchat > 0 ? (margin / product.prixAchat) * 100 : 0;
                const isLow = product.stockActuel <= (product.seuilAlerte || 50) && product.stockActuel > 0;
                const isOut = product.stockActuel <= 0;
                return (
                  <tr key={product.id} className="border-b border-night-800/50 hover:bg-night-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                          isOut ? "bg-red-500/15 text-red-400" : isLow ? "bg-amber-500/15 text-amber-400" : "bg-primary-500/15 text-primary-400"
                        }`}>
                          {product.nom.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-white">{product.nom}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="badge bg-night-700 text-night-300">{product.categorie}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-night-300">{formatFCFA(product.prixAchat)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-white">{formatFCFA(product.prixVente)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-semibold ${
                        isOut ? "text-red-400" : isLow ? "text-amber-400" : "text-white"
                      }`}>
                        {formatNumber(product.stockActuel)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      <span className="text-sm text-emerald-400">+{marginPct.toFixed(0)}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(product)}
                          className="p-2 rounded-lg text-night-400 hover:bg-night-700 hover:text-primary-400 transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => remove(product.id)}
                          className="p-2 rounded-lg text-night-400 hover:bg-red-500/15 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-night-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun produit trouvé</p>
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Modifier le produit" : "Nouveau produit"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-night-300 mb-1.5">Nom du produit</label>
            <input
              type="text"
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="input"
              placeholder="Ex: BENINOISE 60CL"
            />
          </div>
          <div>
            <label className="block text-sm text-night-300 mb-1.5">Catégorie</label>
            <input
              type="text"
              value={form.categorie}
              onChange={(e) => setForm({ ...form, categorie: e.target.value })}
              className="input"
              placeholder="Ex: Boissons"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-night-300 mb-1.5">Prix d'achat (FCFA)</label>
              <input
                type="number"
                value={form.prixAchat}
                onChange={(e) => setForm({ ...form, prixAchat: Number(e.target.value) })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm text-night-300 mb-1.5">Prix de vente (FCFA)</label>
              <input
                type="number"
                value={form.prixVente}
                onChange={(e) => setForm({ ...form, prixVente: Number(e.target.value) })}
                className="input"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-night-300 mb-1.5">Stock actuel</label>
              <input
                type="number"
                value={form.stockActuel}
                onChange={(e) => setForm({ ...form, stockActuel: Number(e.target.value) })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm text-night-300 mb-1.5">Seuil d'alerte</label>
              <input
                type="number"
                value={form.seuilAlerte}
                onChange={(e) => setForm({ ...form, seuilAlerte: Number(e.target.value) })}
                className="input"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-ghost flex-1">
              <X className="w-4 h-4" />
              Annuler
            </button>
            <button onClick={save} className="btn-primary flex-1">
              {editing ? "Enregistrer" : "Ajouter"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
