"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Search,
  Navigation,
  Share2,
  Phone,
  X,
  Locate,
  List,
  Map as MapIcon,
  Printer,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Footprints,
} from "lucide-react";
import Image from "next/image";
import { Segmented } from "@/components/mobile/Segmented";

/* ─── Types ──────────────────────────────────────────────────────────── */
type Shop = {
  id: string;
  name: string;
  location: string | null;
  latitude: number;
  longitude: number;
  contact_phone: string | null;
  distance_km: number | null;
  virtual_mode: boolean;
};

/* ─── Constants ──────────────────────────────────────────────────────── */
// Floating tab bar (64px + 12px gap) sits over the sheet; content clears it.
const TAB_CLEAR  = 88;
const SHEET_PEEK = 200;

/* ─── Helpers ───────────────────────────────────────────────────────── */
function fmtDist(km: number | null) {
  if (km == null) return "";
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

/* ─── SVG marker icons ───────────────────────────────────────────────── */
function makePinIcon(selected: boolean): L.DivIcon {
  const fill   = selected ? "#0C831F" : "#1C1C1E";
  const shadow = selected
    ? "0 4px 16px rgba(12,131,31,0.45)"
    : "0 3px 12px rgba(0,0,0,0.32)";
  const size  = selected ? 50 : 42;
  const ratio = size / 50;
  return L.divIcon({
    className:   "",
    iconSize:    [size, Math.round(size * 1.25)],
    iconAnchor:  [size / 2, Math.round(size * 1.25)],
    popupAnchor: [0, -Math.round(size * 1.25)],
    html: `<div style="filter:drop-shadow(${shadow});cursor:pointer">
      <svg width="${size}" height="${Math.round(size * 1.25)}" viewBox="0 0 50 63" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M25 0C11.2 0 0 11.2 0 25C0 43.5 25 63 25 63C25 63 50 43.5 50 25C50 11.2 38.8 0 25 0Z" fill="${fill}"/>
        <circle cx="25" cy="25" r="15" fill="rgba(255,255,255,0.15)"/>
        <g transform="translate(${25 - 10 * ratio},${25 - 10 * ratio}) scale(${ratio * 0.82})"
           stroke="white" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <polyline points="5,9 5,2 19,2 19,9"/>
          <path d="M5,17H3a1,1,0,0,1-1-1V10a1,1,0,0,1,1-1H21a1,1,0,0,1,1,1v6a1,1,0,0,1-1,1H19"/>
          <rect x="5" y="13" width="14" height="9"/>
          <line x1="9" y1="9" x2="9" y2="13"/>
        </g>
      </svg>
    </div>`,
  });
}

const dotIcon = L.divIcon({
  className: "",
  iconSize:  [22, 22],
  iconAnchor:[11, 11],
  html: `<div style="position:relative;width:22px;height:22px">
    <div style="position:absolute;inset:-9px;background:rgba(66,133,244,0.16);border-radius:50%;animation:nb-pulse 2.4s ease-in-out infinite"></div>
    <div style="position:absolute;inset:1px;background:#4285F4;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 10px rgba(66,133,244,0.5)"></div>
  </div>`,
});

/* ─── ShopCard ───────────────────────────────────────────────────────── */
function ShopCard({
  shop,
  selected,
  userPos,
  onSelect,
  onShare,
  expanded,
}: {
  shop: Shop;
  selected: boolean;
  userPos: [number, number] | null;
  onSelect(): void;
  onShare(): void;
  expanded?: boolean;
}) {
  const mapsUrl = userPos
    ? `https://www.google.com/maps/dir/${userPos[0]},${userPos[1]}/${shop.latitude},${shop.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${shop.latitude},${shop.longitude}`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className="rounded-2xl transition-all duration-150 cursor-pointer select-none"
      style={{
        padding: "12px",
        background: selected ? "rgba(12,131,31,0.07)" : "rgba(255,255,255,0.78)",
        border: selected ? "1px solid rgba(12,131,31,0.20)" : "1px solid rgba(0,0,0,0.05)",
        boxShadow: selected ? "0 4px 20px rgba(12,131,31,0.10)" : "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex gap-3 items-start">
        {/* Icon */}
        <div
          className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 transition-colors"
          style={{ background: selected ? "#0C831F" : "rgba(242,242,247,0.80)" }}
        >
          <Printer className="w-5 h-5" style={{ color: selected ? "white" : "#636366" }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-gray-900 leading-snug truncate" style={{ fontSize: 15, fontWeight: 500 }}>
            {shop.name}
          </p>
          {shop.location && (
            <p className="text-gray-500 mt-0.5 line-clamp-1 leading-snug" style={{ fontSize: 13 }}>
              {shop.location}
            </p>
          )}
          {shop.distance_km != null && (
            <span
              className="inline-flex items-center gap-1 mt-1.5 rounded-full"
              style={{
                fontSize: 12, fontWeight: 600, color: "#0C831F",
                background: "rgba(0,206,104,0.10)",
                border: "1px solid rgba(0,206,104,0.18)",
                padding: "2px 8px",
              }}
            >
              <Footprints className="w-3 h-3" />
              {fmtDist(shop.distance_km)} away
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="w-8 h-8 flex items-center justify-center rounded-xl"
            style={{ background: "rgba(242,242,247,0.80)", border: "1px solid rgba(255,255,255,0.5)" }}
            aria-label="Share location"
          >
            <Share2 className="w-3.5 h-3.5 text-gray-500" />
          </button>
          {shop.contact_phone && (
            <a
              href={`tel:${shop.contact_phone}`}
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 flex items-center justify-center rounded-xl"
              style={{ background: "rgba(242,242,247,0.80)", border: "1px solid rgba(255,255,255,0.5)" }}
              aria-label={`Call ${shop.name}`}
            >
              <Phone className="w-3.5 h-3.5 text-gray-500" />
            </a>
          )}
        </div>
      </div>

      {/* Directions button — opens Google / Apple Maps instantly */}
      {(selected || expanded) && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-[14px] text-white"
          style={{
            height: 42, fontSize: 14, fontWeight: 600,
            background: "linear-gradient(135deg, #0C831F 0%, #00CE68 100%)",
            letterSpacing: 0.1,
            boxShadow: "0 2px 12px rgba(12,131,31,0.30)",
          }}
        >
          <Navigation className="w-4 h-4" />
          Get Directions
        </a>
      )}
    </div>
  );
}

/* ─── NearbyMap ──────────────────────────────────────────────────────── */
export default function NearbyMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const mapAlive     = useRef(false);
  const userMarkerRef= useRef<L.Marker | null>(null);
  const shopMarkers  = useRef<Record<string, L.Marker>>({});
  const autoExpanded = useRef(false);

  const [shops,         setShops        ] = useState<Shop[]>([]);
  const [query,         setQuery         ] = useState("");
  const [userPos,       setUserPos       ] = useState<[number, number] | null>(null);
  const [selected,      setSelected      ] = useState<Shop | null>(null);
  const [locating,      setLocating      ] = useState(false);
  const [viewMode,      setViewMode      ] = useState<"map" | "list">("map");
  const [sheetExpanded, setSheetExpanded ] = useState(false);
  const [toast,         setToast         ] = useState<{ msg: string; kind: "err" | "ok" } | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return shops;
    const q = query.toLowerCase();
    return shops.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.location?.toLowerCase().includes(q) ?? false)
    );
  }, [shops, query]);

  /* ── Init Leaflet ── */
  useEffect(() => {
    if (!mapContainer.current || mapAlive.current) return;
    mapAlive.current = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({ iconUrl: "", shadowUrl: "" });

    const map = L.map(mapContainer.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: false,
      attributionControl: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
    });

    L.control.zoom({ position: "topright" }).addTo(map);

    // shortcut: OSM's public tile server is fine for MVP traffic only; move to a keyed provider before scaling.
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    const ro = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    if (mapContainer.current) ro.observe(mapContainer.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current  = null;
      mapAlive.current = false;
    };
  }, []);

  /* ── Fetch shops (no user location) ── */
  useEffect(() => {
    fetch("/api/shops/nearby")
      .then((r) => r.json())
      .then((d) => setShops(d.shops ?? []))
      .catch(() => setToast({ msg: "Could not load nearby printers.", kind: "err" }));
  }, []);

  /* ── Re-fetch with GPS for distance sort ── */
  const fetchWithPos = useCallback((lat: number, lng: number) => {
    fetch(`/api/shops/nearby?lat=${lat}&lng=${lng}&radius=50`)
      .then((r) => r.json())
      .then((d) => setShops(d.shops ?? []))
      .catch(() => {});
  }, []);

  /* ── Auto-expand sheet on first shops load ── */
  useEffect(() => {
    if (shops.length > 0 && !autoExpanded.current) {
      autoExpanded.current = true;
      setSheetExpanded(true);
    }
  }, [shops]);

  /* ── Place / update shop markers ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existing = shopMarkers.current;
    const keep = new Set<string>();

    shops.forEach((shop) => {
      keep.add(shop.id);
      const isSel = selected?.id === shop.id;
      if (existing[shop.id]) {
        existing[shop.id].setIcon(makePinIcon(isSel));
      } else {
        const m = L.marker([shop.latitude, shop.longitude], { icon: makePinIcon(isSel) }).addTo(map);
        m.on("click", () => {
          setSelected(shop);
          setSheetExpanded(true);
          map.flyTo([shop.latitude, shop.longitude], 16, { duration: 0.8 });
        });
        existing[shop.id] = m;
      }
    });

    Object.keys(existing).forEach((id) => {
      if (!keep.has(id)) { existing[id].remove(); delete existing[id]; }
    });

    if (shops.length > 0 && !userPos) {
      if (shops.length === 1) {
        map.flyTo([shops[0].latitude, shops[0].longitude], 15, { duration: 1 });
      } else {
        const bounds = L.latLngBounds(shops.map((s) => [s.latitude, s.longitude] as [number, number]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shops]);

  /* ── Update icon when selection changes ── */
  useEffect(() => {
    Object.entries(shopMarkers.current).forEach(([id, m]) =>
      m.setIcon(makePinIcon(id === selected?.id))
    );
  }, [selected]);

  /* ── Invalidate map size when switching to map view ── */
  useEffect(() => {
    if (viewMode === "map") setTimeout(() => mapRef.current?.invalidateSize({ animate: false }), 50);
  }, [viewMode]);

  /* ── Get user GPS ── */
  const locateUser = useCallback(() => {
    if (!navigator.geolocation) {
      setToast({ msg: "Geolocation not supported by your browser.", kind: "err" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserPos([lat, lng]);
        setLocating(false);
        fetchWithPos(lat, lng);

        const map = mapRef.current;
        if (!map) return;
        userMarkerRef.current?.remove();
        userMarkerRef.current = L.marker([lat, lng], { icon: dotIcon, zIndexOffset: 1000 }).addTo(map);
        map.flyTo([lat, lng], 14, { duration: 1.2 });
      },
      (err) => {
        setToast({
          msg: err.code === 1
            ? "Location permission denied. Enable it in browser settings."
            : "Could not get your location. Try again.",
          kind: "err",
        });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, [fetchWithPos]);

  /* Auto-locate on mount */
  useEffect(() => { locateUser(); }, [locateUser]);

  /* ── Share ── */
  const shareShop = useCallback(async (shop: Shop) => {
    const url  = `https://maps.google.com/maps?q=${shop.latitude},${shop.longitude}`;
    const text = `${shop.name}${shop.location ? ` · ${shop.location}` : ""} — HIMMER`;
    try {
      if (navigator.share) {
        await navigator.share({ title: shop.name, text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setToast({ msg: "Location link copied!", kind: "ok" });
      }
    } catch { /* cancelled */ }
  }, []);

  /* ── Dismiss toast after 3.5s ── */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── Sheet height (includes the strip hidden behind the floating tab bar) ── */
  const sheetH   = sheetExpanded ? `calc(62vh + ${TAB_CLEAR}px)` : `${SHEET_PEEK + TAB_CLEAR}px`;
  const fabBottom= `calc(${sheetH} + 14px)`;

  /* ══════════════════════════════════════════════════════════════════ */
  return (
    // h-dvh, not h-full: the app shell's content wrapper is only min-h-full, so h-full resolves to auto and the map collapses to 0px.
    <div className="isolate flex flex-col h-dvh overflow-hidden relative" style={{ background: "transparent" }}>
      <style>{`
        @keyframes nb-pulse {
          0%,100% { transform:scale(1); opacity:.5; }
          50% { transform:scale(2); opacity:0; }
        }
        .leaflet-container { font-family: var(--font-himmer), -apple-system, sans-serif; }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 12px rgba(0,0,0,0.12) !important;
          border-radius: 14px !important;
          overflow: hidden;
          background: rgba(255,255,255,0.80) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
        }
        .leaflet-control-zoom a {
          width:36px !important; height:36px !important; line-height:36px !important;
          font-size:18px !important; color:#3c3c3c !important;
          background: transparent !important;
        }
        .leaflet-control-zoom a:hover { background: rgba(0,0,0,0.04) !important; }
        .leaflet-control-zoom-in { border-bottom: 1px solid rgba(0,0,0,0.07) !important; }
        .leaflet-control-attribution {
          font-size:9px !important;
          background: rgba(255,255,255,0.68) !important;
          backdrop-filter: blur(8px);
        }
      `}</style>

      {/* ── Glass Header ── */}
      <div className="glass-chrome relative z-30 shrink-0 rounded-none border-x-0 border-t-0 border-b-black/[0.06] px-4 pb-3 pt-[env(safe-area-inset-top)] shadow-none">
        {/* Title row — matches TabTopBar */}
        <div className="flex h-14 items-center gap-2.5">
          <Image src="/himmer-symbol-nav.png" alt="" aria-hidden width={28} height={28} className="shrink-0" priority />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[20px] font-bold leading-tight tracking-[-0.03em] text-label">Nearby</h1>
            <p className="truncate text-[12px] text-secondary-label">
              {userPos
                ? `${shops.length} shop${shops.length !== 1 ? "s" : ""} within 50 km`
                : "Enable location to sort by distance"}
            </p>
          </div>

          <div className="w-[140px] shrink-0">
            <Segmented
              size="sm"
              ariaLabel="View"
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: "map", label: "Map", icon: <MapIcon className="h-3.5 w-3.5" /> },
                { value: "list", label: "List", icon: <List className="h-3.5 w-3.5" /> },
              ]}
            />
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ width: 16, height: 16, color: "#8E8E93" }}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by shop or landmark…"
            className="h-10 w-full rounded-[12px] bg-zinc-500/[0.12] text-[16px] text-label outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-tint/40"
            style={{ paddingLeft: 36, paddingRight: query ? 36 : 14 }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              aria-label="Clear"
            >
              <X style={{ width: 15, height: 15, color: "#8E8E93" }} />
            </button>
          )}
        </div>
      </div>

      {/* ═══ MAP VIEW ═══════════════════════════════════════════════════ */}
      {viewMode === "map" && (
        <div className="flex-1 relative overflow-hidden">
          <div ref={mapContainer} className="absolute inset-0" />

          {/* Locate FAB — glass */}
          <button
            onClick={locateUser}
            disabled={locating}
            aria-label="My location"
            className="glass-chrome absolute right-4 z-[500] flex h-11 w-11 items-center justify-center rounded-full transition-[bottom] duration-300 ease-spring active:scale-95"
            style={{ bottom: fabBottom }}
          >
            <Locate
              style={{
                width: 20, height: 20,
                color:     locating || userPos ? "#0C831F" : "#636366",
                animation: locating ? "nb-pulse 1.2s ease-in-out infinite" : "none",
              }}
            />
          </button>

          {/* ── Glass Bottom Sheet ── */}
          <div
            className="glass-sheet absolute inset-x-0 bottom-0 z-[400] flex flex-col rounded-t-[28px] border-b-0 transition-[height] duration-300 ease-spring"
            style={{ height: sheetH }}
          >
            {/* Handle + header */}
            <button
              onClick={() => setSheetExpanded((v) => !v)}
              className="w-full shrink-0 flex flex-col items-center"
              style={{ paddingTop: 10, paddingBottom: 8 }}
              aria-label={sheetExpanded ? "Collapse" : "Expand sheet"}
              aria-expanded={sheetExpanded}
            >
              <div className="mb-2.5 h-[5px] w-9 rounded-full bg-black/15" />
              <div className="w-full flex items-center justify-between px-4">
                <span style={{ fontSize: 12, fontWeight: 600, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.6 }}>
                  {filtered.length} Printer{filtered.length !== 1 ? "s" : ""}
                  {!userPos ? " · share location to sort" : ""}
                </span>
                <ChevronUp
                  style={{
                    width: 16, height: 16, color: "#C7C7CC",
                    transform:  sheetExpanded ? "rotate(180deg)" : "none",
                    transition: "transform .3s",
                  }}
                />
              </div>
            </button>

            {/* Shop list */}
            <div
              className="flex-1 overflow-y-auto"
              style={{ padding: `4px 14px calc(${TAB_CLEAR}px + env(safe-area-inset-bottom))` }}
            >
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-3 text-center">
                  <Printer style={{ width: 36, height: 36, color: "#D1D1D6" }} />
                  <p style={{ fontSize: 14, color: "#8E8E93", lineHeight: 1.5 }}>
                    {query ? `No printers matching "${query}"` : "No nearby printers found yet."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filtered.map((shop) => (
                    <ShopCard
                      key={shop.id}
                      shop={shop}
                      selected={selected?.id === shop.id}
                      userPos={userPos}
                      onSelect={() => {
                        setSelected(shop);
                        setSheetExpanded(true);
                        mapRef.current?.flyTo([shop.latitude, shop.longitude], 16, { duration: 0.8 });
                      }}
                      onShare={() => shareShop(shop)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ LIST VIEW ══════════════════════════════════════════════════ */}
      {viewMode === "list" && (
        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: `calc(${TAB_CLEAR + 12}px + env(safe-area-inset-bottom))` }}>
          <div className="flex items-center justify-between" style={{ padding: "12px 16px 8px" }}>
            <span style={{ fontSize: 13, color: "#8E8E93" }}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
            {!userPos && (
              <button
                onClick={locateUser}
                className="flex items-center gap-1.5"
                style={{ fontSize: 13, fontWeight: 600, color: "#0C831F" }}
              >
                <Locate style={{ width: 13, height: 13 }} />
                Sort by distance
              </button>
            )}
          </div>

          <div style={{ padding: "0 14px 24px" }} className="space-y-3">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center py-20 gap-4 text-center">
                <Printer style={{ width: 48, height: 48, color: "#D1D1D6" }} />
                <p style={{ fontSize: 15, color: "#8E8E93" }}>
                  {query ? `No printers matching "${query}"` : "No nearby printers available."}
                </p>
              </div>
            ) : (
              filtered.map((shop) => (
                <ShopCard
                  key={shop.id}
                  shop={shop}
                  selected={selected?.id === shop.id}
                  expanded
                  userPos={userPos}
                  onSelect={() => {
                    setSelected(shop);
                    setViewMode("map");
                    setTimeout(
                      () => mapRef.current?.flyTo([shop.latitude, shop.longitude], 16, { duration: 0.8 }),
                      120
                    );
                  }}
                  onShare={() => shareShop(shop)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div
          className="fixed inset-x-4 z-[600] flex items-center justify-between gap-3"
          style={{
            bottom: `calc(${TAB_CLEAR}px + env(safe-area-inset-bottom))`, padding: "12px 14px", borderRadius: 999,
            background:           toast.kind === "ok" ? "#0C831F" : "rgba(28,28,30,0.90)",
            backdropFilter:       "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border:               "1px solid rgba(255,255,255,0.12)",
            boxShadow:            "0 4px 20px rgba(0,0,0,0.20)",
            animation: "fadeSlideUp .22s ease",
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {toast.kind === "ok"
              ? <CheckCircle2 style={{ width: 16, height: 16, color: "#A8F0B8", flexShrink: 0 }} />
              : <AlertCircle  style={{ width: 16, height: 16, color: "#FFB800", flexShrink: 0 }} />
            }
            <span className="truncate" style={{ fontSize: 14, color: "white", fontWeight: 400 }}>
              {toast.msg}
            </span>
          </div>
          <button onClick={() => setToast(null)} aria-label="Dismiss">
            <X style={{ width: 15, height: 15, color: "rgba(255,255,255,0.5)" }} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
