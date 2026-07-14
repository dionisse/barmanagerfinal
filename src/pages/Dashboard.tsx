import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, ShoppingBag, Package, TriangleAlert as AlertTriangle, ArrowRight, Wallet, Trophy, Calendar } from "lucide-react";
import { useStore } from "../lib/store";
import { StatCard } from "../components/StatCard";
import {
  formatFCFA,
  formatNumber,
  formatDate,
  getRevenueByDay,
  getTopProducts,
  getPaymentModeBreakdown,
  getStockValue,
  getLowStockProducts,
  getProfitForPeriod,
  getRevenueForPeriod,
  getTodayRevenue,
  getTodaySalesCount,
  getExpensesForPeriod,
} from "../lib/utils";

const PIE_COLORS = ["#f05a16", "#ffb31a", "#f89966", "#f47133", "#fde0cc"];

export default function Dashboard() {
  const data = useStore();

  const stats = useMemo(() => {
    const todayRevenue = getTodayRevenue(data.sales);
    const todayCount = getTodaySalesCount(data.sales);
    const revenue30 = getRevenueForPeriod(data.sales, 30);
    const revenue7 = getRevenueForPeriod(data.sales, 7);
    const profit30 = getProfitForPeriod(data.sales, data.products, 30);
    const stockValue = getStockValue(data.products);
    const lowStock = getLowStockProducts(data.products);
    const expenses30 = getExpensesForPeriod(data.expenses, 30);
    const revenuePrev7 = getRevenueForPeriod(
      data.sales.filter((s) => s.dateVente < new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)),
      7
    );
    const weekChange = revenuePrev7 > 0 ? ((revenue7 - revenuePrev7) / revenuePrev7) * 100 : 0;
    return { todayRevenue, todayCount, revenue30, revenue7, profit30, stockValue, lowStock, expenses30, weekChange };
  }, [data]);

  const revenueData = useMemo(() => getRevenueByDay(data.sales, 14), [data.sales]);
  const topProducts = useMemo(() => getTopProducts(data.sales, 5), [data.sales]);
  const paymentData = useMemo(() => getPaymentModeBreakdown(data.sales), [data.sales]);

  const recentSales = useMemo(
    () => [...data.sales].sort((a, b) => b.dateVente.localeCompare(a.dateVente)).slice(0, 6),
    [data.sales]
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 via-primary-700 to-night-800 p-6 lg:p-8 animate-fade-in">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, #ffb31a 0, transparent 50%), radial-gradient(circle at 80% 0%, #f05a16 0, transparent 40%)"
        }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-primary-200 text-sm font-medium mb-1">Bienvenue au</p>
            <h1 className="font-display font-bold text-3xl lg:text-4xl text-white mb-2">{data.settings.entreprise.nom}</h1>
            <p className="text-primary-100/80 text-sm">{data.settings.entreprise.adresse}</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-primary-200 mb-1">
                <Wallet className="w-4 h-4" />
                <span className="text-xs font-medium">Recette du jour</span>
              </div>
              <p className="font-display font-bold text-2xl text-white">{formatFCFA(stats.todayRevenue)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-primary-200 mb-1">
                <ShoppingBag className="w-4 h-4" />
                <span className="text-xs font-medium">Ventes du jour</span>
              </div>
              <p className="font-display font-bold text-2xl text-white">{stats.todayCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Revenu (30 jours)"
          value={formatFCFA(stats.revenue30)}
          change={{ value: `${Math.abs(stats.weekChange).toFixed(0)}%`, positive: stats.weekChange >= 0 }}
          icon={<TrendingUp className="w-6 h-6" />}
          accent="primary"
          delay={0}
        />
        <StatCard
          label="Bénéfice (30 jours)"
          value={formatFCFA(stats.profit30)}
          icon={<Wallet className="w-6 h-6" />}
          accent="success"
          delay={80}
        />
        <StatCard
          label="Valeur du stock"
          value={formatFCFA(stats.stockValue)}
          icon={<Package className="w-6 h-6" />}
          accent="accent"
          delay={160}
        />
        <StatCard
          label="Dépenses (30 jours)"
          value={formatFCFA(stats.expenses30)}
          icon={<AlertTriangle className="w-6 h-6" />}
          accent="warning"
          delay={240}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="card card-hover p-5 lg:col-span-2 animate-slide-up" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-white">Évolution des ventes</h3>
              <p className="text-xs text-night-400">14 derniers jours</p>
            </div>
            <Link to="/rapports" className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">
              Détails <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f05a16" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f05a16" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27304a" vertical={false} />
              <XAxis dataKey="label" stroke="#6b7a8e" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#6b7a8e" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#121729",
                  border: "1px solid #27304a",
                  borderRadius: "12px",
                  fontSize: "13px",
                }}
                labelStyle={{ color: "#9da9b8" }}
                formatter={(v: number) => [formatFCFA(v), "Revenu"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#f05a16" strokeWidth={2.5} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Payment modes pie */}
        <div className="card card-hover p-5 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <h3 className="font-display font-semibold text-white mb-1">Modes de paiement</h3>
          <p className="text-xs text-night-400 mb-4">Répartition des ventes</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={paymentData} dataKey="revenue" nameKey="mode" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {paymentData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#121729",
                  border: "1px solid #27304a",
                  borderRadius: "12px",
                  fontSize: "13px",
                }}
                formatter={(v: number) => formatFCFA(v)}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {paymentData.map((p, i) => (
              <div key={p.mode} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-night-300">{p.mode}</span>
                </div>
                <span className="text-white font-medium">{formatNumber(p.count)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top products */}
        <div className="card card-hover p-5 animate-slide-up" style={{ animationDelay: "280ms" }}>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-accent-400" />
            <h3 className="font-display font-semibold text-white">Top produits</h3>
          </div>
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={p.nom} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                  i === 0 ? "bg-accent-400/20 text-accent-400" :
                  i === 1 ? "bg-night-300/20 text-night-300" :
                  i === 2 ? "bg-primary-500/20 text-primary-400" :
                  "bg-night-700 text-night-400"
                }`}>
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{p.nom}</p>
                  <p className="text-xs text-night-400">{formatNumber(p.quantite)} unités</p>
                </div>
                <span className="text-sm font-medium text-primary-400 shrink-0">{formatFCFA(p.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent sales */}
        <div className="card card-hover p-5 lg:col-span-2 animate-slide-up" style={{ animationDelay: "360ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-white">Ventes récentes</h3>
            <Link to="/ventes" className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">
              Tout voir <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center gap-3 p-3 rounded-xl bg-night-800/40 hover:bg-night-800/70 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-4 h-4 text-primary-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{sale.numeroFacture}</p>
                  <p className="text-xs text-night-400 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {formatDate(sale.dateVente)}
                    <span className="text-night-600">•</span>
                    {sale.items.length} article{sale.items.length > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-white">{formatFCFA(sale.total)}</p>
                  <span className="text-xs text-night-400">{sale.modePaiement}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low stock alert */}
      {stats.lowStock.length > 0 && (
        <div className="card p-5 border-amber-500/20 bg-amber-500/5 animate-slide-up" style={{ animationDelay: "440ms" }}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-display font-semibold text-white">Alertes de stock faible</h3>
            <span className="badge bg-amber-500/15 text-amber-400 ml-auto">{stats.lowStock.length} produit(s)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.lowStock.slice(0, 8).map((p) => (
              <Link
                key={p.id}
                to="/stock"
                className="flex items-center justify-between p-3 rounded-xl bg-night-800/50 hover:bg-night-800 transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white truncate group-hover:text-primary-300 transition-colors">{p.nom}</p>
                  <p className={`text-xs ${p.stockActuel <= 0 ? "text-red-400" : "text-amber-400"}`}>
                    Stock: {p.stockActuel}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-night-500 group-hover:text-primary-400 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
