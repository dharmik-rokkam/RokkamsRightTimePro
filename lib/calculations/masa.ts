export const MASA_NAMES = [
  'Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha',
  'Shravana', 'Bhadrapada', 'Ashwin', 'Kartika',
  'Margashirsha', 'Pausha', 'Magha', 'Phalguna',
];

export function calculateMasaName(siderealSunLng: number): string {
  const sunSign = Math.floor(siderealSunLng / 30);
  const masaIndex = sunSign % 12;
  return MASA_NAMES[masaIndex];
}

export const RASHI_NAMES = [
  'Mesha (Aries)', 'Vrishabha (Taurus)', 'Mithuna (Gemini)',
  'Karka (Cancer)', 'Simha (Leo)', 'Kanya (Virgo)',
  'Tula (Libra)', 'Vrishchika (Scorpio)', 'Dhanu (Sagittarius)',
  'Makara (Capricorn)', 'Kumbha (Aquarius)', 'Meena (Pisces)',
];

export function getMoonSign(siderealMoonLng: number): { name: string; index: number } {
  const index = Math.floor(siderealMoonLng / 30);
  return { index, name: RASHI_NAMES[index] };
}
