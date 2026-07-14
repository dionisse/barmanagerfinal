import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Eye,
  Trash2,
  Truck,
  Package,
  Calendar,
  X,
  ShoppingCart,
} from "lucide-react";
import { useStore, storeActions } from "../lib/store";
import { formatFCFA, formatDate, formatNumber } from "../lib/utils";
import { Modal } from "../components/Modal";
import type { PurchaseItem } from "../types";

export default function Achats() {
  const data = useStore();
  const [search, setSearch] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [fournisseur, setFournisseur] = useState("");
  const [dateAchat, setDateAchat] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...data.purchases]
      .sort((a, b) => b.dateAchat.localeCompare(a.dateAchat))
      .filter((p) =>
        p.numeroCommande.toLowerCase().includes(q) ||
        p.fournisseur.toLowerCase().includes(q) ||
        p.items.some((i) => i.produitNom.toLowerCase().includes(q))
      );
  }, [data.purchases, search]);

  const totalPurchases = filtered.reduce((sum, p) => sum + p.totalGeneral, 0);
  const viewing = data.purchases.find((p) => p.id === viewingId);

  const totalItems = items.reduce((sum, i) => sum + i.total, 0);

  function addPurchaseItem() {
    const product = data.products.find((p) => p.id === selectedProduct);
    if (!product) return;
    const existing = items.find((i) => i.produitId === product.id);
    if (existing) {
      setItems(items.map((i) =>
        i.produitId === product.id
          ? { ...i, quantite: i.quantite + 12, total: (i.quantite + 12) * i.prixAchat }
          : i
      ));
    } else {
      setItems([...items, {
        produitId: product.id,
        produitNom: product.nom,
        quantite: 12,
        prixAchat: product.prixAchat,
        total: product.prixAchat * 12,
      }]);
    }
    setSelectedProduct("");
  }

  function updateItemQty(productId: string, qty: number) {
    setItems(items.map((i) =>
      i.produitId === productId ? { ...i, quantite: qty, total: qty * i.prixAchat } : i
    ));
  }

  function updateItemPrice(productId: string, price: number) {
    setItems(items.map((i) =>
      i.produitId === productId ? { ...i, prixAchat: price, total: i.quantite * price } : i
    ));
  }

  function removeItem(productId: string) {
    setItems(items.filter((i) => i.produitId !== productId));
  }

  function savePurchase() {
    if (items.length === 0 || !fournisseur.trim()) return;
    storeActions.addPurchase({
      dateAchat,
      fournisseur,
      items,
      totalGeneral: totalItems,
    });
    setShowModal(false);
    resetForm();
  }

  function resetForm() {
    setFournisseur("");
    setDateAchat(new Date().toISOString().slice(0, 10));
    setItems([]);
    setSelectedProduct("");
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-4 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-xs text-night-400">Total commandes</p>
              <p className="font-display font-bold text-xl text-white">{formatNumber(filtered.length)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 animate-slide-up" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-night-400">Montant total</p>
              <p className="font-display font-bold text-xl text-white">{formatFCFA(totalPurchases)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 animate-slide-up col-span-2 lg:col-span-1" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-night-400">Commande moyenne</p>
              <p className="font-display font-bold text-xl text-white">
                {formatFCFA(filtered.length > 0 ? totalPurchases / filtered.length : 0)}
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
            placeholder="Rechercher une commande..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-11"
          />
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary whitespace-nowrap">
          <Plus className="w-5 h-5" />
          Nouvelle commande
        </button>
      </div>

      {/* Purchases list */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-night-800">
                <th className="text-left text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3">Commande</th>
                <th className="text-left text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Date</th>
                <th className="text-left text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3">Fournisseur</th>
                <th className="text-center text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Articles</th>
                <th className="text-right text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3">Montant</th>
                <th className="text-right text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((purchase) => (
                <tr key={purchase.id} className="border-b border-night-800/50 hover:bg-night-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-white">{purchase.numeroCommande}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-sm text-night-300">{formatDate(purchase.dateAchat)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-night-300">{purchase.fournisseur}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-center">
                    <span className="badge bg-night-700 text-night-300">{purchase.items.length}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-white">{formatFCFA(purchase.totalGeneral)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setViewingId(purchase.id)}
                        className="p-2 rounded-lg text-night-400 hover:bg-night-700 hover:text-primary-400 transition-all"
                      >
                        <Eye className="w-4 h-4" />
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
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucune commande trouvée</p>
          </div>
        )}
      </div>

      {/* Purchase detail modal */}
      <Modal
        open={!!viewing}
        onClose={() => setViewingId(null)}
        title="Détail de la commande"
        size="lg"
      >
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-start justify-between p-4 rounded-xl bg-night-800/50">
              <div>
                <p className="text-xs text-night-400 mb-1">Commande</p>
                <p className="font-display font-bold text-lg text-white">{viewing.numeroCommande}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-night-400 mb-1">Fournisseur</p>
                <p className="text-sm text-white">{viewing.fournisseur}</p>
                <p className="text-xs text-night-400 mt-1">{formatDate(viewing.dateAchat)}</p>
              </div>
            </div>
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-night-800">
                    <th className="text-left text-xs font-medium text-night-400 px-4 py-2">Produit</th>
                    <th className="text-center text-xs font-medium text-night-400 px-4 py-2">Qté</th>
                    <th className="text-right text-xs font-medium text-night-400 px-4 py-2">Prix achat</th>
                    <th className="text-right text-xs font-medium text-night-400 px-4 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewing.items.map((item, i) => (
                    <tr key={i} className="border-b border-night-800/50">
                      <td className="px-4 py-2.5 text-sm text-white">{item.produitNom}</td>
                      <td className="px-4 py-2.5 text-center text-sm text-night-300">{item.quantite}</td>
                      <td className="px-4 py-2.5 text-right text-sm text-night-300">{formatFCFA(item.prixAchat)}</td>
                      <td className="px-4 py-2.5 text-right text-sm font-semibold text-white">{formatFCFA(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-sm text-night-300">Total général</span>
              <span className="font-display font-bold text-2xl text-amber-400">{formatFCFA(viewing.totalGeneral)}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* New purchase modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Nouvelle commande d'achat"
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-night-300 mb-1.5">Fournisseur</label>
              <input
                type="text"
                value={fournisseur}
                onChange={(e) => setFournisseur(e.target.value)}
                className="input"
                placeholder="Ex: NANA SAFFO"
              />
            </div>
            <div>
              <label className="block text-sm text-night-300 mb-1.5">Date d'achat</label>
              <input
                type="date"
                value={dateAchat}
                onChange={(e) => setDateAchat(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Add product row */}
          <div className="flex gap-2">
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="input flex-1"
            >
              <option value="">Sélectionner un produit...</option>
              {data.products.map((p) => (
                <option key={p.id} value={p.id}>{p.nom}</option>
              ))}
            </select>
            <button onClick={addPurchaseItem} disabled={!selectedProduct} className="btn-primary whitespace-nowrap">
              <Plus className="w-5 h-5" />
              Ajouter
            </button>
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-night-800">
                      <th className="text-left text-xs font-medium text-night-400 px-3 py-2">Produit</th>
                      <th className="text-center text-xs font-medium text-night-400 px-3 py-2 w-24">Qté</th>
                      <th className="text-right text-xs font-medium text-night-400 px-3 py-2 w-32">Prix achat</th>
                      <th className="text-right text-xs font-medium text-night-400 px-3 py-2">Total</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.produitId} className="border-b border-night-800/50">
                        <td className="px-3 py-2 text-sm text-white">{item.produitNom}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.quantite}
                            onChange={(e) => updateItemQty(item.produitId, Number(e.target.value))}
                            className="w-20 px-2 py-1 rounded-lg bg-night-800 border border-night-700 text-sm text-white text-center outline-none focus:border-primary-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.prixAchat}
                            onChange={(e) => updateItemPrice(item.produitId, Number(e.target.value))}
                            className="w-28 px-2 py-1 rounded-lg bg-night-800 border border-night-700 text-sm text-white text-right outline-none focus:border-primary-500"
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-semibold text-white">{formatFCFA(item.total)}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => removeItem(item.produitId)} className="text-night-400 hover:text-red-400 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {items.length === 0 && (
            <div className="text-center py-12 text-night-400">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Ajoutez des produits à la commande</p>
            </div>
          )}

          {items.length > 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-sm text-night-300">Total de la commande</span>
              <span className="font-display font-bold text-2xl text-amber-400">{formatFCFA(totalItems)}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-ghost flex-1">
              <X className="w-4 h-4" />
              Annuler
            </button>
            <button onClick={savePurchase} disabled={items.length === 0 || !fournisseur.trim()} className="btn-primary flex-1">
              <ShoppingCart className="w-5 h-5" />
              Enregistrer l'achat
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
