import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Check,
  CreditCard,
  Smartphone,
  Banknote,
  Clock,
  X,
} from "lucide-react";
import { useStore, storeActions } from "../lib/store";
import { formatFCFA } from "../lib/utils";
import type { SaleItem, Sale } from "../types";

interface CartItem extends SaleItem {}

const paymentModes = [
  { value: "Espèces", label: "Espèces", icon: Banknote },
  { value: "Mobile Money", label: "Mobile Money", icon: Smartphone },
  { value: "Carte", label: "Carte", icon: CreditCard },
  { value: "Crédit", label: "Crédit", icon: Clock },
] as const;

export default function POS() {
  const data = useStore();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [client, setClient] = useState("AUTRES");
  const [paymentMode, setPaymentMode] = useState<string>("Espèces");
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastFacture, setLastFacture] = useState("");

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return data.products
      .filter((p) => p.nom.toLowerCase().includes(q) || p.categorie.toLowerCase().includes(q))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [data.products, search]);

  const categories = useMemo(() => {
    const cats = new Set(data.products.map((p) => p.categorie));
    return ["Tous", ...Array.from(cats)];
  }, [data.products]);

  const [activeCat, setActiveCat] = useState("Tous");

  const displayProducts = useMemo(() => {
    if (activeCat === "Tous") return filteredProducts;
    return filteredProducts.filter((p) => p.categorie === activeCat);
  }, [filteredProducts, activeCat]);

  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantite, 0);

  function addToCart(productId: string) {
    const product = data.products.find((p) => p.id === productId);
    if (!product || product.stockActuel <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.produitId === productId);
      if (existing) {
        if (existing.quantite >= product.stockActuel) return prev;
        return prev.map((i) =>
          i.produitId === productId
            ? { ...i, quantite: i.quantite + 1, total: (i.quantite + 1) * i.prixUnitaire }
            : i
        );
      }
      return [
        ...prev,
        {
          produitId: product.id,
          produitNom: product.nom,
          quantite: 1,
          prixUnitaire: product.prixVente,
          total: product.prixVente,
        },
      ];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) => {
      return prev
        .map((i) => {
          if (i.produitId !== productId) return i;
          const newQty = i.quantite + delta;
          if (newQty <= 0) return null;
          const product = data.products.find((p) => p.id === productId);
          if (product && newQty > product.stockActuel) return i;
          return { ...i, quantite: newQty, total: newQty * i.prixUnitaire };
        })
        .filter(Boolean) as CartItem[];
    });
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.produitId !== productId));
  }

  function checkout() {
    if (cart.length === 0) return;
    const sale = storeActions.addSale({
      dateVente: new Date().toISOString().slice(0, 10),
      client,
      items: cart,
      total: cartTotal,
      modePaiement: paymentMode as Sale["modePaiement"],
    });
    setLastFacture(sale.numeroFacture);
    setShowSuccess(true);
    setCart([]);
    setClient("AUTRES");
    setTimeout(() => setShowSuccess(false), 4000);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Product grid */}
      <div className="flex-1 flex flex-col overflow-hidden p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-4">
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
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeCat === cat
                  ? "bg-primary-500 text-white"
                  : "bg-night-800 text-night-300 hover:bg-night-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {displayProducts.map((product) => {
              const outOfStock = product.stockActuel <= 0;
              const lowStock = product.stockActuel <= (product.seuilAlerte || 50);
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product.id)}
                  disabled={outOfStock}
                  className={`card p-4 text-left transition-all duration-200 group ${
                    outOfStock
                      ? "opacity-40 cursor-not-allowed"
                      : "card-hover hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${
                      outOfStock ? "bg-night-700 text-night-500" :
                      lowStock ? "bg-amber-500/15 text-amber-400" :
                      "bg-primary-500/15 text-primary-400"
                    }`}>
                      {product.nom.charAt(0)}
                    </div>
                    {lowStock && !outOfStock && (
                      <span className="badge bg-amber-500/15 text-amber-400 text-[10px]">
                        {product.stockActuel}
                      </span>
                    )}
                    {outOfStock && (
                      <span className="badge bg-red-500/15 text-red-400 text-[10px]">Rupture</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-white line-clamp-2 mb-1 min-h-[2.5rem]">{product.nom}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-primary-400">{formatFCFA(product.prixVente)}</span>
                    <span className="text-xs text-night-400">Stock: {product.stockActuel}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {displayProducts.length === 0 && (
            <div className="text-center py-20 text-night-400">
              <p>Aucun produit trouvé</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart panel */}
      <div className="w-full max-w-sm lg:w-96 bg-night-900 border-l border-night-800 flex flex-col h-full">
        <div className="p-4 border-b border-night-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary-400" />
              <h3 className="font-display font-semibold text-white">Panier</h3>
              {cartCount > 0 && <span className="badge bg-primary-500/15 text-primary-400">{cartCount}</span>}
            </div>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs text-night-400 hover:text-red-400 transition-colors">
                Vider
              </button>
            )}
          </div>
          <input
            type="text"
            placeholder="Nom du client"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            className="input"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center py-16 text-night-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Panier vide</p>
              <p className="text-xs mt-1">Cliquez sur un produit pour l'ajouter</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.produitId} className="card p-3 bg-night-800/50 animate-slide-right">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium text-white line-clamp-2">{item.produitNom}</p>
                    <button
                      onClick={() => removeFromCart(item.produitId)}
                      className="text-night-500 hover:text-red-400 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.produitId, -1)}
                        className="w-7 h-7 rounded-lg bg-night-700 text-white flex items-center justify-center hover:bg-night-600 transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-semibold text-white w-8 text-center">{item.quantite}</span>
                      <button
                        onClick={() => updateQty(item.produitId, 1)}
                        className="w-7 h-7 rounded-lg bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-primary-400">{formatFCFA(item.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment section */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-night-800 space-y-3">
            <div>
              <p className="text-xs text-night-400 mb-2">Mode de paiement</p>
              <div className="grid grid-cols-2 gap-2">
                {paymentModes.map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.value}
                      onClick={() => setPaymentMode(mode.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        paymentMode === mode.value
                          ? "bg-primary-500 text-white"
                          : "bg-night-800 text-night-300 hover:bg-night-700"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-night-300">Total</span>
              <span className="font-display font-bold text-2xl text-white">{formatFCFA(cartTotal)}</span>
            </div>
            <button onClick={checkout} className="btn-primary w-full text-base py-3">
              <Check className="w-5 h-5" />
              Valider la vente
            </button>
          </div>
        )}
      </div>

      {/* Success overlay */}
      {showSuccess && (
        <div className="fixed bottom-6 right-6 z-50 card p-4 border-emerald-500/30 bg-emerald-500/10 animate-slide-up shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Vente enregistrée !</p>
              <p className="text-xs text-emerald-400">Facture {lastFacture}</p>
            </div>
            <button onClick={() => setShowSuccess(false)} className="ml-2 text-night-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
