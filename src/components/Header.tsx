import { Menu, Bell, Search } from "lucide-react";
import { useStore } from "../lib/store";
import { getLowStockProducts } from "../lib/utils";
import { useState } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
}

export function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  const data = useStore();
  const lowStock = getLowStockProducts(data.products);
  const [showNotif, setShowNotif] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-night-950/80 backdrop-blur-lg border-b border-night-800">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-night-300 hover:bg-night-800 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-display font-bold text-lg lg:text-xl text-white">{title}</h2>
            {subtitle && <p className="text-xs text-night-400 hidden sm:block">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-night-800/60 border border-night-700 w-64">
            <Search className="w-4 h-4 text-night-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="bg-transparent text-sm text-white placeholder-night-400 outline-none w-full"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="relative p-2.5 rounded-xl bg-night-800/60 border border-night-700 text-night-300 hover:text-white hover:border-night-600 transition-all"
            >
              <Bell className="w-5 h-5" />
              {lowStock.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse-soft">
                  {lowStock.length}
                </span>
              )}
            </button>
            {showNotif && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
                <div className="absolute right-0 top-12 z-50 w-80 card p-4 shadow-2xl animate-slide-up">
                  <h3 className="font-display font-semibold text-white mb-3">Notifications</h3>
                  {lowStock.length === 0 ? (
                    <p className="text-sm text-night-400">Aucune alerte de stock</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {lowStock.slice(0, 8).map((p) => (
                        <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-night-800/50">
                          <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm text-white truncate">{p.nom}</p>
                            <p className="text-xs text-primary-400">
                              Stock: {p.stockActuel} — seuil: {p.seuilAlerte || 50}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
