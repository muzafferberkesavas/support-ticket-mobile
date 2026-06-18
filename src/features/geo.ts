import * as Location from 'expo-location';

// Konum, backend ticket modelinde ayrı bir alan olmadığından yapısal bir etikete gömülür:
//   geo:<lat5>,<lng5>   (ör. geo:41.00824,28.97836 → ≤30 karakter, etiket sınırına uyar)
// Böylece "yakındakiler" filtresi etiketten koordinatı çözüp mesafe hesaplayabilir.

export interface Geo {
  lat: number;
  lng: number;
  label: string;
}

export const GEO_PREFIX = 'geo:';

export function geoTag(lat: number, lng: number): string {
  return `${GEO_PREFIX}${lat.toFixed(5)},${lng.toFixed(5)}`;
}

export function parseGeo(tags?: string[] | null): { lat: number; lng: number } | null {
  const t = tags?.find((x) => x.startsWith(GEO_PREFIX));
  if (!t) return null;
  const [lat, lng] = t.slice(GEO_PREFIX.length).split(',').map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

// İki nokta arası yaklaşık mesafe (km) — Haversine.
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

// İzin ister, mevcut konumu alır ve okunabilir bir adrese çevirir (ters jeokodlama).
export async function captureLocation(): Promise<Geo> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Konum izni verilmedi.');
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude, longitude } = pos.coords;
  let label = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  try {
    const [g] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (g) {
      const parts = [g.name, g.district ?? g.subregion, g.city ?? g.region].filter(Boolean);
      if (parts.length) label = [...new Set(parts)].join(', ');
    }
  } catch {
    // ters jeokodlama başarısız olursa koordinat etiketiyle devam et
  }
  return { lat: latitude, lng: longitude, label };
}
