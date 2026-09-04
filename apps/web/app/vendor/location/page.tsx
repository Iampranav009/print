"use client";

import { useState, useEffect } from "react";
import { Locate, Save, MapPin, ExternalLink, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

type ShopData = {
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
};

function Toast({ message, type, onDismiss }: { message: string; type: "success" | "error"; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium ${
        type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
      }`}
      role="alert"
      aria-live="polite"
    >
      {type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
      {message}
    </div>
  );
}

export default function LocationPage() {
  const [saved, setSaved] = useState<ShopData>({ latitude: null, longitude: null, google_place_id: null });
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/vendor/me");
        if (res.ok) {
          const data = await res.json();
          if (data.shop) {
            setSaved({
              latitude: data.shop.latitude,
              longitude: data.shop.longitude,
              google_place_id: data.shop.google_place_id,
            });
            setLat(data.shop.latitude?.toString() ?? "");
            setLng(data.shop.longitude?.toString() ?? "");
            setPlaceId(data.shop.google_place_id ?? "");
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGeoLoading(false);
      },
      (err) => {
        setGeoError(err.message);
        setGeoLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (isNaN(latitude) || isNaN(longitude)) {
      setToast({ message: "Enter valid latitude and longitude.", type: "error" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/vendor/shop", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude,
          longitude,
          google_place_id: placeId.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save");
      }
      const updated = await res.json();
      setSaved({
        latitude: updated.shop?.latitude ?? latitude,
        longitude: updated.shop?.longitude ?? longitude,
        google_place_id: updated.shop?.google_place_id ?? null,
      });
      setToast({ message: "Location saved.", type: "success" });
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : "Failed to save", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 h-80 animate-pulse" />;
  }

  const mapsUrl =
    saved.latitude && saved.longitude
      ? `https://www.google.com/maps?q=${saved.latitude},${saved.longitude}`
      : null;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <div className="space-y-4">
        {/* Warning banner */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Customers need accurate coordinates to find your shop and see distance in the app.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left — form */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-5">Set printer location</h2>
            <form onSubmit={handleSave} className="space-y-5">
              {/* GPS button */}
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={geoLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                aria-label="Use my current location"
              >
                <Locate className={`w-4 h-4 ${geoLoading ? "animate-spin" : ""}`} />
                {geoLoading ? "Getting location…" : "Use my current location"}
              </button>

              {geoError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2" role="alert">
                  {geoError}
                </p>
              )}

              {/* Lat / Lng inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="lat" className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Latitude
                  </label>
                  <input
                    id="lat"
                    type="number"
                    step="0.000001"
                    min="-90"
                    max="90"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="19.076090"
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 tabular-nums"
                    aria-label="Latitude"
                  />
                </div>
                <div>
                  <label htmlFor="lng" className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Longitude
                  </label>
                  <input
                    id="lng"
                    type="number"
                    step="0.000001"
                    min="-180"
                    max="180"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="72.877426"
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 tabular-nums"
                    aria-label="Longitude"
                  />
                </div>
              </div>

              {/* Place ID */}
              <div>
                <label htmlFor="place-id" className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Google Place ID
                  <span className="ml-1.5 text-xs font-normal text-zinc-400">(optional)</span>
                </label>
                <input
                  id="place-id"
                  type="text"
                  value={placeId}
                  onChange={(e) => setPlaceId(e.target.value)}
                  placeholder="ChIJYXX..."
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  aria-label="Google Place ID (advanced, leave blank if unsure)"
                />
                <p className="mt-1 text-xs text-zinc-400">Advanced — leave blank if unsure.</p>
              </div>

              <button
                type="submit"
                disabled={saving || !lat || !lng}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                aria-label="Save printer location"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : "Save location"}
              </button>
            </form>
          </div>

          {/* Right — readout */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-700">Saved location</h3>
              {saved.latitude && saved.longitude ? (
                <>
                  <p className="text-sm font-medium text-zinc-900">
                    Printer is at{" "}
                    <span className="tabular-nums">{saved.latitude.toFixed(6)}, {saved.longitude.toFixed(6)}</span>
                  </p>
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 hover:border-indigo-300 text-sm font-medium text-zinc-700 transition-colors w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                      aria-label="View location on Google Maps"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View on Google Maps
                    </a>
                  )}
                </>
              ) : (
                <p className="text-sm text-zinc-400">Not set yet.</p>
              )}
            </div>

            {/* Map preview */}
            {saved.latitude && saved.longitude ? (
              <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${saved.longitude - 0.005},${saved.latitude - 0.005},${saved.longitude + 0.005},${saved.latitude + 0.005}&marker=${saved.latitude},${saved.longitude}`}
                  className="w-full h-48"
                  title="Location map preview"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 h-48 flex flex-col items-center justify-center gap-3">
                <MapPin className="w-8 h-8 text-zinc-200" />
                <p className="text-xs text-zinc-400">Location preview appears here after saving.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
