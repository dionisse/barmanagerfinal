import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  change?: { value: string; positive: boolean };
  icon: ReactNode;
  accent?: "primary" | "accent" | "success" | "warning" | "error";
  delay?: number;
}

const accentColors = {
  primary: "from-primary-500/20 to-primary-700/5 text-primary-400",
  accent: "from-accent-400/20 to-accent-600/5 text-accent-400",
  success: "from-emerald-500/20 to-emerald-700/5 text-emerald-400",
  warning: "from-amber-500/20 to-amber-700/5 text-amber-400",
  error: "from-red-500/20 to-red-700/5 text-red-400",
};

export function StatCard({ label, value, change, icon, accent = "primary", delay = 0 }: StatCardProps) {
  return (
    <div
      className="stat-tile animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accentColors[accent]} flex items-center justify-center`}>
          {icon}
        </div>
        {change && (
          <span
            className={`badge ${
              change.positive
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-red-500/15 text-red-400"
            }`}
          >
            {change.positive ? "▲" : "▼"} {change.value}
          </span>
        )}
      </div>
      <p className="text-night-400 text-sm font-medium mb-1">{label}</p>
      <p className="font-display font-bold text-2xl text-white tracking-tight">{value}</p>
    </div>
  );
}
