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
  Clock,
  CheckCircle2,
  AlertCircle,
  Footprints,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────────── */
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
type RouteInfo = { distM: number; durS: number };

/* ─── Constants ──────────────────────────────────────────────────────── */
const TAB_H = 64;
const SHEET_PEEK = 208;

/* ─── Helpers ───────────────────────────────────────────────────────── */
function fmtDist(km: number | null) {
  if (km == null) return "";
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
function fmtWalk(s: number) {
  const m = Math.round(s / 60);
  if (m < 1) return "< 1 min";
  if (m < 60) return `${m} min walk`;
  return `${Math.floor(m / 60)}h ${m % 60}m walk`;
}

/* ─── SVG marker icons ───────────────────────────────────────────────── */
function makePinIcon(selected: boolean): L.DivIcon {
  const fill = selected ? "#0C831F" : "#1C1C1E";
  const shadow = selected
    ? "0 4px 16px rgba(12,131,31,0.45)"
    : "0 3px 12px rgba(0,0,0,0.32)";
  const size = selected ? 50 : 42;
  const ratio = size / 50;
  return L.divIcon({
    className: "",
    iconSize: [size, Math.round(size * 1.25)],
    iconAnchor: [size / 2, Math.round(size * 1.25)],
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
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `<div style="position:relative;width:22px;height:22px">
    <div style="position:absolute;inset:-9px;background:rgba(66,133,244,0.16);border-radius:50%;animation:nb-pulse 2.4s ease-in-out infinite"></div>
    <div style="position:absolute;inset:1px;background:#4285F4;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 10px rgba(66,133,244,0.5)"></div>
  </div>`,
});

/* ─── ShopCard ───────────────────────────────────────────────────────── */
function ShopCard({
  shop,
  selected,
  onSelect,
  onDirections,
  onShare,
  routing,
  expanded,
}: {
  shop: Shop;
  selected: boolean;
  onSelect(): void;
  onDirections(): void;
  onShare(): void;
  routing?: boolean;
  expanded?: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={`rounded-2xl border transition-all duration-150 cursor-pointer select-none ${
        selected
          ? "border-green-200 bg-green-50/60"
          : "border-gray-100 bg-white active:scale-[0.985]"
      }`}
      style={{ padding: "12px 12px 12px 12px" }}
    >
      <div className="flex gap-3 items-start">
        {/* Icon */}
        <div
          className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 transition-colors"
          style={{
            background: selected ? "#0C831F" : "#F2F2F7",
          }}
        >
          <Printer
            className="w-5 h-5"
            style={{ color: selected ? "white" : "#636366" }}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p
            className="text-gray-900 leading-snug truncate"
            style={{ fontSize: 15, fontWeight: 500 }}
          >
            {shop.name}
          </p>
          {shop.location && (
            <p
              className="text-gray-500 mt-0.5 line-clamp-1 leading-snug"
              style={{ fontSize: 13 }}
            >
              {shop.location}
            </p>
          )}
          {shop.distance_km != null && (
            <span
              className="inline-flex items-center gap-1 mt-1.5 rounded-full border"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#0C831F",
                background: "#F0FBF1",
                borderColor: "#C6EBC9",
                padding: "2px 8px",
              }}
            >
              <Footprints className="w-3 h-3" />
              {fmtDist(shop.distance_km)} away
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors"
            style={{ background: "#F2F2F7" }}
            aria-label="Share location"
          >
            <Share2 className="w-3.5 h-3.5 text-gray-500" />
          </button>
          {shop.contact_phone && (
            <a
              href={`tel:${shop.contact_phone}`}
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors"
              style={{ background: "#F2F2F7" }}
              aria-label={`Call ${shop.name}`}
            >
              <Phone className="w-3.5 h-3.5 text-gray-500" />
            </a>
          )}
        </div>
      </div>

      {(selected || expanded) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDirections();
          }}
          disabled={routing}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-[14px] text-white transition-all disabled:opacity-55"
          style={{
            height: 42,
            fontSize: 14,
            fontWeight: 600,
            background: routing ? "#4CAF50" : "#0C831F",
            letterSpacing: 0.1,
          }}
        >
          <Navigation className="w-4 h-4" />
          {routing ? "Finding route…" : "Get Directions"}
        </button>
      )}
    </div>
  );
}

/* ─── NearbyMap ──────────────────────────────────────────────────────── */
export default function NearbyMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const mapAlive = useRef(false);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const shopMarkers = useRef<Record<string, L.Marker>>({});
  const routeCasing = useRef<L.Polyline | null>(null);
  const routeLine = useRef<L.Polyline | null>(null);

  const [shops, setShops] = useState<Shop[]>([]);
  const [query, setQuery] = useState("");
  const [userPos, setUserPos] = useState<[number, number] | null>(null); // [lat, lng]
  const [selected, setSelected] = useState<Shop | null>(null);
  const [locating, setLocating] = useState(false);
  const [routing, setRouting] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [activeRoute, setActiveRoute] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    kind: "err" | "ok";
  } | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return shops;
    const q = query.toLowerCase();
    return shops.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.location?.toLowerCase().includes(q) ?? false)
    );
  }, [shops, query]);

  /* ── Inject Roboto font ── */
  useEffect(() => {
    const id = "nb-roboto";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap";
    document.head.appendChild(link);
  }, []);

  /* ── Init Leaflet ── */
  useEffect(() => {
    if (!mapContainer.current || mapAlive.current) return;
    mapAlive.current = true;

    // Fix default icon path (webpack issue)
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

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        subdomains: "abcd",
        maxZoom: 20,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
      }
    ).addTo(map);

    mapRef.current = map;

    // Auto-resize on container size change
    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    if (mapContainer.current) ro.observe(mapContainer.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      mapAlive.current = false;
    };
  }, []);

  /* ── Fetch shops ── */
  useEffect(() => {
    fetch("/api/shops/nearby")
      .then((r) => r.json())
      .then((d) => setShops(d.shops ?? []))
      .catch(() =>
        setToast({ msg: "Could not load nearby printers.", kind: "err" })
      );
  }, []);

  /* ── Re-fetch with GPS for distance sort ── */
  const fetchWithPos = useCallback((lat: number, lng: number) => {
    fetch(`/api/shops/nearby?lat=${lat}&lng=${lng}&radius=50`)
      .then((r) => r.json())
      .then((d) => setShops(d.shops ?? []))
      .catch(() => {});
  }, []);

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
        const m = L.marker([shop.latitude, shop.longitude], {
          icon: makePinIcon(isSel),
        }).addTo(map);
        m.on("click", () => {
          setSelected(shop);
          setSheetExpanded(true);
          map.flyTo([shop.latitude, shop.longitude], 16, { duration: 0.8 });
        });
        existing[shop.id] = m;
      }
    });

    // Remove stale markers
    Object.keys(existing).forEach((id) => {
      if (!keep.has(id)) {
        existing[id].remove();
        delete existing[id];
      }
    });

    // Fit map to shops on first load (no user pos yet)
    if (shops.length > 0 && !userPos) {
      if (shops.length === 1) {
        map.flyTo([shops[0].latitude, shops[0].longitude], 15, { duration: 1 });
      } else {
        const bounds = L.latLngBounds(
          shops.map((s) => [s.latitude, s.longitude] as [number, number])
        );
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shops]);

  /* ── Update icon when selection changes ── */
  useEffect(() => {
    Object.entries(shopMarkers.current).forEach(([id, m]) => {
      m.setIcon(makePinIcon(id === selected?.id));
    });
  }, [selected]);

  /* ── Invalidate map size when switching to map view ── */
  useEffect(() => {
    if (viewMode === "map") {
      setTimeout(() => mapRef.current?.invalidateSize({ animate: false }), 50);
    }
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
        userMarkerRef.current = L.marker([lat, lng], {
          icon: dotIcon,
          zIndexOffset: 1000,
        }).addTo(map);

        map.flyTo([lat, lng], 14, { duration: 1.2 });
      },
      (err) => {
        setToast({
          msg:
            err.code === 1
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
  useEffect(() => {
    locateUser();
  }, [locateUser]);

  /* ── Get walking directions via OSRM ── */
  const getDirections = useCallback(
    async (shop: Shop) => {
      if (!userPos) {
        locateUser();
        setToast({ msg: "Allow location to get walking directions.", kind: "err" });
        return;
      }
      const map = mapRef.current;
      if (!map) return;

      setSelected(shop);
      setRouting(true);

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);

      try {
        const [ulat, ulng] = userPos;
        const url =
          `https://router.project-osrm.org/route/v1/foot/` +
          `${ulng},${ulat};${shop.longitude},${shop.latitude}` +
          `?overview=full&geometries=geojson`;

        const res = await fetch(url, { signal: ctrl.signal });
        const data = await res.json();

        if (data.code !== "Ok" || !data.routes?.[0]) {
          setToast({ msg: "No walking route found to this printer.", kind: "err" });
          return;
        }

        const route = data.routes[0] as {
          distance: number;
          duration: number;
          geometry: { coordinates: [number, number][] };
        };

        setRouteInfo({ distM: route.distance, durS: route.duration });

        routeCasing.current?.remove();
        routeLine.current?.remove();

        // OSRM returns [lng, lat]; Leaflet needs [lat, lng]
        const latlngs = route.geometry.coordinates.map(
          ([lng, lat]) => [lat, lng] as [number, number]
        );

        routeCasing.current = L.polyline(latlngs, {
          color: "#ffffff",
          weight: 10,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);

        routeLine.current = L.polyline(latlngs, {
          color: "#0C831F",
          weight: 5.5,
          opacity: 1,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);

        setActiveRoute(true);

        const sheetOffset = sheetExpanded
          ? window.innerHeight * 0.62 + TAB_H + 24
          : SHEET_PEEK + TAB_H + 24;

        map.fitBounds(L.latLngBounds(latlngs), {
          paddingTopLeft: [40, 80],
          paddingBottomRight: [40, sheetOffset],
        });
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") {
          setToast({ msg: "Route request timed out. Check your connection.", kind: "err" });
        } else {
          setToast({ msg: "Could not load walking route. Try again.", kind: "err" });
        }
      } finally {
        clearTimeout(timer);
        setRouting(false);
      }
    },
    [userPos, locateUser, sheetExpanded]
  );

  /* ── Clear route ── */
  const clearRoute = useCallback(() => {
    routeCasing.current?.remove();
    routeLine.current?.remove();
    routeCasing.current = null;
    routeLine.current = null;
    setActiveRoute(false);
    setRouteInfo(null);
  }, []);

  /* ── Share ── */
  const shareShop = useCallback(async (shop: Shop) => {
    const url = `https://maps.google.com/maps?q=${shop.latitude},${shop.longitude}`;
    const text = `${shop.name}${shop.location ? ` · ${shop.location}` : ""} — PrintBuddy`;
    try {
      if (navigator.share) {
        await navigator.share({ title: shop.name, text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setToast({ msg: "Location link copied!", kind: "ok" });
      }
    } catch {
      /* cancelled */
    }
  }, []);

  /* ── Dismiss toast after 3.5s ── */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── Sheet height for positioning ── */
  const sheetH = sheetExpanded ? "62vh" : `${SHEET_PEEK}px`;
  const fabBottom = `calc(${sheetH} + ${TAB_H + 14}px)`;

  /* ═══════════════════════════════════════════════════════════════════ */
  return (
    <div
      className="flex flex-col h-full overflow-hidden relative bg-white"
      style={{ fontFamily: "'Roboto', -apple-system, sans-serif" }}
    >
      {/* ── Global styles ── */}
      <style>{`
        @keyframes nb-pulse {
          0%,100% { transform:scale(1); opacity:.5; }
          50% { transform:scale(2); opacity:0; }
        }
        .leaflet-container { font-family: 'Roboto', sans-serif; }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 1px 6px rgba(0,0,0,.18) !important;
          border-radius: 12px !important;
          overflow: hidden;
        }
        .leaflet-control-zoom a {
          width: 36px !important; height: 36px !important;
          line-height: 36px !important; font-size: 18px !important;
          color: #3c3c3c !important; background: #fff !important;
          font-family: 'Roboto', sans-serif !important;
        }
        .leaflet-control-zoom a:hover { background: #f5f5f5 !important; }
        .leaflet-control-zoom-in { border-bottom: 1px solid #eee !important; }
        .leaflet-control-attribution {
          font-size: 9px !important;
          background: rgba(255,255,255,0.7) !important;
          backdrop-filter: blur(4px);
        }
        .leaflet-control-attribution a { color: #555 !important; }
      `}</style>

      {/* ── Header ── */}
      <div
        className="shrink-0 bg-white z-30 relative"
        style={{
          padding: "16px 16px 12px",
          borderBottom: "1px solid #F2F2F7",
        }}
      >
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1
              className="text-gray-900 leading-tight"
              style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}
            >
              Nearby Printers
            </h1>
            <p style={{ fontSize: 13, color: "#8E8E93", marginTop: 2 }}>
              {userPos
                ? `${shops.length} shop${shops.length !== 1 ? "s" : ""} within 50 km`
                : "Enable location to sort by distance"}
            </p>
          </div>

          {/* Map / List toggle */}
          <div
            className="flex items-center gap-0.5 rounded-[12px] p-[3px]"
            style={{ background: "#F2F2F7" }}
          >
            {(["map", "list"] as const).map((mode) => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="flex items-center gap-1.5 rounded-[9px] transition-all"
                  style={{
                    padding: "6px 12px",
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    color: active ? "#1C1C1E" : "#8E8E93",
                    background: active ? "#FFFFFF" : "transparent",
                    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                  }}
                >
                  {mode === "map" ? (
                    <MapIcon className="w-3.5 h-3.5" />
                  ) : (
                    <List className="w-3.5 h-3.5" />
                  )}
                  {mode === "map" ? "Map" : "List"}
                </button>
              );
            })}
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
            className="w-full outline-none text-gray-900 placeholder-[#8E8E93] transition-shadow"
            style={{
              paddingLeft: 36,
              paddingRight: query ? 36 : 14,
              height: 40,
              borderRadius: 12,
              background: "#F2F2F7",
              fontSize: 15,
              border: "none",
              fontFamily: "'Roboto', sans-serif",
            }}
            onFocus={(e) =>
              (e.target.style.boxShadow = "0 0 0 2px #0C831F40")
            }
            onBlur={(e) => (e.target.style.boxShadow = "none")}
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
          {/* Leaflet canvas */}
          <div ref={mapContainer} className="absolute inset-0" />

          {/* Locate FAB */}
          <button
            onClick={locateUser}
            disabled={locating}
            aria-label="My location"
            className="absolute z-[500] right-4 flex items-center justify-center rounded-full transition-all"
            style={{
              bottom: fabBottom,
              width: 44,
              height: 44,
              background: "white",
              boxShadow: "0 2px 8px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(0,0,0,0.08)",
              border: "none",
            }}
          >
            <Locate
              style={{
                width: 20,
                height: 20,
                color: locating ? "#0C831F" : userPos ? "#0C831F" : "#636366",
                animation: locating ? "nb-pulse 1.2s ease-in-out infinite" : "none",
              }}
            />
          </button>

          {/* Route info pill */}
          {activeRoute && routeInfo && (
            <div
              className="absolute z-[500] left-1/2 -translate-x-1/2"
              style={{ bottom: fabBottom }}
            >
              <div
                className="flex items-center gap-3 rounded-full"
                style={{
                  background: "white",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.15), 0 0 0 0.5px rgba(0,0,0,0.06)",
                  padding: "8px 16px",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  className="flex items-center gap-1.5"
                  style={{ fontSize: 14, fontWeight: 700, color: "#0C831F" }}
                >
                  <Navigation style={{ width: 14, height: 14 }} />
                  {routeInfo.distM < 1000
                    ? `${Math.round(routeInfo.distM)} m`
                    : `${(routeInfo.distM / 1000).toFixed(1)} km`}
                </span>
                <div
                  style={{ width: 1, height: 16, background: "#E5E5EA" }}
                />
                <span
                  className="flex items-center gap-1"
                  style={{ fontSize: 13, color: "#636366" }}
                >
                  <Clock style={{ width: 13, height: 13 }} />
                  {fmtWalk(routeInfo.durS)}
                </span>
                <button
                  onClick={clearRoute}
                  aria-label="Clear route"
                  style={{ marginLeft: 2 }}
                >
                  <X style={{ width: 14, height: 14, color: "#C7C7CC" }} />
                </button>
              </div>
            </div>
          )}

          {/* Bottom sheet */}
          <div
            className="absolute inset-x-0 z-[400] bg-white flex flex-col transition-[height] duration-300 ease-out"
            style={{
              bottom: TAB_H,
              height: sheetH,
              borderRadius: "20px 20px 0 0",
              boxShadow: "0 -2px 20px rgba(0,0,0,0.10)",
            }}
          >
            {/* Handle + header */}
            <button
              onClick={() => setSheetExpanded((v) => !v)}
              className="w-full shrink-0 flex flex-col items-center"
              style={{ paddingTop: 10, paddingBottom: 8 }}
              aria-label={sheetExpanded ? "Collapse" : "Expand sheet"}
            >
              <div
                className="rounded-full"
                style={{
                  width: 36,
                  height: 4,
                  background: "#D1D1D6",
                  marginBottom: 10,
                }}
              />
              <div className="w-full flex items-center justify-between px-4">
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#8E8E93",
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                  }}
                >
                  {filtered.length} Printer{filtered.length !== 1 ? "s" : ""}
                  {!userPos ? " · share location to sort" : ""}
                </span>
                <ChevronUp
                  style={{
                    width: 16,
                    height: 16,
                    color: "#C7C7CC",
                    transform: sheetExpanded ? "rotate(180deg)" : "none",
                    transition: "transform .3s",
                  }}
                />
              </div>
            </button>

            {/* Shop list */}
            <div
              className="flex-1 overflow-y-auto"
              style={{ padding: "4px 14px 12px" }}
            >
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-3 text-center">
                  <Printer style={{ width: 36, height: 36, color: "#D1D1D6" }} />
                  <p style={{ fontSize: 14, color: "#8E8E93", lineHeight: 1.5 }}>
                    {query
                      ? `No printers matching "${query}"`
                      : "No nearby printers found yet."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filtered.map((shop) => (
                    <ShopCard
                      key={shop.id}
                      shop={shop}
                      selected={selected?.id === shop.id}
                      onSelect={() => {
                        setSelected(shop);
                        setSheetExpanded(true);
                        mapRef.current?.flyTo(
                          [shop.latitude, shop.longitude],
                          16,
                          { duration: 0.8 }
                        );
                      }}
                      onDirections={() => getDirections(shop)}
                      onShare={() => shareShop(shop)}
                      routing={routing && selected?.id === shop.id}
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
        <div
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: TAB_H + 12 }}
        >
          {/* Sort hint */}
          <div
            className="flex items-center justify-between"
            style={{ padding: "12px 16px 8px" }}
          >
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

          {/* Cards */}
          <div style={{ padding: "0 14px 24px" }} className="space-y-3">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center py-20 gap-4 text-center">
                <Printer style={{ width: 48, height: 48, color: "#D1D1D6" }} />
                <p style={{ fontSize: 15, color: "#8E8E93" }}>
                  {query
                    ? `No printers matching "${query}"`
                    : "No nearby printers available."}
                </p>
              </div>
            ) : (
              filtered.map((shop) => (
                <ShopCard
                  key={shop.id}
                  shop={shop}
                  selected={selected?.id === shop.id}
                  expanded
                  onSelect={() => {
                    setSelected(shop);
                    setViewMode("map");
                    setTimeout(
                      () =>
                        mapRef.current?.flyTo(
                          [shop.latitude, shop.longitude],
                          16,
                          { duration: 0.8 }
                        ),
                      120
                    );
                  }}
                  onDirections={() => {
                    setViewMode("map");
                    setTimeout(() => getDirections(shop), 180);
                  }}
                  onShare={() => shareShop(shop)}
                  routing={routing && selected?.id === shop.id}
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
            bottom: TAB_H + 12,
            padding: "12px 14px",
            borderRadius: 16,
            background: toast.kind === "ok" ? "#0C831F" : "#1C1C1E",
            boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
            animation: "fadeSlideUp .22s ease",
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {toast.kind === "ok" ? (
              <CheckCircle2 style={{ width: 16, height: 16, color: "#A8F0B8", flexShrink: 0 }} />
            ) : (
              <AlertCircle style={{ width: 16, height: 16, color: "#FFB800", flexShrink: 0 }} />
            )}
            <span
              className="truncate"
              style={{ fontSize: 14, color: "white", fontWeight: 400 }}
            >
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
