import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatTileProps {
  label: string;
  value: string;
  subline?: string;
  trend?: number; // positive = up, negative = down
  children?: React.ReactNode; // for custom sub-content
}

export function StatTile({ label, value, subline, trend, children }: StatTileProps) {
  const hasTrend = typeof trend === "number";
  const isUp = hasTrend && trend > 0;
  const isDown = hasTrend && trend < 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-5 flex flex-col gap-2">
      <p className="text-sm font-medium text-zinc-500 leading-none">{label}</p>
      <p className="text-3xl font-bold tabular-nums text-zinc-900 leading-none tracking-tight">
        {value}
      </p>
      {hasTrend && (
        <div
          className={`flex items-center gap-1 text-xs font-medium ${
            isUp ? "text-emerald-600" : isDown ? "text-red-500" : "text-zinc-400"
          }`}
          aria-label={`Trend: ${trend > 0 ? "+" : ""}${trend.toFixed(0)}% vs yesterday`}
        >
          {isUp && <TrendingUp className="w-3.5 h-3.5" />}
          {isDown && <TrendingDown className="w-3.5 h-3.5" />}
          <span>
            {trend > 0 ? "+" : ""}
            {trend.toFixed(0)}% vs yesterday
          </span>
        </div>
      )}
      {subline && !hasTrend && (
        <p className="text-xs text-zinc-400">{subline}</p>
      )}
      {children}
    </div>
  );
}
