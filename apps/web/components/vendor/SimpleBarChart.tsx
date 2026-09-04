"use client";

import { useState } from "react";

interface BarDatum {
  bucket: string;
  prints: number;
  color_prints: number;
  bw_prints: number;
  revenue_paise: number;
}

type ChartMode = "prints" | "revenue";

interface SimpleBarChartProps {
  data: BarDatum[];
  mode?: ChartMode;
  height?: number;
}

/** Formats a bucket string (YYYY-MM-DD | YYYY-Www | YYYY-MM) to a short label. */
function formatBucket(bucket: string): string {
  // Week: 2026-W37
  if (/^\d{4}-W\d{1,2}$/.test(bucket)) {
    return `W${bucket.split("-W")[1]}`;
  }
  // Day: 2026-09-12
  if (/^\d{4}-\d{2}-\d{2}$/.test(bucket)) {
    const d = new Date(bucket + "T00:00:00");
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  }
  // Month: 2026-09
  if (/^\d{4}-\d{2}$/.test(bucket)) {
    const d = new Date(bucket + "-01T00:00:00");
    return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  }
  return bucket;
}

function formatRevenue(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

interface TooltipState {
  x: number;
  y: number;
  datum: BarDatum;
  mode: ChartMode;
}

export function SimpleBarChart({ data, mode = "prints", height = 240 }: SimpleBarChartProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-sm text-zinc-400 bg-zinc-50 rounded-xl"
      >
        No data yet
      </div>
    );
  }

  const PADDING = { top: 16, bottom: 32, left: 40, right: 8 };
  const chartW = 800; // SVG internal width (viewBox), scales to container
  const chartH = height;
  const plotW = chartW - PADDING.left - PADDING.right;
  const plotH = chartH - PADDING.top - PADDING.bottom;

  const maxVal =
    mode === "prints"
      ? Math.max(...data.map((d) => d.prints), 1)
      : Math.max(...data.map((d) => d.revenue_paise), 1);

  const barW = Math.max(4, (plotW / data.length) * 0.65);
  const gap = plotW / data.length;

  // Y-axis ticks - deduplicate ticks when maxVal is small (e.g. maxVal = 1)
  const yTicks = 4;
  const rawTickVals = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round((maxVal / yTicks) * i)
  );
  const yTickVals = Array.from(new Set(rawTickVals));

  return (
    <div className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full overflow-visible"
        style={{ height }}
        aria-label={`Bar chart showing ${mode === "prints" ? "print" : "revenue"} data`}
        role="img"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Y-axis gridlines + labels */}
        {yTickVals.map((val, idx) => {
          const y = PADDING.top + plotH - (val / maxVal) * plotH;
          return (
            <g key={`ytick-${idx}-${val}`}>
              <line
                x1={PADDING.left}
                x2={chartW - PADDING.right}
                y1={y}
                y2={y}
                stroke="#f4f4f5"
                strokeWidth="1"
              />
              <text
                x={PADDING.left - 6}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#a1a1aa"
              >
                {mode === "prints"
                  ? val.toString()
                  : val >= 100
                    ? `₹${(val / 100).toFixed(0)}`
                    : ""}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const x = PADDING.left + i * gap + gap / 2 - barW / 2;
          const label = formatBucket(d.bucket);

          if (mode === "prints") {
            const totalH = (d.prints / maxVal) * plotH;
            const colorH = d.prints > 0 ? (d.color_prints / d.prints) * totalH : 0;
            const bwH = totalH - colorH;
            const barTop = PADDING.top + plotH - totalH;

            return (
              <g
                key={`prints-bar-${d.bucket}-${i}`}
                role="group"
                aria-label={`${label}: ${d.prints} prints`}
                onMouseEnter={(e) => {
                  const rect = (e.currentTarget.closest("svg") as SVGElement).getBoundingClientRect();
                  setTooltip({
                    x: ((x + barW / 2) / chartW) * 100,
                    y: (barTop / chartH) * 100,
                    datum: d,
                    mode,
                  });
                }}
              >
                {/* B&W portion */}
                {bwH > 0 && (
                  <rect
                    x={x}
                    y={barTop + colorH}
                    width={barW}
                    height={bwH}
                    rx="2"
                    fill="#a1a1aa"
                  />
                )}
                {/* Color portion */}
                {colorH > 0 && (
                  <rect
                    x={x}
                    y={barTop}
                    width={barW}
                    height={colorH}
                    rx="2"
                    fill="#4f46e5"
                  />
                )}
                {/* Empty state bar */}
                {totalH === 0 && (
                  <rect
                    x={x}
                    y={PADDING.top + plotH - 2}
                    width={barW}
                    height="2"
                    rx="1"
                    fill="#e4e4e7"
                  />
                )}
                {/* X label */}
                <text
                  x={x + barW / 2}
                  y={chartH - PADDING.bottom + 14}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#a1a1aa"
                >
                  {label}
                </text>
              </g>
            );
          } else {
            // Revenue mode — single emerald bar
            const barH = (d.revenue_paise / maxVal) * plotH;
            const barTop = PADDING.top + plotH - barH;

            return (
              <g
                key={`rev-bar-${d.bucket}-${i}`}
                role="group"
                aria-label={`${label}: ${formatRevenue(d.revenue_paise)}`}
                onMouseEnter={() => {
                  setTooltip({
                    x: ((x + barW / 2) / chartW) * 100,
                    y: (barTop / chartH) * 100,
                    datum: d,
                    mode,
                  });
                }}
              >
                <rect
                  x={x}
                  y={barH > 0 ? barTop : PADDING.top + plotH - 2}
                  width={barW}
                  height={barH > 0 ? barH : 2}
                  rx="2"
                  fill={barH > 0 ? "#10b981" : "#e4e4e7"}
                />
                <text
                  x={x + barW / 2}
                  y={chartH - PADDING.bottom + 14}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#a1a1aa"
                >
                  {label}
                </text>
              </g>
            );
          }
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none bg-zinc-900 text-white rounded-xl px-3 py-2 text-xs shadow-lg min-w-[120px]"
          style={{
            left: `${Math.min(tooltip.x, 80)}%`,
            top: `${Math.max(tooltip.y - 10, 0)}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="font-semibold mb-1">{formatBucket(tooltip.datum.bucket)}</p>
          {tooltip.mode === "prints" ? (
            <>
              <p className="text-zinc-300">
                <span className="inline-block w-2 h-2 rounded-sm bg-indigo-400 mr-1" />
                Colour: {tooltip.datum.color_prints}
              </p>
              <p className="text-zinc-300">
                <span className="inline-block w-2 h-2 rounded-sm bg-zinc-400 mr-1" />
                B&amp;W: {tooltip.datum.bw_prints}
              </p>
              <p className="font-medium mt-1">Total: {tooltip.datum.prints}</p>
            </>
          ) : (
            <p className="font-medium">{formatRevenue(tooltip.datum.revenue_paise)}</p>
          )}
        </div>
      )}

      {/* Legend (prints mode only) */}
      {mode === "prints" && (
        <div className="flex items-center gap-4 mt-2 justify-center">
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" aria-hidden="true" />
            Colour
          </span>
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="w-3 h-3 rounded-sm bg-zinc-400 inline-block" aria-hidden="true" />
            B&amp;W
          </span>
        </div>
      )}
    </div>
  );
}
