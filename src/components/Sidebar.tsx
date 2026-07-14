import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Truck,
  BarChart3,
  Settings,
  Wine,
  X,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/pos", label: "Point de vente", icon: ShoppingCart },
  { to: "/stock", label: "Stock & Produits", icon: Package },
  { to: "/ventes", label: "Ventes", icon: Receipt },
  { to: "/achats", label: "Approvisionnement", icon: Truck },
  { to: "/rapports", label: "Rapports", icon: BarChart3 },
  { to: "/parametres", label: "Paramètres", icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-night-900 border-r border-night-800 z-50 transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-night-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Wine className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-white leading-tight">BaRigo</h1>
              <p className="text-[10px] text-night-400 font-medium tracking-wider uppercase">Bar Manager</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-night-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? "bg-primary-500/15 text-primary-300 border border-primary-500/20"
                      : "text-night-300 hover:bg-night-800 hover:text-white border border-transparent"
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-night-800">
          <div className="card p-3 bg-night-800/50">
            <p className="text-xs text-night-400 mb-1">Connecté en tant que</p>
            <p className="text-sm font-medium text-white">Gestionnaire</p>
            <p className="text-xs text-night-400">CAPITOL BAR</p>
          </div>
        </div>
      </aside>
    </>
  );
}
