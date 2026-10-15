"use client";
import React from "react";

// Place search and reverse geocoding through OpenStreetMap Nominatim: free,
// no key, same data the map tiles come from. Its usage policy allows about
// one request a second, so the hook debounces and cancels stale requests.

export type Place = {
  label: string;     // short name shown on the project, e.g. "Prospect Park, Brooklyn"
  detail: string;    // the rest of the address, for telling similar results apart
  lat: number;
  lng: number;
};

const BASE = "https://nominatim.openstreetmap.org";

function toPlace(r: any): Place {
  const a = r.address ?? {};
  const street = [a.house_number, a.road].filter(Boolean).join(" ");
  const head = r.name || street || String(r.display_name ?? "").split(",")[0];
  const town = a.borough || a.city || a.town || a.village || a.suburb || a.county;
  const region = a.state || a.country;
  const label = [head, town !== head ? town : null].filter(Boolean).join(", ");
  const detail = [street !== head ? street : null, town, a.postcode, region, a.country !== region ? a.country : null]
    .filter(Boolean).join(", ");
  return { label: label || r.display_name, detail, lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const res = await fetch(
    `${BASE}/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(query)}`,
    { headers: { "Accept-Language": "en" }, signal },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map(toPlace).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

export async function reversePlace(lat: number, lng: number): Promise<Place | null> {
  try {
    const res = await fetch(
      `${BASE}/reverse?format=jsonv2&addressdetails=1&zoom=17&lat=${lat}&lon=${lng}`,
      { headers: { "Accept-Language": "en" } },
    );
    if (!res.ok) return null;
    const r = await res.json();
    if (!r || r.error) return null;
    // Keep the exact coordinates the device gave, not the matched building's.
    return { ...toPlace(r), lat, lng };
  } catch { return null; }
}

// Suggestions for what's typed, 400ms after typing stops. Pass enabled=false
// once a place is picked so its label doesn't trigger another search.
export function usePlaceSuggestions(query: string, enabled = true) {
  const [places, setPlaces] = React.useState<Place[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const q = query.trim();
    if (!enabled || q.length < 3) { setPlaces([]); setLoading(false); return; }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      searchPlaces(q, ctrl.signal)
        .then(p => { if (!ctrl.signal.aborted) setPlaces(p); })
        .catch(() => { if (!ctrl.signal.aborted) setPlaces([]); })
        .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    }, 400);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query, enabled]);

  return { places, loading };
}
