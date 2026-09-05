import { getSupabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userLat = parseFloat(searchParams.get("lat") ?? "");
  const userLng = parseFloat(searchParams.get("lng") ?? "");
  const radiusKm = parseFloat(searchParams.get("radius") ?? "50");

  const supabase = getSupabase();

  const { data: shops, error } = await supabase
    .from("shops")
    .select("id, name, location, latitude, longitude, contact_phone, status, virtual_mode")
    .eq("status", "active")
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (error) {
    return Response.json({ error: "Failed to load shops" }, { status: 500 });
  }

  const hasUserLocation = !isNaN(userLat) && !isNaN(userLng);

  let results = (shops ?? []).map((shop) => {
    const distance =
      hasUserLocation && shop.latitude != null && shop.longitude != null
        ? haversineKm(userLat, userLng, shop.latitude, shop.longitude)
        : null;
    return { ...shop, distance_km: distance };
  });

  if (hasUserLocation) {
    results = results
      .filter((s) => s.distance_km === null || s.distance_km <= radiusKm)
      .sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity));
  }

  return Response.json({ shops: results });
}
