"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, Printer, MapPin, Wifi, WifiOff, ExternalLink } from "lucide-react";

// Lightweight Leaflet type surface — we only touch what we use, and the
// library loads at runtime from CDN so its full types are not compiled in.
type LatLng = [number, number];
interface LeafletMarker {
  addTo: (map: LeafletMap) => LeafletMarker;
  bindPopup: (html: string) => LeafletMarker;
}
interface LeafletTileLayer {
  addTo: (map: LeafletMap) => LeafletTileLayer;
}
interface LeafletMap {
  setView: (center: LatLng, zoom: number) => LeafletMap;
  remove: () => void;
  fitBounds: (bounds: LatLng[], opts?: { padding?: [number, number]; maxZoom?: number }) => void;
}
interface LeafletIcon {
  iconUrl: string;
  iconSize?: [number, number];
  iconAnchor?: [number, number];
  popupAnchor?: [number, number];
  className?: string;
  html?: string;
}
interface LeafletNs {
  map: (el: HTMLElement, opts?: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, opts?: Record<string, unknown>) => LeafletTileLayer;
  marker: (latlng: LatLng, opts?: { icon?: unknown }) => LeafletMarker;
  divIcon: (opts: LeafletIcon) => unknown;
}

declare global {
  interface Window {
    L?: LeafletNs;
  }
}

interface PrinterRow {
  id: string;
  name: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  virtual_mode: boolean;
  claimed: boolean;
  created_at: string;
  agent_online: boolean;
  agent_platform: string | null;
  agent_last_heartbeat: string | null;
  lifetime_prints: number;
  lifetime_color_prints: number;
  lifetime_bw_prints: number;
  lifetime_revenue_paise: number;
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function formatPaise(p: number): string {
  return `₹${(p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function loadLeaflet(): Promise<LeafletNs> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Not in browser"));
      return;
    }
    if (window.L) {
      resolve(window.L);
      return;
    }
    // Inject CSS once
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    // Inject script once
    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.L) resolve(window.L);
        else reject(new Error("Leaflet failed to load"));
      });
      existing.addEventListener("error", () => reject(new Error("Leaflet script errored")));
      return;
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => {
      if (window.L) resolve(window.L);
      else reject(new Error("Leaflet failed to load"));
    };
    script.onerror = () => reject(new Error("Leaflet script errored"));
    document.head.appendChild(script);
  });
}

function pinIcon(L: LeafletNs, online: boolean, virtualMode: boolean) {
  const color = virtualMode ? "#6366f1" : online ? "#10b981" : "#a1a1aa";
  const html = `
    <div style="
      width: 30px; height: 30px; border-radius: 50% 50% 50% 0;
      background: ${color}; transform: rotate(-45deg);
      border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
           stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
           style="transform: rotate(45deg);">
        <polyline points="6 9 6 2 18 2 18 9"/>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
        <rect width="12" height="8" x="6" y="14"/>
      </svg>
    </div>`;
  return L.divIcon({
    iconUrl: "",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
    className: "printbuddy-printer-pin",
    html,
  });
}

export function AdminPrinters() {
  const [rows, setRows] = useState<PrinterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/printers");
      if (res.ok) {
        const data = await res.json();
        setRows(data.printers ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Set up the map + markers whenever the rows change.
  useEffect(() => {
    if (!mapRef.current || rows.length === 0) return;

    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapRef.current) return;

        // Recreate the map on each re-run so we don't have to track marker
        // diffs — the shop list is small.
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const map = L.map(mapRef.current, { scrollWheelZoom: true });
        mapInstanceRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(map);

        const withCoords = rows.filter((r) => r.latitude != null && r.longitude != null);

        if (withCoords.length === 0) {
          // Fall back to India-wide view
          map.setView([20.5937, 78.9629], 5);
          return;
        }

        for (const r of withCoords) {
          const marker = L.marker([r.latitude!, r.longitude!], {
            icon: pinIcon(L, r.agent_online, r.virtual_mode),
          }).addTo(map);
          const html = `
            <div style="font-family: system-ui, sans-serif; min-width: 200px;">
              <div style="font-weight: 600; color: #18181b; margin-bottom: 4px;">${escapeHtml(r.name)}</div>
              ${r.location ? `<div style="font-size: 12px; color: #71717a; margin-bottom: 6px;">${escapeHtml(r.location)}</div>` : ""}
              <div style="display: flex; gap: 8px; font-size: 11px; color: #52525b; margin-top: 6px;">
                <span>${r.lifetime_prints} prints</span>
                <span>·</span>
                <span>${formatPaise(r.lifetime_revenue_paise)}</span>
              </div>
              <div style="margin-top: 6px; font-size: 11px;">
                ${
                  r.virtual_mode
                    ? '<span style="color: #6366f1; font-weight: 600;">Virtual mode</span>'
                    : r.agent_online
                      ? '<span style="color: #10b981; font-weight: 600;">Online</span>'
                      : '<span style="color: #a1a1aa; font-weight: 600;">Offline</span>'
                }
              </div>
            </div>`;
          marker.bindPopup(html);
        }

        if (withCoords.length === 1) {
          map.setView([withCoords[0].latitude!, withCoords[0].longitude!], 13);
        } else {
          const bounds: LatLng[] = withCoords.map((r) => [r.latitude!, r.longitude!]);
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
        }
      })
      .catch((err) => {
        if (!cancelled) setMapError(err.message ?? "Map failed to load");
      });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [rows]);

  const withCoords = rows.filter((r) => r.latitude != null && r.longitude != null);
  const withoutCoords = rows.filter((r) => r.latitude == null || r.longitude == null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Printers</h2>
        <p className="text-sm text-zinc-500 mt-1">Every registered printer, plotted where its vendor set the location.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Map */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Printer locations
              </h3>
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Online
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-zinc-400" />
                  Offline
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  Virtual
                </span>
              </div>
            </div>
            {mapError ? (
              <div className="p-8 text-center text-sm text-red-600 bg-red-50">
                Failed to load map: {mapError}
              </div>
            ) : withCoords.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500">
                No printers have location coordinates yet. Vendors can set them under Printer location in their portal.
              </div>
            ) : (
              <div ref={mapRef} style={{ height: 460, width: "100%" }} className="bg-zinc-100" />
            )}
          </div>

          {/* List */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-900">All printers</h3>
              <span className="text-xs text-zinc-400">{rows.length} total</span>
            </div>
            {rows.length === 0 ? (
              <p className="px-6 py-8 text-sm text-zinc-400 text-center">No printers registered.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-zinc-100">
                      <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Shop</th>
                      <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Location</th>
                      <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Coords</th>
                      <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Agent</th>
                      <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide text-right">
                        Prints
                      </th>
                      <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide text-right">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedId(p.id)}
                        className={`border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer ${selectedId === p.id ? "bg-indigo-50/30" : ""}`}
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                              <Printer className="w-3.5 h-3.5 text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-zinc-900 truncate">{p.name}</p>
                              <p className="text-[10px] text-zinc-400">
                                {p.claimed ? "Claimed" : "Unclaimed"}
                                {p.virtual_mode && " · Virtual"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 max-w-[220px]">
                          <span className="truncate block">{p.location ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500 tabular-nums">
                          {p.latitude != null && p.longitude != null ? (
                            <a
                              href={`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}&zoom=15`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                            >
                              {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-zinc-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {p.virtual_mode ? (
                            <span className="inline-flex items-center gap-1 text-xs text-indigo-700">Virtual</span>
                          ) : p.agent_online ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                              <Wifi className="w-3 h-3" /> Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                              <WifiOff className="w-3 h-3" /> Offline
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-900">
                          {p.lifetime_prints.toLocaleString("en-IN")}
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-zinc-900 font-medium">
                          {formatPaise(p.lifetime_revenue_paise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {withoutCoords.length > 0 && (
            <p className="text-xs text-zinc-500">
              {withoutCoords.length} printer{withoutCoords.length === 1 ? "" : "s"} not shown on the map — coordinates missing.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
