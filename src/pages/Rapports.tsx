import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Package, Percent, Wallet } from "lucide-react";
import { useStore } from "../lib/store";
import { StatCard } from "../components/StatCard";
import {
  formatFCFA,
  formatNumber,
  getRevenueByDay,
  getTopProducts,
  getRevenueByCategory,
  getPaymentModeBreakdown,
  getProfitForPeriod,
  getRevenueForPeriod,
  getStockValue,
  getExpensesForPeriod,
} from "../lib/utils";

const PIE_COLORS = ["#f05a16", "#ffb31a", "#f89966", "#f47133", "#fde0cc", "#cc8500"];

type Period = 7 | 30 | 90;

export default function Rapports() {
  const data = useStore();
  const [period, setPeriod] = useState<Period>(30);

  const stats = useMemo(() => {
    const revenue = getRevenueForPeriod(data.sales, period);
    const profit = getProfitForPeriod(data.sales, data.products, period);
    const expenses = getExpensesForPeriod(data.expenses, period);
    const stockValue = getStockValue(data.products);
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const netProfit = profit - expenses;
    return { revenue, profit, expenses, stockValue, margin, netProfit };
  }, [data, period]);

  const revenueData = useMemo(() => getRevenueByDay(data.sales, period), [data.sales, period]);
  const topProducts = useMemo(() => getTopProducts(data.sales, 10), [data.sales]);
  const categoryData = useMemo(() => getRevenueByCategory(data.sales, data.products), [data.sales, data.products]);
  const paymentData = useMemo(() => getPaymentModeBreakdown(data.sales), [data.sales]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Period selector */}
      <div className="flex gap-2">
        {([7, 30, 90] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              period === p ? "bg-primary-500 text-white" : "bg-night-800 text-night-300 hover:bg-night-700"
            }`}
          >
            {p} jours
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Chiffre d'affaires"
          value={formatFCFA(stats.revenue)}
          icon={<TrendingUp className="w-6 h-6" />}
          accent="primary"
        />
        <StatCard
          label="Bénéfice brut"
          value={formatFCFA(stats.profit)}
          icon={<DollarSign className="w-6 h-6" />}
          accent="success"
        />
        <StatCard
          label="Marge bénéficiaire"
          value={`${stats.margin.toFixed(1)}%`}
          icon={<Percent className="w-6 h-6" />}
          accent="accent"
        />
        <StatCard
          label="Profit net"
          value={formatFCFA(stats.netProfit)}
          icon={<Wallet className="w-6 h-6" />}
          accent={stats.netProfit >= 0 ? "success" : "error"}
        />
      </div>

      {/* Revenue chart */}
      <div className="card card-hover p-5 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-semibold text-white">Évolution du chiffre d'affaires</h3>
            <p className="text-xs text-night-400">{period} derniers jours</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={revenueData}>
            <defs>
              <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f05a16" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#f05a16" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27304a" vertical={false} />
            <XAxis dataKey="label" stroke="#6b7a8e" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#6b7a8e" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ backgroundColor: "#121729", border: "1px solid #27304a", borderRadius: "12px", fontSize: "13px" }}
              labelStyle={{ color: "#9da9b8" }}
              formatter={(v: number) => [formatFCFA(v), "Revenu"]}
            />
            <Area type="monotone" dataKey="revenue" stroke="#f05a16" strokeWidth={2.5} fill="url(#revGrad2)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Two column charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top products bar chart */}
        <div className="card card-hover p-5 animate-slide-up" style={{ animationDelay: "80ms" }}>
          <h3 className="font-display font-semibold text-white mb-1">Top 10 produits vendus</h3>
          <p className="text-xs text-night-400 mb-4">Par chiffre d'affaires</p>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27304a" horizontal={false} />
              <XAxis type="number" stroke="#6b7a8e" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="nom" stroke="#6b7a8e" fontSize={10} tickLine={false} axisLine={false} width={120} />
              <Tooltip
                contentStyle={{ backgroundColor: "#121729", border: "1px solid #27304a", borderRadius: "12px", fontSize: "13px" }}
                formatter={(v: number) => [formatFCFA(v), "Revenu"]}
              />
              <Bar dataKey="revenue" fill="#f05a16" radius={[0, 6, 6, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment modes pie */}
        <div className="card card-hover p-5 animate-slide-up" style={{ animationDelay: "160ms" }}>
          <h3 className="font-display font-semibold text-white mb-1">Répartition par paiement</h3>
          <p className="text-xs text-night-400 mb-4">Modes de transaction</p>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={paymentData} dataKey="revenue" nameKey="mode" cx="50%" cy="50%" outerRadius={110} label={(entry) => `${entry.mode}`}>
                {paymentData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#121729", border: "1px solid #27304a", borderRadius: "12px", fontSize: "13px" }}
                formatter={(v: number) => formatFCFA(v)}
              />
              <Legend formatter={(v) => <span className="text-night-300 text-sm">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category breakdown + financial summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card card-hover p-5 animate-slide-up" style={{ animationDelay: "240ms" }}>
          <h3 className="font-display font-semibold text-white mb-4">Revenu par catégorie</h3>
          <div className="space-y-3">
            {categoryData.map((cat, i) => {
              const maxRev = categoryData[0]?.revenue || 1;
              const pct = (cat.revenue / maxRev) * 100;
              return (
                <div key={cat.categorie}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-white">{cat.categorie}</span>
                    <span className="text-sm font-semibold text-primary-400">{formatFCFA(cat.revenue)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-night-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card card-hover p-5 animate-slide-up" style={{ animationDelay: "320ms" }}>
          <h3 className="font-display font-semibold text-white mb-4">Synthèse financière</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-night-800/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-sm text-night-300">Chiffre d'affaires</span>
              </div>
              <span className="font-semibold text-white">{formatFCFA(stats.revenue)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-night-800/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary-500/15 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-primary-400" />
                </div>
                <span className="text-sm text-night-300">Coût des marchandises</span>
              </div>
              <span className="font-semibold text-white">{formatFCFA(stats.revenue - stats.profit)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-night-800/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-sm text-night-300">Dépenses d'exploitation</span>
              </div>
              <span className="font-semibold text-white">{formatFCFA(stats.expenses)}</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-700/5 border border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-white">Profit net</span>
              </div>
              <span className="font-display font-bold text-xl text-emerald-400">{formatFCFA(stats.netProfit)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-night-800/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent-400/15 flex items-center justify-center">
                  <Package className="w-4 h-4 text-accent-400" />
                </div>
                <span className="text-sm text-night-300">Valeur du stock</span>
              </div>
              <span className="font-semibold text-white">{formatFCFA(stats.stockValue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top products table */}
      <div className="card overflow-hidden animate-slide-up" style={{ animationDelay: "400ms" }}>
        <div className="p-5 border-b border-night-800">
          <h3 className="font-display font-semibold text-white">Classement des produits</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-night-800">
                <th className="text-left text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3">#</th>
                <th className="text-left text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3">Produit</th>
                <th className="text-right text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3">Quantité vendue</th>
                <th className="text-right text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3">Revenu</th>
                <th className="text-right text-xs font-medium text-night-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Part du CA</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => {
                const share = (p.revenue / stats.revenue) * 100;
                return (
                  <tr key={p.nom} className="border-b border-night-800/50 hover:bg-night-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex w-7 h-7 rounded-lg items-center justify-center text-xs font-bold ${
                        i === 0 ? "bg-accent-400/20 text-accent-400" : "bg-night-700 text-night-400"
                      }`}>{i + 1}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-white">{p.nom}</td>
                    <td className="px-4 py-3 text-right text-sm text-night-300">{formatNumber(p.quantite)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-primary-400">{formatFCFA(p.revenue)}</td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-night-800 overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(share, 100)}%` }} />
                        </div>
                        <span className="text-xs text-night-400 w-10 text-right">{share.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
