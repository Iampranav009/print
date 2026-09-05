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
  Map,
  Printer,
  ChevronUp,
  ChevronDown,
  AlertCircle,
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

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

function formatDistance(km: number | null): string {
  if (km === null) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function createShopMarkerEl(selected: boolean): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = "cursor:pointer;";
  el.innerHTML = `
    <div style="
      background:${selected ? "#0C831F" : "#1a1a2e"};
      width:${selected ? "46px" : "38px"};
      height:${selected ? "46px" : "38px"};
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid white;
      box-shadow:0 3px 10px rgba(0,0,0,${selected ? "0.35" : "0.22"});
      display:flex;
      align-items:center;
      justify-content:center;
      transition:all 0.2s ease;
    ">
      <span style="transform:rotate(45deg);font-size:${selected ? "20px" : "16px"}">🖨️</span>
    </div>`;
  return el;
}

function createUserMarkerEl(): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = `
    <div style="position:relative;width:22px;height:22px">
      <div style="position:absolute;inset:-8px;background:rgba(66,133,244,0.18);border-radius:50%;animation:userPulse 2s ease-in-out infinite"></div>
      <div style="position:absolute;inset:0;background:#4285F4;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(66,133,244,0.5)"></div>
    </div>`;
  return el;
}

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
      className={`rounded-2xl border transition-all p-3.5 cursor-pointer ${
        selected
          ? "border-[#0C831F] bg-green-50 shadow-sm"
          : "border-gray-100 bg-white hover:border-gray-200 active:bg-gray-50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg ${
              selected ? "bg-[#0C831F]" : "bg-gray-100"
            }`}
          >
            🖨️
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
              {shop.name}
            </p>
            {shop.location && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                {shop.location}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              {shop.distance_km !== null && (
                <span className="text-xs font-bold text-[#0C831F]">
                  {formatDistance(shop.distance_km)} away
                </span>
              )}
              {shop.virtual_mode && (
                <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                  Demo
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
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

      {(selected || expanded) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDirections();
          }}
          disabled={loadingRoute}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0C831F] hover:bg-[#0a6b19] active:bg-[#085517] text-white text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm"
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
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeRoute, setActiveRoute] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const hasToken = MAPBOX_TOKEN.length > 0;

  /* ── Init Mapbox ── */
  useEffect(() => {
    if (!mapContainer.current || !hasToken) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [78.9629, 20.5937],
      zoom: 4,
      attributionControl: false,
    });

    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-left"
    );
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    map.on("load", () => {
      mapRef.current = map;
      setMapLoaded(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [hasToken]);

  /* ── Fetch shops (initial) ── */
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

  /* ── Re-fetch with user coords for distance sort ── */
  const fetchWithLocation = useCallback((lng: number, lat: number) => {
    fetch(`/api/shops/nearby?lat=${lat}&lng=${lng}&radius=50`)
      .then((r) => r.json())
      .then((d) => {
        const list: NearbyShop[] = d.shops ?? [];
        setShops(list);
      })
      .catch(() => {});
  }, []);

  /* ── Search filter ── */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredShops(shops);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFilteredShops(
      shops.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.location?.toLowerCase().includes(q) ?? false)
      )
    );
  }, [searchQuery, shops]);

  /* ── Add/update shop markers ── */
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
        map.flyTo({
          center: [shop.longitude, shop.latitude],
          zoom: 15,
          duration: 1000,
        });
      });

      shopMarkersRef.current[shop.id] = marker;
    });

    /* Fit map to show all shops if any exist and user location not set */
    if (shops.length > 0 && !userLocation) {
      const lngs = shops.map((s) => s.longitude);
      const lats = shops.map((s) => s.latitude);
      const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
      const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
      map.fitBounds([sw, ne], { padding: 80, maxZoom: 14, duration: 1200 });
    }
  }, [shops, mapLoaded, userLocation]);

  /* ── Reflect selected state on markers ── */
  useEffect(() => {
    Object.entries(shopMarkersRef.current).forEach(([id, marker]) => {
      const el = marker.getElement();
      const inner = el.querySelector("div") as HTMLElement | null;
      if (!inner) return;
      const sel = id === selectedShop?.id;
      inner.style.background = sel ? "#0C831F" : "#1a1a2e";
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
        const coords: [number, number] = [
          pos.coords.longitude,
          pos.coords.latitude,
        ];
        setUserLocation(coords);
        setLoadingLocation(false);
        fetchWithLocation(coords[0], coords[1]);

        const map = mapRef.current;
        if (!map) return;

        userMarkerRef.current?.remove();
        const el = createUserMarkerEl();
        userMarkerRef.current = new mapboxgl.Marker({
          element: el,
          anchor: "center",
        })
          .setLngLat(coords)
          .addTo(map);

        map.flyTo({ center: coords, zoom: 13, duration: 1500 });
      },
      (err) => {
        setErrorMsg(`Location unavailable: ${err.message}`);
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [fetchWithLocation]);

  /* ── Get walking directions via Mapbox Directions API ── */
  const getDirections = useCallback(
    async (shop: NearbyShop) => {
      if (!userLocation) {
        getUserLocation();
        setErrorMsg("Please allow location access to get directions.");
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

        const geometry = data.routes[0].geometry as { type: string; coordinates: [number, number][] };

        if (map.getLayer("route-line")) map.removeLayer("route-line");
        if (map.getLayer("route-casing")) map.removeLayer("route-casing");
        if (map.getSource("route")) map.removeSource("route");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: geometry.coordinates },
          },
        } as any);
        map.addLayer({
          id: "route-casing",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#ffffff",
            "line-width": 9,
            "line-opacity": 0.85,
          },
        });
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#0C831F",
            "line-width": 5,
            "line-opacity": 0.95,
          },
        });

        setActiveRoute(true);

        const coords = geometry.coordinates;
        const lngs = coords.map((c) => c[0]);
        const lats = coords.map((c) => c[1]);
        const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
        const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
        map.fitBounds([sw, ne], { padding: { top: 80, bottom: 260, left: 40, right: 40 }, duration: 1500 });
      } catch {
        setErrorMsg("Failed to load route. Please try again.");
      } finally {
        setLoadingRoute(false);
      }
    },
    [userLocation, getUserLocation]
  );

  /* ── Clear route ── */
  const clearRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer("route-line")) map.removeLayer("route-line");
    if (map.getLayer("route-casing")) map.removeLayer("route-casing");
    if (map.getSource("route")) map.removeSource("route");
    setActiveRoute(false);
  }, []);

  /* ── Share shop location ── */
  const shareShop = useCallback(async (shop: NearbyShop) => {
    const mapsUrl = `https://maps.google.com/maps?q=${shop.latitude},${shop.longitude}`;
    const text = `Check out ${shop.name}${shop.location ? ` – ${shop.location}` : ""} on PrintBuddy!`;

    try {
      if (navigator.share) {
        await navigator.share({ title: shop.name, text, url: mapsUrl });
      } else {
        await navigator.clipboard.writeText(`${text}\n${mapsUrl}`);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2500);
      }
    } catch {
      /* user cancelled share — ignore */
    }
  }, []);

  /* Auto-request location on mount */
  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  /* ── No-token fallback ── */
  if (!hasToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-6 text-center pb-24 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
          <MapPin className="w-8 h-8 text-amber-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Map setup required</h2>
          <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
            Add{" "}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-700">
              NEXT_PUBLIC_MAPBOX_TOKEN
            </code>{" "}
            to your environment to enable the interactive nearby map.
          </p>
        </div>
      </div>
    );
  }

  /* ── Main UI ── */
  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      {/* ── Top search bar ── */}
      <div className="px-4 pt-4 pb-2 bg-white z-20 relative shadow-[0_1px_0_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search printer shops by name…"
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
          <button
            onClick={() => setViewMode((v) => (v === "map" ? "list" : "map"))}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition-colors shrink-0"
            aria-label={viewMode === "map" ? "Switch to list view" : "Switch to map view"}
          >
            {viewMode === "map" ? (
              <List className="w-4 h-4" />
            ) : (
              <Map className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {viewMode === "map" ? "List" : "Map"}
            </span>
          </button>
        </div>
      </div>

      {viewMode === "map" ? (
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* ── Mapbox container ── */}
          <div
            ref={mapContainer}
            className="flex-1"
            style={{ minHeight: 0 }}
          />

          {/* ── My Location FAB ── */}
          <button
            onClick={getUserLocation}
            disabled={loadingLocation}
            className="absolute z-10 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center transition-colors hover:bg-gray-50 active:bg-gray-100"
            style={{ bottom: sheetExpanded ? "calc(62vh + 1rem)" : "calc(220px + 1rem)", right: "1rem", width: "44px", height: "44px" }}
            aria-label="Center on my location"
          >
            <Locate
              className={`w-5 h-5 ${
                loadingLocation
                  ? "animate-spin text-[#0C831F]"
                  : userLocation
                  ? "text-[#0C831F]"
                  : "text-gray-600"
              }`}
            />
          </button>

          {/* ── Clear route banner ── */}
          {activeRoute && (
            <button
              onClick={clearRoute}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white rounded-full px-4 py-2 shadow-md text-xs font-semibold text-gray-700 border border-gray-100 flex items-center gap-2 hover:bg-gray-50"
            >
              <X className="w-3.5 h-3.5 text-gray-500" />
              Clear route
            </button>
          )}

          {/* ── Bottom sheet ── */}
          <div
            className="absolute bottom-0 inset-x-0 z-10 bg-white rounded-t-3xl shadow-[0_-6px_24px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col transition-all duration-300"
            style={{ height: sheetExpanded ? "62vh" : "220px" }}
          >
            {/* Sheet handle */}
            <button
              onClick={() => setSheetExpanded((v) => !v)}
              className="w-full flex flex-col items-center pt-3 pb-1 gap-1 shrink-0"
              aria-label={sheetExpanded ? "Collapse list" : "Expand list"}
            >
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
              <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-400">
                {sheetExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronUp className="w-3 h-3" />
                )}
                {filteredShops.length} Nearby Printer
                {filteredShops.length !== 1 ? "s" : ""}
              </div>
            </button>

            {/* Shop list */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2.5">
              {filteredShops.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center gap-3">
                  <Printer className="w-10 h-10 text-gray-200" />
                  <p className="text-sm text-gray-400">
                    {searchQuery
                      ? `No printers matching "${searchQuery}"`
                      : "No nearby printers found.\nPartners can add their location from the vendor portal."}
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
                      mapRef.current?.flyTo({
                        center: [shop.longitude, shop.latitude],
                        zoom: 15,
                        duration: 1000,
                      });
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
      ) : (
        /* ── List view ── */
        <div className="flex-1 overflow-y-auto pb-24">
          <div className="px-4 pt-3 pb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {filteredShops.length} Printer
              {filteredShops.length !== 1 ? "s" : ""} found
              {!userLocation ? " · Share location to sort by distance" : ""}
            </p>
          </div>
          <div className="px-4 space-y-3">
            {filteredShops.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center gap-3">
                <Printer className="w-14 h-14 text-gray-200" />
                <p className="text-sm text-gray-400">
                  {searchQuery
                    ? `No printers matching "${searchQuery}"`
                    : "No nearby printers available."}
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
                    setTimeout(
                      () =>
                        mapRef.current?.flyTo({
                          center: [shop.longitude, shop.latitude],
                          zoom: 15,
                        }),
                      150
                    );
                  }}
                  onDirections={() => {
                    setViewMode("map");
                    setTimeout(() => getDirections(shop), 150);
                  }}
                  onShare={() => shareShop(shop)}
                  loadingRoute={loadingRoute && selectedShop?.id === shop.id}
                  expanded
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Error toast ── */}
      {errorMsg && (
        <div className="fixed bottom-20 inset-x-4 z-50 bg-gray-900 text-white text-sm rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="shrink-0 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Share copied toast ── */}
      {shareSuccess && (
        <div className="fixed bottom-20 inset-x-4 z-50 bg-[#0C831F] text-white text-sm rounded-2xl px-4 py-3 text-center shadow-xl font-medium">
          Location link copied to clipboard!
        </div>
      )}

      {/* ── CSS for user location pulse ── */}
      <style>{`
        @keyframes userPulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
