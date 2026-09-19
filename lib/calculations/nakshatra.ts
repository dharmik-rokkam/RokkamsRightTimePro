import type { NakshatraResult } from '@/types/panchang';

export const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira',
  'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha',
  'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati',
  'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

const NAKSHATRA_ARC = 360 / 27;

// Requires sidereal Moon longitude
export function calculateNakshatra(siderealMoonLng: number): NakshatraResult {
  const index = Math.floor(siderealMoonLng / NAKSHATRA_ARC);
  const posInNak = siderealMoonLng % NAKSHATRA_ARC;
  const pada = Math.floor(posInNak / (NAKSHATRA_ARC / 4)) + 1;
  const completion = posInNak / NAKSHATRA_ARC;

  return { index, pada, completion, name: NAKSHATRA_NAMES[index] };
}

export function suryaNakshatra(siderealSunLng: number): { name: string; index: number; pada: number } {
  const index = Math.floor(siderealSunLng / NAKSHATRA_ARC);
  const posInNak = siderealSunLng % NAKSHATRA_ARC;
  const pada = Math.floor(posInNak / (NAKSHATRA_ARC / 4)) + 1;
  return { name: NAKSHATRA_NAMES[index], index, pada };
}
