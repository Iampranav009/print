"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Store,
  MapPin,
  Save,
  Locate,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Navigation,
} from "lucide-react";

type ShopData = {
  id: string;
  name: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  virtual_mode: boolean;
};

function Toast({
  message,
  type,
  onDismiss,
}: {
  message: string;
  type: "success" | "error";
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium transition-all ${
        type === "success"
          ? "bg-emerald-600 text-white"
          : "bg-red-600 text-white"
      }`}
      role="alert"
      aria-live="polite"
    >
      {type === "success" ? (
        <CheckCircle className="w-4 h-4 shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 shrink-0" />
      )}
      {message}
    </div>
  );
}

function ShopContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get("tab") === "location" ? "location" : "general";

  const [activeTab, setActiveTab] = useState<"general" | "location">(initialTab);
  const [shop, setShop] = useState<ShopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Shop details form
  const [name, setName] = useState("");
  const [locationDesc, setLocationDesc] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Location form
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/vendor/me");
        if (res.ok) {
          const data = await res.json();
          if (data.shop) {
            setShop(data.shop);
            setName(data.shop.name ?? "");
            setLocationDesc(data.shop.location ?? "");
            setContactEmail(data.shop.contact_email ?? "");
            setContactPhone(data.shop.contact_phone ?? "");
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

  // Save Shop General Info
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/vendor/shop", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          location: locationDesc.trim() || null,
          contact_email: contactEmail.trim() || null,
          contact_phone: contactPhone.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save");
      }
      const updated = await res.json();
      if (updated.shop) {
        setShop((prev) => ({ ...prev, ...updated.shop }));
      }
      setToast({ message: "Shop details saved successfully.", type: "success" });
    } catch (err: unknown) {
      setToast({
        message: err instanceof Error ? err.message : "Failed to save",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // GPS / Geolocation
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
        setToast({ message: "Coordinates detected from GPS.", type: "success" });
      },
      (err) => {
        setGeoError(err.message);
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Save Location Coordinates
  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (isNaN(latitude) || isNaN(longitude)) {
      setToast({ message: "Please enter valid numeric latitude and longitude.", type: "error" });
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
          location: locationDesc.trim() || null,
          google_place_id: placeId.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save");
      }
      const updated = await res.json();
      if (updated.shop) {
        setShop((prev) => ({ ...prev, ...updated.shop }));
      }
      setToast({ message: "Printer live location saved successfully.", type: "success" });
    } catch (err: unknown) {
      setToast({
        message: err instanceof Error ? err.message : "Failed to save location",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-4xl">
        <div className="h-12 w-64 bg-zinc-200 rounded-2xl mb-4" />
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 h-96" />
      </div>
    );
  }

  const savedLat = shop?.latitude;
  const savedLng = shop?.longitude;
  const hasSavedLocation = typeof savedLat === "number" && typeof savedLng === "number";

  // Google Maps live link based on either saved coords or current input coords
  const activeLat = parseFloat(lat);
  const activeLng = parseFloat(lng);
  const validActiveCoords = !isNaN(activeLat) && !isNaN(activeLng);

  const googleMapsUrl = validActiveCoords
    ? `https://www.google.com/maps?q=${activeLat},${activeLng}`
    : hasSavedLocation
      ? `https://www.google.com/maps?q=${savedLat},${savedLng}`
      : null;

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      <div className="space-y-6 max-w-4xl">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "general"
                ? "bg-white text-zinc-900 shadow-sm border border-zinc-200"
                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
          >
            <Store className="w-4 h-4 text-zinc-600" />
            <span>Shop Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("location")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "location"
                ? "bg-white text-zinc-900 shadow-sm border border-zinc-200"
                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
          >
            <MapPin className="w-4 h-4 text-indigo-600" />
            <span>Printer Location</span>
            {hasSavedLocation ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Location set" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400" title="Location pending" />
            )}
          </button>
        </div>

        {/* ── TAB 1: General Shop Information ── */}
        {activeTab === "general" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">Shop information</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Basic identification and contact details for your partner store.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveGeneral} className="space-y-5">
                <div>
                  <label htmlFor="shop-name" className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Shop name <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="shop-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Campus Copy Centre"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-shadow"
                    aria-required="true"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="shop-location" className="block text-sm font-medium text-zinc-700">
                      Where the printer is situated (Landmark / Description)
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveTab("location")}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                    >
                      <Navigation className="w-3 h-3" />
                      Configure GPS Pin &rarr;
                    </button>
                  </div>
                  <input
                    id="shop-location"
                    type="text"
                    value={locationDesc}
                    onChange={(e) => setLocationDesc(e.target.value)}
                    placeholder="e.g. Counter 2, Ground Floor next to Campus Canteen"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-shadow"
                  />
                  <p className="mt-1 text-xs text-zinc-400">
                    Displayed to customers in the mobile app when choosing this printer node.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-email" className="block text-sm font-medium text-zinc-700 mb-1.5">
                      Contact email
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="shop@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-shadow"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-phone" className="block text-sm font-medium text-zinc-700 mb-1.5">
                      Contact phone
                    </label>
                    <input
                      id="contact-phone"
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-shadow"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving || !name.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                    aria-label="Save shop details"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            </div>

            {/* Danger zone */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 opacity-60">
              <h2 className="text-base font-semibold text-zinc-400 mb-2">Danger zone</h2>
              <p className="text-sm text-zinc-400">
                Contact PrintBuddy partner support to suspend or reassign your printer shop node.
              </p>
            </div>
          </div>
        )}

        {/* ── TAB 2: Printer Location & Coordinates ── */}
        {activeTab === "location" && (
          <div className="space-y-6">
            {/* Warning banner */}
            <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
              <AlertTriangle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-sm text-indigo-950">
                <p className="font-semibold">Printer Live Geolocation</p>
                <p className="text-xs text-indigo-800 mt-0.5">
                  Customers rely on exact GPS coordinates to locate your printer node on the nearby map and calculate walking distance.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Form (7 cols) */}
              <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">Set Printer Coordinates</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Click &ldquo;Use live device GPS&rdquo; or enter latitude &amp; longitude directly.
                  </p>
                </div>

                <form onSubmit={handleSaveLocation} className="space-y-5">
                  {/* GPS Button */}
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    disabled={geoLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                    aria-label="Detect live GPS coordinates"
                  >
                    <Locate className={`w-4 h-4 ${geoLoading ? "animate-spin" : ""}`} />
                    {geoLoading ? "Acquiring high-accuracy GPS coordinates…" : "Detect live device GPS"}
                  </button>

                  {geoError && (
                    <p className="text-xs text-red-600 bg-red-50 rounded-xl p-3 border border-red-100" role="alert">
                      {geoError}
                    </p>
                  )}

                  {/* Coordinates Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="lat" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                        Latitude <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="lat"
                        type="number"
                        step="0.000001"
                        min="-90"
                        max="90"
                        required
                        value={lat}
                        onChange={(e) => setLat(e.target.value)}
                        placeholder="19.076090"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label htmlFor="lng" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                        Longitude <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="lng"
                        type="number"
                        step="0.000001"
                        min="-180"
                        max="180"
                        required
                        value={lng}
                        onChange={(e) => setLng(e.target.value)}
                        placeholder="72.877426"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 font-mono text-xs"
                      />
                    </div>
                  </div>

                  {/* Where printer is situated */}
                  <div>
                    <label htmlFor="printer-placement" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      Where the printer is situated (Indoor placement / Landmark)
                    </label>
                    <input
                      id="printer-placement"
                      type="text"
                      value={locationDesc}
                      onChange={(e) => setLocationDesc(e.target.value)}
                      placeholder="e.g. Ground Floor, Xerox Counter 1 near entrance"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                    />
                    <p className="mt-1 text-[11px] text-zinc-400">
                      Helps customers locate the physical paper tray when picking up prints.
                    </p>
                  </div>

                  {/* Optional Google Place ID */}
                  <div>
                    <label htmlFor="place-id" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      Google Place ID <span className="text-zinc-400 font-normal">(optional)</span>
                    </label>
                    <input
                      id="place-id"
                      type="text"
                      value={placeId}
                      onChange={(e) => setPlaceId(e.target.value)}
                      placeholder="ChIJ..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 font-mono text-xs"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={saving || !lat || !lng}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                      aria-label="Save printer location"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? "Saving location…" : "Save printer location"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Live Coordinates Readout & Google Maps Live Link (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Coordinates & Google Map Link Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-900">Live Location Link</h3>
                    {hasSavedLocation ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live &amp; Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        Pending Pin
                      </span>
                    )}
                  </div>

                  {validActiveCoords || hasSavedLocation ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
                        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                          Current Coordinates
                        </p>
                        <p className="font-mono text-xs font-bold text-zinc-900">
                          {validActiveCoords
                            ? `${activeLat.toFixed(6)}, ${activeLng.toFixed(6)}`
                            : `${savedLat?.toFixed(6)}, ${savedLng?.toFixed(6)}`}
                        </p>
                      </div>

                      {/* Google Map Live Link Button */}
                      {googleMapsUrl && (
                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                          <ExternalLink className="w-4 h-4 text-emerald-600" />
                          <span>Open Live in Google Maps</span>
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Coordinates have not been saved yet. Use the GPS button or enter coordinates to activate the live Google Maps link.
                    </p>
                  )}
                </div>

                {/* Map Preview Container */}
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
                  {validActiveCoords ? (
                    <iframe
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${activeLng - 0.005},${activeLat - 0.005},${activeLng + 0.005},${activeLat + 0.005}&marker=${activeLat},${activeLng}`}
                      className="w-full h-52 border-0"
                      title="Printer location map preview"
                      loading="lazy"
                    />
                  ) : hasSavedLocation && typeof savedLat === "number" && typeof savedLng === "number" ? (
                    <iframe
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${savedLng - 0.005},${savedLat - 0.005},${savedLng + 0.005},${savedLat + 0.005}&marker=${savedLat},${savedLng}`}
                      className="w-full h-52 border-0"
                      title="Printer location map preview"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-52 flex flex-col items-center justify-center gap-2 text-zinc-300 p-6 text-center">
                      <MapPin className="w-8 h-8 text-zinc-300" />
                      <p className="text-xs text-zinc-400">Map preview will appear once coordinates are set.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 animate-pulse max-w-4xl">
          <div className="h-12 w-64 bg-zinc-200 rounded-2xl mb-4" />
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 h-96" />
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  );
}
