"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Search,
  Navigation,
  Share2,
  MapPin,
  Phone,
  X,
  Locate,
  List,
  Map as MapIcon,
  Printer,
  ChevronUp,
  AlertCircle,
  Clock,
  Footprints,
  CheckCircle2,
} from "lucide-react";

type NearbyShop = {
  id: string;
  name: string;
  location: string | null;
  latitude: number;
  longitude: number;
  contact_phone: string | null;
  distance_km: number | null;
  virtual_mode: boolean;
};

type RouteInfo = { distanceM: number; durationS: number };

/* ── Helpers ── */
function formatDistance(km: number | null): string {
  if (km === null) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function formatWalkTime(s: number): string {
  const mins = Math.round(s / 60);
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${mins} min walk`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m walk`;
}

/* ── Leaflet custom marker icon factories ── */
function shopIcon(selected: boolean): L.DivIcon {
  const size = selected ? 46 : 38;
  const fs = selected ? 20 : 16;
  const bg = selected ? "#0C831F" : "#111827";
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    html: `<div style="
      background:${bg};
      width:${size}px;height:${size}px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid white;
      box-shadow:0 4px 12px rgba(0,0,0,${selected ? 0.4 : 0.25});
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;transition:all .2s ease;">
      <span style="transform:rotate(45deg);font-size:${fs}px;line-height:1">🖨️</span>
    </div>`,
  });
}

const userIcon = L.divIcon({
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `<div style="position:relative;width:22px;height:22px">
    <div style="position:absolute;inset:-10px;background:rgba(66,133,244,0.15);border-radius:50%;animation:userPulse 2.2s ease-in-out infinite"></div>
    <div style="position:absolute;inset:0;background:#4285F4;border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(66,133,244,0.55)"></div>
  </div>`,
});

/* ── TabBar height constant (matches TabBar component) ── */
const TAB_BAR_H = 64;

/* ── Map skeleton shown while tiles load ── */
function MapSkeleton() {
  return (
    <div className="absolute inset-0 bg-gray-100 animate-pulse z-10 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200" />
    </div>
  );
}

/* ── Shop card ── */
function ShopCard({
  shop, selected, onSelect, onDirections, onShare, loadingRoute, expanded,
}: {
  shop: NearbyShop; selected: boolean; onSelect: () => void;
  onDirections: () => void; onShare: () => void;
  loadingRoute?: boolean; expanded?: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      role="button" tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={`rounded-2xl border transition-all p-3.5 cursor-pointer select-none ${
        selected
          ? "border-[#0C831F] bg-green-50/70 shadow-sm"
          : "border-gray-100 bg-white hover:border-gray-200 active:scale-[0.99]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl transition-colors ${selected ? "bg-[#0C831F]" : "bg-gray-100"}`}>
            🖨️
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{shop.name}</p>
            {shop.location && (
              <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-1 leading-snug">{shop.location}</p>
            )}
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1.5">
              {shop.distance_km !== null && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0C831F]">
                  <Footprints className="w-3 h-3" />
                  {formatDistance(shop.distance_km)} away
                </span>
              )}
              {shop.virtual_mode && (
                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-100">Demo</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors"
            aria-label="Share shop location"
          >
            <Share2 className="w-3.5 h-3.5 text-gray-600" />
          </button>
          {shop.contact_phone && (
            <a href={`tel:${shop.contact_phone}`} onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label={`Call ${shop.name}`}>
              <Phone className="w-3.5 h-3.5 text-gray-600" />
            </a>
          )}
        </div>
      </div>
      {(selected || expanded) && (
        <button
          onClick={(e) => { e.stopPropagation(); onDirections(); }}
          disabled={loadingRoute}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0C831F] hover:bg-[#0a6b19] active:bg-[#085517] text-white text-sm font-semibold transition-all disabled:opacity-60 shadow-sm"
        >
          <Navigation className="w-4 h-4" />
          {loadingRoute ? "Finding route…" : "Get Directions"}
        </button>
      )}
    </div>
  );
}

/* ── Main component ── */
export default function NearbyMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const shopMarkersRef = useRef<Record<string, L.Marker>>({});
  const routeLayerRef = useRef<L.Polyline | null>(null);

  const [shops, setShops] = useState<NearbyShop[]>([]);
  const [filteredShops, setFilteredShops] = useState<NearbyShop[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null); // [lng, lat]
  const [selectedShop, setSelectedShop] = useState<NearbyShop | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [tilesLoading, setTilesLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [mapReady, setMapReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeRoute, setActiveRoute] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  /* ── Init Leaflet map ── */
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // Fix leaflet default icon path issue (not needed since we use divIcons, but safe)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;

    const map = L.map(mapContainer.current, {
      center: [20.5937, 78.9629], // India
      zoom: 5,
      zoomControl: false,
      attributionControl: true,
    });

    // Zoom control top-right
    L.control.zoom({ position: "topright" }).addTo(map);

    // CARTO Voyager tiles — free, no API key, Google Maps-like style
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        subdomains: "abcd",
        maxZoom: 20,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> © <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
      }
    ).addTo(map);

    map.on("load", () => setTilesLoading(false));
    // Fallback: hide skeleton after short delay
    setTimeout(() => setTilesLoading(false), 1800);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /* ── Fetch shops (no location — initial load) ── */
  useEffect(() => {
    fetch("/api/shops/nearby")
      .then((r) => r.json())
      .then((d) => {
        const list: NearbyShop[] = d.shops ?? [];
        setShops(list);
        setFilteredShops(list);
      })
      .catch(() => setErrorMsg("Failed to load nearby shops."));
  }, []);

  /* ── Re-fetch with user coords for distance sorting ── */
  const fetchWithLocation = useCallback((lng: number, lat: number) => {
    fetch(`/api/shops/nearby?lat=${lat}&lng=${lng}&radius=50`)
      .then((r) => r.json())
      .then((d) => setShops(d.shops ?? []))
      .catch(() => {});
  }, []);

  /* ── Search filter ── */
  useEffect(() => {
    if (!searchQuery.trim()) { setFilteredShops(shops); return; }
    const q = searchQuery.toLowerCase();
    setFilteredShops(
      shops.filter((s) => s.name.toLowerCase().includes(q) || (s.location?.toLowerCase().includes(q) ?? false))
    );
  }, [searchQuery, shops]);

  /* ── Place/update shop markers ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Remove old markers
    Object.values(shopMarkersRef.current).forEach((m) => m.remove());
    shopMarkersRef.current = {};

    // Add markers
    shops.forEach((shop) => {
      const marker = L.marker([shop.latitude, shop.longitude], {
        icon: shopIcon(selectedShop?.id === shop.id),
      }).addTo(map);

      marker.on("click", () => {
        setSelectedShop(shop);
        setSheetExpanded(true);
        map.flyTo([shop.latitude, shop.longitude], 16, { duration: 0.9 });
      });

      shopMarkersRef.current[shop.id] = marker;
    });

    // Fit map to all shops on first load
    if (shops.length > 0 && !userLocation) {
      if (shops.length === 1) {
        map.flyTo([shops[0].latitude, shops[0].longitude], 15, { duration: 1 });
      } else {
        const bounds = L.latLngBounds(shops.map((s) => [s.latitude, s.longitude] as [number, number]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
      }
    }
  }, [shops, mapReady, userLocation]);

  /* ── Update icon style when selected shop changes ── */
  useEffect(() => {
    Object.entries(shopMarkersRef.current).forEach(([id, marker]) => {
      marker.setIcon(shopIcon(id === selectedShop?.id));
    });
  }, [selectedShop]);

  /* ── Get user GPS location ── */
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lng = pos.coords.longitude;
        const lat = pos.coords.latitude;
        setUserLocation([lng, lat]);
        setLoadingLocation(false);
        fetchWithLocation(lng, lat);

        const map = mapRef.current;
        if (!map) return;

        userMarkerRef.current?.remove();
        userMarkerRef.current = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
        map.flyTo([lat, lng], 14, { duration: 1.4 });
      },
      (err) => {
        setErrorMsg(`Location unavailable: ${err.message}`);
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [fetchWithLocation]);

  /* ── Get walking directions via OSRM (free, no API key) ── */
  const getDirections = useCallback(async (shop: NearbyShop) => {
    if (!userLocation) {
      getUserLocation();
      setErrorMsg("Allow location access to get walking directions.");
      return;
    }
    const map = mapRef.current;
    if (!map) return;

    setLoadingRoute(true);
    setSelectedShop(shop);

    try {
      const [ulng, ulat] = userLocation;
      // OSRM public demo — completely free, no API key
      const url =
        `https://router.project-osrm.org/route/v1/foot/` +
        `${ulng},${ulat};${shop.longitude},${shop.latitude}` +
        `?overview=full&geometries=geojson`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.code !== "Ok" || !data.routes?.[0]) {
        setErrorMsg("No walking route found to this printer.");
        return;
      }

      const route = data.routes[0] as {
        distance: number;
        duration: number;
        geometry: { coordinates: [number, number][] };
      };

      setRouteInfo({ distanceM: route.distance, durationS: route.duration });

      // Remove old route
      routeLayerRef.current?.remove();

      // OSRM returns [lng, lat]; Leaflet needs [lat, lng]
      const latlngs = route.geometry.coordinates.map(
        ([lng, lat]) => [lat, lng] as [number, number]
      );

      // Draw casing (white outline) + line
      L.polyline(latlngs, { color: "#ffffff", weight: 9, opacity: 0.9, lineCap: "round", lineJoin: "round" }).addTo(map);
      routeLayerRef.current = L.polyline(latlngs, {
        color: "#0C831F",
        weight: 5,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      setActiveRoute(true);

      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds, {
        paddingTopLeft: [40, 80],
        paddingBottomRight: [40, sheetExpanded ? window.innerHeight * 0.62 + TAB_BAR_H + 20 : 240 + TAB_BAR_H + 20],
      });
    } catch {
      setErrorMsg("Failed to load route. Please try again.");
    } finally {
      setLoadingRoute(false);
    }
  }, [userLocation, getUserLocation, sheetExpanded]);

  /* ── Clear route ── */
  const clearRoute = useCallback(() => {
    routeLayerRef.current?.remove();
    routeLayerRef.current = null;
    setActiveRoute(false);
    setRouteInfo(null);
  }, []);

  /* ── Share shop location ── */
  const shareShop = useCallback(async (shop: NearbyShop) => {
    const mapsUrl = `https://maps.google.com/maps?q=${shop.latitude},${shop.longitude}`;
    const text = `${shop.name}${shop.location ? ` – ${shop.location}` : ""} on PrintBuddy`;
    try {
      if (navigator.share) {
        await navigator.share({ title: shop.name, text, url: mapsUrl });
      } else {
        await navigator.clipboard.writeText(`${text}\n${mapsUrl}`);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2500);
      }
    } catch { /* cancelled */ }
  }, []);

  /* Auto-request location on mount */
  useEffect(() => { getUserLocation(); }, [getUserLocation]);

  /* ── Map view ── */
  const mapContent = (
    <div className="flex-1 overflow-hidden relative" style={{ minHeight: 0 }}>
      {/* Leaflet canvas */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Loading skeleton */}
      {tilesLoading && <MapSkeleton />}

      {/* My Location FAB */}
      <button
        onClick={getUserLocation}
        disabled={loadingLocation}
        aria-label="Center on my location"
        className="absolute z-[500] right-4 bg-white rounded-full shadow-lg border border-gray-100 w-11 h-11 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors"
        style={{ bottom: `calc(${sheetExpanded ? "62vh" : "220px"} + ${TAB_BAR_H + 16}px)` }}
      >
        <Locate className={`w-5 h-5 transition-colors ${loadingLocation ? "animate-spin text-[#0C831F]" : userLocation ? "text-[#0C831F]" : "text-gray-500"}`} />
      </button>

      {/* Route info pill */}
      {activeRoute && routeInfo && (
        <div
          className="absolute z-[500] left-1/2 -translate-x-1/2"
          style={{ bottom: `calc(${sheetExpanded ? "62vh" : "220px"} + ${TAB_BAR_H + 12}px)` }}
        >
          <div className="bg-white rounded-full px-4 py-2 shadow-lg border border-gray-100 flex items-center gap-3 text-sm whitespace-nowrap">
            <span className="flex items-center gap-1.5 font-bold text-[#0C831F]">
              <Navigation className="w-3.5 h-3.5" />
              {routeInfo.distanceM < 1000
                ? `${Math.round(routeInfo.distanceM)} m`
                : `${(routeInfo.distanceM / 1000).toFixed(1)} km`}
            </span>
            <span className="text-gray-300">·</span>
            <span className="flex items-center gap-1 text-gray-600">
              <Clock className="w-3.5 h-3.5" />
              {formatWalkTime(routeInfo.durationS)}
            </span>
            <button onClick={clearRoute} className="ml-1 text-gray-400 hover:text-gray-700" aria-label="Clear route">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Clear route (no info yet) */}
      {activeRoute && !routeInfo && (
        <button
          onClick={clearRoute}
          className="absolute z-[500] top-3 left-1/2 -translate-x-1/2 bg-white rounded-full px-4 py-2 shadow-md border border-gray-100 text-xs font-semibold text-gray-700 flex items-center gap-2"
        >
          <X className="w-3.5 h-3.5 text-gray-400" /> Clear route
        </button>
      )}

      {/* Bottom sheet */}
      <div
        className="absolute inset-x-0 z-[400] bg-white rounded-t-3xl shadow-[0_-6px_28px_rgba(0,0,0,0.09)] flex flex-col transition-[height] duration-300 ease-in-out"
        style={{ bottom: `${TAB_BAR_H}px`, height: sheetExpanded ? "62vh" : "220px" }}
      >
        {/* Drag handle + title */}
        <button
          onClick={() => setSheetExpanded((v) => !v)}
          className="w-full shrink-0 flex flex-col items-center gap-1.5 pt-3 pb-2"
          aria-label={sheetExpanded ? "Collapse" : "Expand"}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
          <div className="flex items-center justify-between w-full px-4">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
              {filteredShops.length} Nearby Printer{filteredShops.length !== 1 ? "s" : ""}
              {!userLocation ? " · enable location to sort" : ""}
            </span>
            <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${sheetExpanded ? "rotate-180" : ""}`} />
          </div>
        </button>

        <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-2.5">
          {filteredShops.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <Printer className="w-10 h-10 text-gray-200" />
              <p className="text-sm text-gray-400 leading-relaxed">
                {searchQuery ? `No printers matching "${searchQuery}"` : "No nearby printers found.\nPartners add their location via the vendor portal."}
              </p>
            </div>
          ) : (
            filteredShops.map((shop) => (
              <ShopCard
                key={shop.id} shop={shop}
                selected={selectedShop?.id === shop.id}
                onSelect={() => {
                  setSelectedShop(shop);
                  mapRef.current?.flyTo([shop.latitude, shop.longitude], 16, { duration: 0.9 });
                }}
                onDirections={() => getDirections(shop)}
                onShare={() => shareShop(shop)}
                loadingRoute={loadingRoute && selectedShop?.id === shop.id}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );

  /* ── List view ── */
  const listContent = (
    <div className="flex-1 overflow-y-auto pb-4">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
          {filteredShops.length} Printer{filteredShops.length !== 1 ? "s" : ""} found
        </p>
        {!userLocation && (
          <button onClick={getUserLocation} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0C831F]">
            <Locate className="w-3 h-3" /> Sort by distance
          </button>
        )}
      </div>
      <div className="px-4 space-y-3 pb-6">
        {filteredShops.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <Printer className="w-14 h-14 text-gray-200" />
            <p className="text-sm text-gray-400">
              {searchQuery ? `No printers matching "${searchQuery}"` : "No nearby printers available."}
            </p>
          </div>
        ) : (
          filteredShops.map((shop) => (
            <ShopCard
              key={shop.id} shop={shop}
              selected={selectedShop?.id === shop.id}
              onSelect={() => {
                setSelectedShop(shop);
                setViewMode("map");
                setTimeout(() => mapRef.current?.flyTo([shop.latitude, shop.longitude], 16, { duration: 0.9 }), 150);
              }}
              onDirections={() => { setViewMode("map"); setTimeout(() => getDirections(shop), 200); }}
              onShare={() => shareShop(shop)}
              loadingRoute={loadingRoute && selectedShop?.id === shop.id}
              expanded
            />
          ))
        )}
      </div>
    </div>
  );

  /* ── Full page ── */
  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-white z-30 relative shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Nearby Printers</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {userLocation
                ? `${shops.length} shop${shops.length !== 1 ? "s" : ""} within 50 km`
                : "Find print shops near you"}
            </p>
          </div>
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === "map" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
            >
              <MapIcon className="w-3.5 h-3.5" /> Map
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="search" value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by shop or landmark name…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-gray-100 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#0C831F] transition-shadow"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {viewMode === "map" ? mapContent : listContent}

      {/* Error toast */}
      {errorMsg && (
        <div className="fixed inset-x-4 z-[600] bg-gray-900 text-white text-sm rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-2xl" style={{ bottom: `${TAB_BAR_H + 12}px` }}>
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="leading-snug truncate">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="shrink-0 text-gray-400 hover:text-white" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Share success toast */}
      {shareSuccess && (
        <div className="fixed inset-x-4 z-[600] bg-[#0C831F] text-white text-sm rounded-2xl px-4 py-3 flex items-center justify-center gap-2 shadow-2xl font-semibold" style={{ bottom: `${TAB_BAR_H + 12}px` }}>
          <CheckCircle2 className="w-4 h-4" /> Location link copied!
        </div>
      )}

      {/* User location pulse animation */}
      <style>{`
        @keyframes userPulse {
          0%,100% { transform:scale(1); opacity:.45; }
          50% { transform:scale(1.9); opacity:0; }
        }
        .leaflet-control-zoom { border:none !important; box-shadow:0 2px 8px rgba(0,0,0,0.15) !important; border-radius:12px !important; overflow:hidden; }
        .leaflet-control-zoom a { width:36px !important; height:36px !important; line-height:36px !important; font-size:18px !important; color:#374151 !important; background:white !important; }
        .leaflet-control-zoom a:hover { background:#f9fafb !important; }
        .leaflet-control-zoom-in { border-bottom:1px solid #f3f4f6 !important; }
        .leaflet-control-attribution { font-size:9px !important; }
      `}</style>
    </div>
  );
}
