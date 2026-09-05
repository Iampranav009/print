"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
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

type RouteInfo = {
  distanceM: number;
  durationS: number;
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

/* ── Helpers ── */
function formatDistance(km: number | null): string {
  if (km === null) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function formatWalkTime(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${mins} min walk`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m walk`;
}

/* ── Custom map marker elements ── */
function createShopMarkerEl(selected: boolean): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = "cursor:pointer;display:flex;align-items:flex-end;justify-content:center;";
  el.innerHTML = `
    <div style="
      background:${selected ? "#0C831F" : "#111827"};
      width:${selected ? "46px" : "38px"};
      height:${selected ? "46px" : "38px"};
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid white;
      box-shadow:0 4px 12px rgba(0,0,0,${selected ? "0.4" : "0.25"});
      display:flex;
      align-items:center;
      justify-content:center;
      transition:all 0.2s ease;
    ">
      <span style="transform:rotate(45deg);font-size:${selected ? "20px" : "16px"};line-height:1">🖨️</span>
    </div>`;
  return el;
}

function createUserMarkerEl(): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = "display:flex;align-items:center;justify-content:center;";
  el.innerHTML = `
    <div style="position:relative;width:22px;height:22px">
      <div style="position:absolute;inset:-10px;background:rgba(66,133,244,0.15);border-radius:50%;animation:userPulse 2.2s ease-in-out infinite"></div>
      <div style="position:absolute;inset:0;background:#4285F4;border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(66,133,244,0.55)"></div>
    </div>`;
  return el;
}

/* ── Tab bar height constant (matches TabBar component) ── */
const TAB_BAR_H = 64; // px — must match TabBar height

/* ── Shop card ── */
function ShopCard({
  shop,
  selected,
  onSelect,
  onDirections,
  onShare,
  loadingRoute,
  expanded,
}: {
  shop: NearbyShop;
  selected: boolean;
  onSelect: () => void;
  onDirections: () => void;
  onShare: () => void;
  loadingRoute?: boolean;
  expanded?: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={`rounded-2xl border transition-all p-3.5 cursor-pointer select-none ${
        selected
          ? "border-[#0C831F] bg-green-50/70 shadow-sm"
          : "border-gray-100 bg-white hover:border-gray-200 active:scale-[0.99]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Left: icon + info */}
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl transition-colors ${
              selected ? "bg-[#0C831F]" : "bg-gray-100"
            }`}
          >
            🖨️
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
              {shop.name}
            </p>
            {shop.location && (
              <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-1 leading-snug">
                {shop.location}
              </p>
            )}
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1.5">
              {shop.distance_km !== null && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0C831F]">
                  <Footprints className="w-3 h-3" />
                  {formatDistance(shop.distance_km)} away
                </span>
              )}
              {shop.virtual_mode && (
                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-100">
                  Demo
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors"
            aria-label="Share shop location"
          >
            <Share2 className="w-3.5 h-3.5 text-gray-600" />
          </button>
          {shop.contact_phone && (
            <a
              href={`tel:${shop.contact_phone}`}
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors"
              aria-label={`Call ${shop.name}`}
            >
              <Phone className="w-3.5 h-3.5 text-gray-600" />
            </a>
          )}
        </div>
      </div>

      {/* Get Directions button — shown when selected or in list/expanded view */}
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

/* ── Loading skeleton ── */
function MapSkeleton() {
  return (
    <div className="flex-1 flex flex-col bg-gray-100 animate-pulse relative overflow-hidden">
      {/* Fake map tiles */}
      <div className="flex-1 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200" />
      {/* Fake bottom sheet */}
      <div className="absolute bottom-16 inset-x-0 bg-white rounded-t-3xl shadow-lg h-[200px] px-4 pt-5 space-y-3">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
        <div className="h-4 w-32 bg-gray-200 rounded-full" />
        <div className="h-16 w-full bg-gray-100 rounded-2xl" />
        <div className="h-16 w-full bg-gray-100 rounded-2xl" />
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function NearbyMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const shopMarkersRef = useRef<Record<string, mapboxgl.Marker>>({});

  const [shops, setShops] = useState<NearbyShop[]>([]);
  const [filteredShops, setFilteredShops] = useState<NearbyShop[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedShop, setSelectedShop] = useState<NearbyShop | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [mapInitializing, setMapInitializing] = useState(true);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeRoute, setActiveRoute] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const hasToken = MAPBOX_TOKEN.length > 0;

  /* ── Init Mapbox map ── */
  useEffect(() => {
    if (!mapContainer.current || !hasToken) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [78.9629, 20.5937],
      zoom: 4,
      attributionControl: false,
      logoPosition: "bottom-left",
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      mapRef.current = map;
      setMapLoaded(true);
      setMapInitializing(false);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [hasToken]);

  /* ── Fetch all shops (no coords — for initial render) ── */
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

  /* ── Re-fetch with user coords to get distance-sorted results ── */
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
      shops.filter(
        (s) => s.name.toLowerCase().includes(q) || (s.location?.toLowerCase().includes(q) ?? false)
      )
    );
  }, [searchQuery, shops]);

  /* ── Place shop markers on the map ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    Object.values(shopMarkersRef.current).forEach((m) => m.remove());
    shopMarkersRef.current = {};

    shops.forEach((shop) => {
      const el = createShopMarkerEl(selectedShop?.id === shop.id);
      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([shop.longitude, shop.latitude])
        .addTo(map);

      el.addEventListener("click", () => {
        setSelectedShop(shop);
        setSheetExpanded(true);
        map.flyTo({ center: [shop.longitude, shop.latitude], zoom: 15, duration: 900 });
      });

      shopMarkersRef.current[shop.id] = marker;
    });

    if (shops.length > 0 && !userLocation) {
      if (shops.length === 1) {
        map.flyTo({ center: [shops[0].longitude, shops[0].latitude], zoom: 14, duration: 1200 });
      } else {
        const lngs = shops.map((s) => s.longitude);
        const lats = shops.map((s) => s.latitude);
        map.fitBounds(
          [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: { top: 80, bottom: TAB_BAR_H + 240, left: 48, right: 48 }, maxZoom: 14, duration: 1200 }
        );
      }
    }
  }, [shops, mapLoaded, userLocation]);

  /* ── Update marker style when selection changes ── */
  useEffect(() => {
    Object.entries(shopMarkersRef.current).forEach(([id, marker]) => {
      const inner = marker.getElement().querySelector("div") as HTMLElement | null;
      if (!inner) return;
      const sel = id === selectedShop?.id;
      inner.style.background = sel ? "#0C831F" : "#111827";
      inner.style.width = sel ? "46px" : "38px";
      inner.style.height = sel ? "46px" : "38px";
      const span = inner.querySelector("span") as HTMLElement | null;
      if (span) span.style.fontSize = sel ? "20px" : "16px";
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
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setUserLocation(coords);
        setLoadingLocation(false);
        fetchWithLocation(coords[0], coords[1]);

        const map = mapRef.current;
        if (!map) return;

        userMarkerRef.current?.remove();
        userMarkerRef.current = new mapboxgl.Marker({ element: createUserMarkerEl(), anchor: "center" })
          .setLngLat(coords)
          .addTo(map);

        map.flyTo({ center: coords, zoom: 14, duration: 1400 });
      },
      (err) => {
        setErrorMsg(`Location unavailable: ${err.message}`);
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [fetchWithLocation]);

  /* ── Get walking directions ── */
  const getDirections = useCallback(async (shop: NearbyShop) => {
    if (!userLocation) {
      getUserLocation();
      setErrorMsg("Allow location access first to get walking directions.");
      return;
    }
    const map = mapRef.current;
    if (!map) return;

    setLoadingRoute(true);
    setSelectedShop(shop);

    try {
      const url =
        `https://api.mapbox.com/directions/v5/mapbox/walking/` +
        `${userLocation[0]},${userLocation[1]};${shop.longitude},${shop.latitude}` +
        `?geometries=geojson&overview=full&steps=false&access_token=${MAPBOX_TOKEN}`;

      const res = await fetch(url);
      const data = await res.json();

      if (!data.routes?.[0]) {
        setErrorMsg("No walking route found to this printer.");
        return;
      }

      const route = data.routes[0] as { distance: number; duration: number; geometry: { type: string; coordinates: [number, number][] } };
      setRouteInfo({ distanceM: route.distance, durationS: route.duration });

      if (map.getLayer("route-line")) map.removeLayer("route-line");
      if (map.getLayer("route-casing")) map.removeLayer("route-casing");
      if (map.getSource("route")) map.removeSource("route");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any).addSource("route", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: route.geometry.coordinates } },
      });
      map.addLayer({ id: "route-casing", type: "line", source: "route", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#ffffff", "line-width": 9, "line-opacity": 0.9 } });
      map.addLayer({ id: "route-line", type: "line", source: "route", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#0C831F", "line-width": 5, "line-opacity": 1 } });

      setActiveRoute(true);

      const coords = route.geometry.coordinates;
      const lngs = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: { top: 80, bottom: TAB_BAR_H + 260, left: 48, right: 48 }, duration: 1400 }
      );
    } catch {
      setErrorMsg("Failed to load route. Please try again.");
    } finally {
      setLoadingRoute(false);
    }
  }, [userLocation, getUserLocation]);

  /* ── Clear route ── */
  const clearRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer("route-line")) map.removeLayer("route-line");
    if (map.getLayer("route-casing")) map.removeLayer("route-casing");
    if (map.getSource("route")) map.removeSource("route");
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
    } catch { /* user cancelled */ }
  }, []);

  /* Auto-request location on mount */
  useEffect(() => { getUserLocation(); }, [getUserLocation]);

  /* ── No-token placeholder ── */
  if (!hasToken) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center pb-20 gap-4">
        <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-100 flex items-center justify-center">
          <MapPin className="w-9 h-9 text-amber-500" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-gray-900">Map setup required</h2>
          <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
            Add <code className="bg-gray-100 px-1.5 py-0.5 rounded-md text-xs font-mono text-gray-700">NEXT_PUBLIC_MAPBOX_TOKEN</code> to <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-600">.env.local</code> and restart the server.
          </p>
        </div>
      </div>
    );
  }

  /* ── Map view content ── */
  const mapContent = (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Mapbox canvas */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Skeleton overlaid while map tiles load */}
      {mapInitializing && <MapSkeleton />}

      {/* My Location FAB — above the bottom sheet */}
      <button
        onClick={getUserLocation}
        disabled={loadingLocation}
        aria-label="Center on my location"
        className="absolute z-20 right-4 bg-white rounded-full shadow-lg border border-gray-100 w-11 h-11 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors"
        style={{ bottom: `calc(${sheetExpanded ? "62vh" : "220px"} + ${TAB_BAR_H + 16}px)` }}
      >
        <Locate
          className={`w-5 h-5 transition-colors ${
            loadingLocation ? "animate-spin text-[#0C831F]" : userLocation ? "text-[#0C831F]" : "text-gray-500"
          }`}
        />
      </button>

      {/* Route info pill — above the sheet */}
      {activeRoute && routeInfo && (
        <div
          className="absolute z-20 left-1/2 -translate-x-1/2 flex items-center gap-2"
          style={{ bottom: `calc(${sheetExpanded ? "62vh" : "220px"} + ${TAB_BAR_H + 12}px)` }}
        >
          <div className="bg-white rounded-full px-4 py-2 shadow-lg border border-gray-100 flex items-center gap-3 text-sm">
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

      {/* No-route clear button fallback (no duration shown yet) */}
      {activeRoute && !routeInfo && (
        <button
          onClick={clearRoute}
          className="absolute z-20 top-3 left-1/2 -translate-x-1/2 bg-white rounded-full px-4 py-2 shadow-md border border-gray-100 text-xs font-semibold text-gray-700 flex items-center gap-2"
        >
          <X className="w-3.5 h-3.5 text-gray-400" /> Clear route
        </button>
      )}

      {/* ── Bottom sheet ── */}
      <div
        className="absolute inset-x-0 z-20 bg-white rounded-t-3xl shadow-[0_-6px_28px_rgba(0,0,0,0.09)] flex flex-col transition-[height] duration-300 ease-in-out"
        style={{ bottom: `${TAB_BAR_H}px`, height: sheetExpanded ? "62vh" : "220px" }}
      >
        {/* Drag handle */}
        <button
          onClick={() => setSheetExpanded((v) => !v)}
          className="w-full shrink-0 flex flex-col items-center gap-1.5 pt-3 pb-2"
          aria-label={sheetExpanded ? "Collapse list" : "Expand list"}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
          <div className="flex items-center justify-between w-full px-4">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
              {filteredShops.length} Nearby Printer{filteredShops.length !== 1 ? "s" : ""}
              {!userLocation && " · enable location to sort"}
            </span>
            <ChevronUp
              className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${sheetExpanded ? "rotate-180" : ""}`}
            />
          </div>
        </button>

        {/* Card list */}
        <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-2.5">
          {filteredShops.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <Printer className="w-10 h-10 text-gray-200" />
              <p className="text-sm text-gray-400 leading-relaxed">
                {searchQuery
                  ? `No printers matching "${searchQuery}"`
                  : "No nearby printers found.\nPartners add their location via the vendor portal."}
              </p>
            </div>
          ) : (
            filteredShops.map((shop) => (
              <ShopCard
                key={shop.id}
                shop={shop}
                selected={selectedShop?.id === shop.id}
                onSelect={() => {
                  setSelectedShop(shop);
                  mapRef.current?.flyTo({ center: [shop.longitude, shop.latitude], zoom: 15, duration: 900 });
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

  /* ── List view content ── */
  const listContent = (
    <div className="flex-1 overflow-y-auto pb-4">
      {/* Section header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
          {filteredShops.length} Printer{filteredShops.length !== 1 ? "s" : ""} found
        </p>
        {!userLocation && (
          <button
            onClick={getUserLocation}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0C831F]"
          >
            <Locate className="w-3 h-3" />
            Sort by distance
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
              key={shop.id}
              shop={shop}
              selected={selectedShop?.id === shop.id}
              onSelect={() => {
                setSelectedShop(shop);
                setViewMode("map");
                setTimeout(() => mapRef.current?.flyTo({ center: [shop.longitude, shop.latitude], zoom: 15 }), 150);
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

  /* ── Full page layout ── */
  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">

      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3 bg-white z-30 relative">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Nearby Printers</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {userLocation
                ? `${shops.length} shop${shops.length !== 1 ? "s" : ""} within 50 km`
                : "Find print shops near you"}
            </p>
          </div>
          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "map" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" /> Map
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by shop or landmark name…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-gray-100 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#0C831F] transition-shadow"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      {viewMode === "map" ? mapContent : listContent}

      {/* ── Error toast ── */}
      {errorMsg && (
        <div className="fixed inset-x-4 z-50 bg-gray-900 text-white text-sm rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-2xl" style={{ bottom: `${TAB_BAR_H + 12}px` }}>
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="leading-snug truncate">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="shrink-0 text-gray-400 hover:text-white" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Share success toast ── */}
      {shareSuccess && (
        <div className="fixed inset-x-4 z-50 bg-[#0C831F] text-white text-sm rounded-2xl px-4 py-3 flex items-center justify-center gap-2 shadow-2xl font-semibold" style={{ bottom: `${TAB_BAR_H + 12}px` }}>
          <CheckCircle2 className="w-4 h-4" />
          Location link copied!
        </div>
      )}

      {/* Pulse animation for user location dot */}
      <style>{`
        @keyframes userPulse {
          0%, 100% { transform: scale(1); opacity: 0.45; }
          50% { transform: scale(1.9); opacity: 0; }
        }
        .mapboxgl-ctrl-top-right { top: 0 !important; right: 0 !important; margin: 12px 12px 0 0 !important; }
      `}</style>
    </div>
  );
}
