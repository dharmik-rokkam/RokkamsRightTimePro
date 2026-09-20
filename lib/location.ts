import type { Location } from '@/types/panchang';
import { isValidTimezone } from './timezone';

export const MUSCAT: Location = {
  lat: 23.5880,
  lng: 58.3829,
  name: 'Muscat, Oman',
  timezone: 'Asia/Muscat',
  elevation: 8,
  geonameId: 287286,
  city: 'Muscat',
};

export const DEFAULT_LOCATION = MUSCAT;

const STORAGE_KEY = 'panchang-location';

/**
 * Validate an untrusted value (request body or localStorage) into a Location.
 * Returns null unless every field needed for the calculations is sane.
 */
export function sanitizeLocation(input: unknown): Location | null {
  if (!input || typeof input !== 'object') return null;
  const o = input as Record<string, unknown>;
  const lat = Number(o.lat);
  const lng = Number(o.lng);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return null;
  if (!isValidTimezone(o.timezone)) return null;
  if (typeof o.name !== 'string' || !o.name.trim() || o.name.length > 200) return null;

  const loc: Location = { lat, lng, name: o.name.trim(), timezone: o.timezone };
  const elevation = Number(o.elevation);
  if (o.elevation != null && Number.isFinite(elevation)) loc.elevation = elevation;
  const geonameId = Number(o.geonameId);
  if (o.geonameId != null && Number.isInteger(geonameId) && geonameId > 0) loc.geonameId = geonameId;
  if (typeof o.city === 'string' && o.city.length <= 100) loc.city = o.city;
  return loc;
}

export function loadLocation(): Location {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const loc = sanitizeLocation(JSON.parse(raw));
      if (loc) return loc;
    }
  } catch { /* storage unavailable or corrupt → default */ }
  return DEFAULT_LOCATION;
}

export function saveLocation(loc: Location): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  } catch { /* ignore */ }
}
